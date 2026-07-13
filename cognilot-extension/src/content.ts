/**
 * CONTENT.TS - Cognilot Extension Main Content Script
 * Modular Architecture: Suggestions (Phase 1) & Actions (Phase 2)
 */

// ─── Project Imports (Bundled by Vite) ──────────────────────
import { registerGlobals as registerConfigGlobals } from './config';
import { registerGlobals as registerConstantsGlobals } from './constants';
import { Logger, registerGlobals as registerLoggerGlobals } from './utils/logger';
import '@cognilot/sdk';
import { initHostAdapters, HostAdapters } from './host_adapters';
// @ts-ignore
import './utils/turndown.js';
import * as Common from './utils/common';
import { Toast } from './utils/toast';
import * as PreviewPublisher from './utils/preview_publisher';
import { isEligibleForTrigger, isEligibleForLearning } from './lib/eligibility_lib';
import { extractMarkdown, extractVisual } from './lib/extractor_lib';
import * as InspectorLib from './lib/inspector_lib';
import { DetectionPayload } from './lib/detection_payload';
import * as GhostUI from './ui/autocomplete/ghost_ui';
import * as HintUI from './ui/autocomplete/hint_ui';
import * as HelpUI from './ui/autocomplete/help_ui';
import { CursorUI } from './ui/autocomplete/cursor_ui';
import { BackdropUI } from './ui/inspector/backdrop_ui';
import { ToolbarUI } from './ui/inspector/toolbar_ui';
import { PainterUI } from './ui/inspector/painter_ui';
import { InspectorUI, processDetection } from './ui/inspector/main_ui';
import { AutocompleteService } from './services/autocomplete_service';
import { RefinementService } from './services/refinement_service';
import { ActionService, solveAll } from './services/action_service';
import { AutocompleteController } from './controllers/autocomplete_controller';
import {
  InspectorController,
  enable as enableInspector,
  disable as disableInspector,
} from './controllers/inspector_controller';
import { Modules, init as initModules } from './index';

(function (): void {
  'use strict';

  // ─── Register globals for backward compatibility with SDK-local ──
  registerConfigGlobals();
  registerConstantsGlobals();
  registerLoggerGlobals();
  initHostAdapters();

  // Expose non-migrated globals
  window.Cognilot = window.Cognilot || ({} as Window['Cognilot']);
  const as = window.Cognilot as Record<string, unknown>;

  // Wire up the modules that the SDK / content script expects on window.Cognilot
  as.Logger = Logger;
  as.Common = Common;
  as.Toast = Toast;
  as.PreviewPublisher = PreviewPublisher;

  // Autocomplete sub-namespace
  as.Autocomplete = as.Autocomplete || ({} as Record<string, unknown>);
  const ac = as.Autocomplete as Record<string, unknown>;
  ac.EligibilityLib = { isEligibleForTrigger, isEligibleForLearning };
  ac.GhostUI = GhostUI;
  ac.HintUI = HintUI;
  ac.HelpUI = HelpUI;
  ac.CursorUI = CursorUI;
  ac.AutocompleteService = AutocompleteService;
  ac.RefinementService = RefinementService;
  ac.Controller = AutocompleteController;
  // Legacy Manager alias
  ac.Manager = {
    init: () => initModules(),
    handleTriggerEvent: (el: HTMLElement) => AutocompleteController.handleAutocomplete(el),
    dispose: () => Modules.dispose(),
  };

  // Inspector sub-namespace
  as.Inspector = as.Inspector || ({} as Record<string, unknown>);
  const insp = as.Inspector as Record<string, unknown>;
  insp.Lib = InspectorLib;
  insp.UI = InspectorUI;
  insp.Controller = InspectorController;

  // Action sub-namespace
  as.Action = as.Action || ({} as Record<string, unknown>);
  (as.Action as Record<string, unknown>).Service = ActionService;

  // Detection payload constructor
  as.DetectionPayload = DetectionPayload;
  as.Modules = Modules;

  // ─── Guard: already initialized ──
  if ((window as unknown as Record<string, unknown>).aidenOverlayActive) return;
  (window as unknown as Record<string, unknown>).aidenOverlayActive = true;

  // ─── Global Settings ──
  window.Cognilot.Settings = {} as Window['Cognilot']['Settings'];
  chrome.storage.sync.get(['Cognilot_settings'], (result: Record<string, unknown>) => {
    window.Cognilot.Settings = (result.Cognilot_settings as Window['Cognilot']['Settings']) || {};
  });

  Logger.info('🚀 Cognilot Modules Initializing...');

  // Default state
  (as._authenticated as boolean) = false;
  (as._isPro as boolean) = false;

  // ─── Load User Context ──
  chrome.storage.local.get(
    ['Cognilot_auth_token', 'Cognilot_user'],
    (result: Record<string, unknown>) => {
      if (result.Cognilot_auth_token) {
        (as._authenticated as boolean) = true;
        const user = result.Cognilot_user as Record<string, unknown> | undefined;
        const plan = ((user?.plan as string) || 'free').toLowerCase();
        (as._isPro as boolean) = plan === 'pro';
        Logger.info(`🔐 Authenticated - Plan: ${plan.toUpperCase()}`);
      } else {
        Logger.info('⚠️ Not authenticated - Defaulting to FREE plan');
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrapModules);
      } else {
        bootstrapModules();
      }
    }
  );

  function runDetectionSmokeCheck(): {
    ok: boolean;
    checks: Record<string, boolean>;
    missing: string[];
    timestamp: string;
  } {
    const sdk = window.Cognilot?.SDK;

    const checks: Record<string, boolean> = {
      sdkLoaded: !!sdk,
      detectionReady: !!(sdk?.detection && typeof sdk.detection.detect === 'function'),
      actionReady: !!(sdk?.action && typeof sdk.action.executeBatch === 'function'),
      aliasReady: !!sdk?.alias,
      profileReady: !!sdk?.profile,
    };

    const missing = Object.keys(checks).filter((k) => !checks[k]);
    const ok = missing.length === 0;

    if (ok) {
      Logger.info('✅ SDK Detection smoke check: core modules ready');
    } else {
      Logger.warn('⚠️ SDK Detection smoke check: missing capabilities', missing);
    }

    return { ok, checks, missing, timestamp: new Date().toISOString() };
  }

  function bootstrapModules(): void {
    // 0. Register SDK Adapters
    if (window.Cognilot.SDK && window.Cognilot.SDK.Core && window.Cognilot.SDK.Core.Registry) {
      window.Cognilot.SDK.Core.Registry.registerAdapters({
        storage: new HostAdapters.Storage(),
        messaging: new HostAdapters.Messaging(),
        dom: new HostAdapters.DOM(),
        settings: new HostAdapters.Settings(),
        auth: new HostAdapters.Auth(),
        pageContext: new HostAdapters.PageContext(),
        cache: HostAdapters.SuggestionsCache,
        cache_decisions: HostAdapters.DecisionsCache,
      });
      Logger.info('🔌 SDK Adapters registered successfully.');
    }

    // 1. Initialize all modules
    initModules();

    // 2. Smoke check — Universal Scan is triggered by registerAdapters() above
    runDetectionSmokeCheck();
    // NOTE: Discovery Mode (initDiscoveryMode) is deprecated in favor of the
    // Registry-First architecture. Universal Scan (initUniversalScan) is the
    // sole detection path, triggered automatically via registerAdapters().
  }

  function initDiscoveryMode(): void {
    if (window.location.href === 'about:blank') return;

    let detectionRan = false;
    let isDetecting = false;

    const getOrDetect = (): DetectionPayload | null => {
      const sdkCache = window.Cognilot.SDK?.facade?.getCache();
      if (sdkCache) return sdkCache.result as unknown as DetectionPayload;
      if (!(window as unknown as { CognilotAPI?: CognilotAPI }).CognilotAPI?.detect || isDetecting)
        return null;

      isDetecting = true;
      const result = (window as unknown as { CognilotAPI: CognilotAPI }).CognilotAPI.detect(
        null,
        true
      );
      detectionRan = true;
      isDetecting = false;

      if (result && result.questions && result.questions.length > 0) {
        Logger.info(`🔍 Detection cached via SDK (${result.questions.length} fields).`);

        PreviewPublisher.publish(
          result as unknown as Record<string, unknown>,
          'auto_detection',
          'discovery'
        );
      }
      return result;
    };

    setTimeout(getOrDetect, 1500);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver((mutations) => {
      const sdkCache = window.Cognilot.SDK?.facade?.getCache();
      if (sdkCache) {
        observer.disconnect();
        return;
      }
      const hasRelevant = mutations.some((m) => m.addedNodes.length > 0);
      if (hasRelevant) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(getOrDetect, 1000);
      }
    });

    const root = document.querySelector('#app, main') || document.body;
    observer.observe(root, { childList: true, subtree: true });

    (as._discoveryCache as Record<string, unknown>) = {
      get: () => {
        const entry = window.Cognilot.SDK?.facade?.getCache();
        return entry ? entry.result : null;
      },
      hasRan: () => detectionRan,
      invalidate: () => {
        window.Cognilot.SDK?.facade?.invalidateCache();
        detectionRan = false;
      },
    };
  }

  // ─── PUBLIC API ─────────────────────────────────────────────

  interface CognilotAPI {
    solveAll(questions?: unknown[] | null): Promise<unknown> | { error: string };
    enableInspector(): void;
    disableInspector(): void;
    detect(scopeElement?: HTMLElement | null, silent?: boolean): DetectionPayload;
  }

  (window as unknown as { CognilotAPI: CognilotAPI }).CognilotAPI = {
    solveAll: (questions = null) => {
      return solveAll(questions as SDKQuestionDTO[] | null);
    },

    enableInspector: () => {
      enableInspector();
    },

    disableInspector: () => {
      disableInspector();
    },

    detect: (scopeElement = null, silent = false) => {
      const sdk = window.Cognilot.SDK;
      const facade = sdk?.facade;
      const source = scopeElement ? 'manual_scan' : 'auto_scan';

      if (!scopeElement) {
        const sdkCache = facade?.getCache();
        if (sdkCache) {
          if (!silent) Logger.info('♻️ Reusing SDK detection cache.');
          return new DetectionPayload(
            sdkCache.result as unknown as Record<string, unknown>,
            'auto_detection'
          );
        }
      }

      const rawResult =
        facade && typeof facade.detect === 'function'
          ? facade.detect(scopeElement, !(as._isPro as boolean), source)
          : { questions: [] };

      const result = new DetectionPayload(
        rawResult as unknown as Record<string, unknown>,
        scopeElement ? 'manual_selection' : 'auto_detection'
      );

      processDetection(result, silent);

      const focused = document.activeElement as HTMLElement;
      if (focused && ['INPUT', 'TEXTAREA'].includes(focused.tagName)) {
        const matchedField = facade?.matchField(focused);
        CursorUI.paint(focused, !!matchedField);
      }

      const count = result.count || 0;

      if (window === window.top || count > 0) {
        chrome.runtime.sendMessage({ action: 'updateBadge', count }).catch(() => {
          // silently ignore
        });
      }

      return result;
    },
  };

  // Also expose on window.CognilotAPI for backward compatibility
  (window as unknown as Record<string, unknown>).CognilotAPI = (
    window as unknown as { CognilotAPI: CognilotAPI }
  ).CognilotAPI;

  // ─── Extension Message Listener ─────────────────────────────
  chrome.runtime.onMessage.addListener(
    (
      request: Record<string, unknown>,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void
    ) => {
      const api = (window as unknown as { CognilotAPI: CognilotAPI }).CognilotAPI;

      if (request.action === 'sidebarDetectForms') {
        const cached = window.Cognilot.SDK?.facade?.getCache();
        if (cached) {
          Logger.info('♻️ [sidebarDetectForms] Serving from cache.');
          const payload = new DetectionPayload(
            cached.result as unknown as Record<string, unknown>,
            'auto_detection'
          );
          sendResponse({ success: true, detection: payload.serialize() });
          return true;
        }

        const payload = api.detect(null, false);
        sendResponse({ success: true, detection: payload.serialize() });
        return true;
      }

      if (request.action === 'sidebarGetRegistry') {
        const registry = window.Cognilot.SDK?.registry;
        const fields = registry ? registry.getAll() : [];

        if (fields.length > 0) {
          // Registry is populated — respond immediately
          sendResponse({ success: true, fields });
          return true;
        }

        // Registry is empty — Universal Scan may still be running.
        // Fall back to the storage.session snapshot persisted by PageScanner (M2).
        try {
          const chromeApi = (globalThis as any).chrome || (window as any).chrome;
          if (chromeApi?.storage?.session) {
            chromeApi.storage.session.get(['Cognilot_registry_snapshot'], (result: any) => {
              const snapshot = result?.Cognilot_registry_snapshot;
              const snapshotUrl = snapshot?.url || '';
              const currentUrl = window.location.href;

              // Only use snapshot if it matches the current URL (avoid stale data)
              const urlBase = (u: string) => u.split('#')[0].split('?')[0].replace(/\/$/, '');
              const isMatch = urlBase(snapshotUrl) === urlBase(currentUrl);
              const isRecent = snapshot && Date.now() - (snapshot.timestamp || 0) < 30000; // 30s max

              if (isMatch && isRecent && snapshot?.fields?.length > 0) {
                Logger.info(
                  `♻️ [sidebarGetRegistry] Using storage.session snapshot (${snapshot.fields.length} fields).`
                );
                sendResponse({ success: true, fields: snapshot.fields, fromSnapshot: true });
              } else {
                sendResponse({ success: true, fields: [] });
              }
            });
            return true; // async response
          }
        } catch (e) {
          // storage.session not available
        }

        sendResponse({ success: true, fields: [] });
        return true;
      }

      if (request.action === 'sidebarSolveAll') {
        const data = request.data as Record<string, unknown> | undefined;
        api.solveAll(data?.questions as unknown[] | undefined);
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'sidebarEnableInspector') {
        const activeFormId = request.data?.activeFormId;
        api.enableInspector(activeFormId);
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'sidebarDisableInspector') {
        api.disableInspector();
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'sidebarTriggerRescan') {
        const sdk = window.Cognilot.SDK;
        if (sdk) {
          // M3: Full registry + cache reset before re-scan so stale data is gone
          if (sdk.registry) {
            sdk.registry.clear();
            Logger.info('[sidebarTriggerRescan] FieldRegistry cleared.');
          }
          if (sdk.facade) {
            sdk.facade.invalidateCache();
            Logger.info('[sidebarTriggerRescan] Detection cache invalidated.');
          }
          // Also invalidate the legacy discovery cache
          const discoveryCache = as._discoveryCache as any;
          if (discoveryCache?.invalidate) discoveryCache.invalidate();

          // Clear storage.session snapshot so sidebar doesn't serve stale data
          try {
            const chromeApi = (globalThis as any).chrome || (window as any).chrome;
            if (chromeApi?.storage?.session) {
              chromeApi.storage.session.remove(['Cognilot_registry_snapshot']);
            }
          } catch (_e) {
            /* ignore */
          }

          if (sdk.initUniversalScan) {
            sdk.initUniversalScan().catch((err: any) => {
              Logger.warn('[sidebarTriggerRescan] Universal scan failed:', err);
            });
            // pageScanComplete event will fire on completion — sidebar listens for it
          }
        }
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'resetDiscovery') {
        // Legacy action — also clears FieldRegistry and storage.session snapshot (M3)
        (as._discoveryCache as Record<string, () => void>)?.invalidate();
        if (window.Cognilot.SDK?.facade) window.Cognilot.SDK.facade.invalidateCache();
        if (window.Cognilot.SDK?.registry) window.Cognilot.SDK.registry.clear();
        try {
          const chromeApi = (globalThis as any).chrome || (window as any).chrome;
          if (chromeApi?.storage?.session) {
            chromeApi.storage.session.remove(['Cognilot_registry_snapshot']);
          }
        } catch (_e) {
          /* ignore */
        }
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'redetectOnScope') {
        const SESSION_KEY = 'Cognilot_inspector_manual_selector';
        const data = request.data as Record<string, unknown> | undefined;
        let selector = data?.selector as string | null;

        if (!selector) {
          try {
            selector = sessionStorage.getItem(SESSION_KEY) || null;
          } catch (_e) {
            // silently ignore
          }
        }

        let container: HTMLElement | null = null;
        if (selector) {
          try {
            container = document.querySelector(selector);
          } catch (_e) {
            // silently ignore
          }
        }

        (as._discoveryCache as Record<string, () => void>)?.invalidate();
        if (window.Cognilot.SDK?.facade) window.Cognilot.SDK.facade.invalidateCache();

        const result = api.detect(container, true);
        const serialized =
          result && typeof result.serialize === 'function' ? result.serialize() : result;

        sendResponse({
          success: true,
          detection: serialized,
          pageTitle: document.title,
        });
        return true;
      }

      if (request.action === 'request_auth_sync') {
        window.postMessage({ type: 'Cognilot_REQUEST_SYNC' }, '*');
        sendResponse({ success: true });
        return true;
      }

      return false;
    }
  );

  // ─── Auth/Sync from Web App ─────────────────────────────────
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data as Record<string, unknown>;

    if (data.type === 'Cognilot_AUTH') {
      chrome.runtime.sendMessage({
        action: 'syncAuth',
        ...(data.payload as Record<string, unknown>),
      });
    } else if (data.type === 'Cognilot_LOGOUT') {
      chrome.runtime.sendMessage({ action: 'clearAuth' });
    } else if (data.type === 'Cognilot_SAVE_PROFILE') {
      chrome.runtime.sendMessage({
        action: 'saveProfile',
        profile: data.payload,
      });
    } else if (data.type === 'Cognilot_GET_PROFILE') {
      chrome.runtime.sendMessage({ action: 'getProfile' }, (response: any) => {
        if (response && response.success) {
          window.postMessage(
            {
              type: 'Cognilot_PROFILE_RESPONSE',
              payload: response.profile,
            },
            '*'
          );
        }
      });
    } else if (data.type === 'Cognilot_SAVE_PREFERENCES') {
      chrome.runtime.sendMessage({
        action: 'savePreferences',
        preferences: data.payload,
      });
    } else if (data.type === 'Cognilot_GET_PREFERENCES') {
      chrome.runtime.sendMessage({ action: 'getPreferences' }, (response: any) => {
        if (response) {
          window.postMessage(
            {
              type: 'Cognilot_PREFERENCES_RESPONSE',
              payload: response.preferences,
            },
            '*'
          );
        }
      });
    } else if (data.type === 'Cognilot_REFRESH_PROFILE') {
      Logger.info('Received Cognilot_REFRESH_PROFILE sync request from web app.');
    }
  });

  // ─── Sync From Extension to Web App ─────────────────────────
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      const updatedKeys = Object.keys(changes);

      // Handle cache updates (existing logic)
      if (
        updatedKeys.includes('Cognilot_profile_cache') ||
        updatedKeys.includes('Cognilot_alias_cache')
      ) {
        window.postMessage(
          {
            type: 'Cognilot_CACHE_UPDATED',
            keys: updatedKeys,
          },
          '*'
        );
      }

      // Handle Remote Logout Sync (Extension -> Web App)
      // Disabling this for Option B: Unlink only, keeping Web App session intact.
      /*
      if (updatedKeys.includes("Cognilot_auth_token")) {
        const tokenChange = changes["Cognilot_auth_token"];
        if (!tokenChange.newValue) {
          Logger.info("🔐 Auth token removed from extension. Triggering remote logout in web app...");
          window.postMessage({
            type: "Cognilot_REMOTE_LOGOUT"
          }, "*");
        }
      }
      */
    }
  });

  // ─── Listen to batch prefetch completion from ActionEngine ──
  window.addEventListener('cognilot-prefetch-complete', (e: Event) => {
    const customEvent = e as CustomEvent;
    chrome.runtime
      .sendMessage({
        action: 'batchPrefetchCompleted',
        data: {
          formScopeId: customEvent.detail?.formScopeId,
        },
      })
      .catch(() => {});
  });
})();
