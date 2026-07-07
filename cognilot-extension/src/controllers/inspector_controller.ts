/**
 * CONTROLLERS/INSPECTOR_CONTROLLER.TS
 * Orchestrator and event manager for the Inspector.
 *
 * CONDITIONAL FLOW:
 *  - If auto-scan detected a form → show overlay + spotlight on activation.
 *  - If auto-scan did NOT detect → activate "Manual Selection" directly.
 *
 * MANUAL PRIORITY:
 *  - Manual selection persists in sessionStorage.
 *  - On re-open, if there's a previous manual selection, it is restored automatically.
 */

import { Logger } from '../utils/logger';
import * as PreviewPublisher from '../utils/preview_publisher';
import * as InspectorLib from '../lib/inspector_lib';
import * as ExtractorLib from '../lib/extractor_lib';
import {
  InspectorUI,
  setSelectedContainer as uiSetSelectedContainer,
  setCursor,
  setManualSelectMode,
  updateActionButtons,
  highlight,
  removeHighlight,
  processDetection,
  clear as uiClear,
  showToolbar,
  showToast,
  type ToolbarHandlers,
} from '../ui/inspector/main_ui';
import { DetectionPayload } from '../lib/detection_payload';

const SESSION_KEY = 'Cognilot_inspector_manual_selector';

let _active = false;
let _currentMode = 'form_scope';
let _selectedContainer: HTMLElement | null = null;
let _lastManualSelectionSelector: string | null = null;
let _detectedFieldCount = 0;
let _isManualSelecting = false;
let _activeSource: 'auto_scan' | 'manual_scan' | null = null;
const currentDetection: any = null;

// Bound event handlers
let _boundHandleMouseOver: ((e: MouseEvent) => void) | null = null;
let _boundHandleMouseOut: ((e: MouseEvent) => void) | null = null;
let _boundHandleClick: ((e: MouseEvent) => void) | null = null;
let _boundHandleEsc: ((e: KeyboardEvent) => void) | null = null;
let _boundPrevent: ((e: MouseEvent) => void) | null = null;

// ─── SESSION STORAGE ──────────────────────────────────────────

function saveManualSelector(selector: string | null): void {
  _lastManualSelectionSelector = selector;
  try {
    if (selector) {
      sessionStorage.setItem(SESSION_KEY, selector);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch (_e) {
    // silently ignore
  }
}

function loadManualSelector(): string | null {
  if (_lastManualSelectionSelector) return _lastManualSelectionSelector;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      _lastManualSelectionSelector = stored;
      return stored;
    }
  } catch (_e) {
    // silently ignore
  }
  return null;
}

// ─── INTERNAL HELPERS ─────────────────────────────────────────

function publishScopedPreview(
  container: HTMLElement | null,
  source = 'manual_selection',
  existingDetection: DetectionPayload | SDKDetectionResult | null = null
): void {
  if (!container) return;

  const detection =
    existingDetection ||
    (window.CognilotAPI?.detect
      ? window.CognilotAPI.detect(container, false)
      : ({ questions: [], count: 0 } as any));

  processDetection(detection, false, false, true);

  _detectedFieldCount = (detection as any).count || (detection as any).questions?.length || 0;

  const handlers: ToolbarHandlers = {
    onManualSelectClick: () => handleManualSelectClick(),
    onSolveClick: () => handleSolveClick(),
    onCaptureClick: () => handleCaptureClick(),
    onMarkdownClick: () => handleMarkdownClick(),
  };

  updateActionButtons(_detectedFieldCount, handlers);

  const payload =
    typeof (detection as any).serialize === 'function' ? (detection as any).serialize() : detection;
  PreviewPublisher.publish(payload as Record<string, unknown>, source, 'inspect');
}

async function activateDefaultFormScopePreview(): Promise<void> {
  if (!_active || _currentMode !== 'form_scope') return;
  const ScopeResolver = window.Cognilot?.SDK?.Engines?.Detection?.FormScopeResolver;
  if (!ScopeResolver) return;

  let container: HTMLElement | null = null;
  const activeElement = document.activeElement as HTMLElement;

  if (
    activeElement &&
    activeElement !== document.body &&
    activeElement.matches?.('input, textarea, select')
  ) {
    const node = window.Cognilot.SDK.wrap(activeElement);
    if (node) {
      const result = ScopeResolver.resolveFormScopeByRadialExpansion(node, null);
      container = result?.formContainer?.getRawNode() ?? null;
    }
  }

  if (!container) {
    const resolver = ScopeResolver as unknown as Record<
      string,
      () => { formContainer: SDKNode } | null
    >;
    if (resolver._findBestFormContainerInPage) {
      const best = resolver._findBestFormContainerInPage();
      container = best?.formContainer?.getRawNode() ?? null;
    }
  }

  if (container) {
    _selectedContainer = container;
    uiSetSelectedContainer(container);

    const cachedResult = window.Cognilot._discoveryCache?.get() ?? null;
    const cachedSelector = cachedResult
      ? (cachedResult as any).formSelector || (cachedResult as any).form_selector
      : null;
    const isSameContainer =
      cachedSelector && document.querySelector(cachedSelector as string) === container;

    publishScopedPreview(container, 'manual_selection', isSameContainer ? cachedResult : null);
  } else {
    handleManualSelectClick();
  }
}

// ─── TOOLBAR BUTTON HANDLERS ─────────────────────────────────

function handleManualSelectClick(): void {
  _isManualSelecting = !_isManualSelecting;
  setCursor(_isManualSelecting);
  setManualSelectMode(_isManualSelecting);
}

function handleSolveClick(): void {
  if (!_detectedFieldCount) return;

  const sdk = window.Cognilot?.SDK;
  const facade = sdk?.DetectionFacade || sdk?.facade || sdk?.detection;

  const questions = _detectedFieldCount > 0 ? (currentDetection as any)?.questions || [] : [];
  const detection =
    (questions as unknown[]).length > 0
      ? { questions }
      : facade?.detect(
          (_selectedContainer ? (sdk?.wrap(_selectedContainer) ?? null) : null) as any
        );
  const finalQuestions = (detection as any)?.questions || [];
  const messaging = sdk?.adapters?.messaging as
    | { sendMessage(msg: Record<string, unknown>): Promise<void> }
    | undefined;

  console.log('[InspectorController] Sending solve request...', {
    count: (finalQuestions as unknown[]).length,
    hasMessaging: !!messaging,
  });

  if (_selectedContainer) {
    PreviewPublisher.publish(detection as Record<string, unknown>, 'manual_selection', 'inspect');
  }

  if (messaging) {
    messaging
      .sendMessage({
        action: 'inspectorSolveRequest',
        data: { questions },
      })
      .catch((e: any) => {
        console.error('[InspectorController] Failed to send message:', e);
      });
  } else {
    console.error('[InspectorController] Messaging adapter NOT found in SDK');
  }

  disable();
}

async function handleCaptureClick(): Promise<void> {
  if (!_selectedContainer) return;
  const engine = window.Cognilot.SDK.Engines.ExtractionEngine;
  if (!engine) return;

  const gateway = async (payload: { imageDataUrl: string }): Promise<void> => {
    const response = await fetch(payload.imageDataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToast('Imagen copiada');
  };
  await engine.handleCapture(_selectedContainer, ExtractorLib.extractVisual, gateway);
}

function handleMarkdownClick(): void {
  if (!_selectedContainer) return;
  const engine = window.Cognilot.SDK.Engines.ExtractionEngine;
  if (!engine) return;

  const gateway = (payload: { markdown: string }): void => {
    navigator.clipboard.writeText(payload.markdown).then(() => showToast('Markdown copiado'));
  };
  engine.handleMarkdown(_selectedContainer, ExtractorLib.extractMarkdown, gateway);
}

// ─── MOUSE / EVENT HANDLERS ──────────────────────────────────

function handleMouseOver(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  if (target.closest('.Cognilot-inspector-toolbar')) return;
  e.preventDefault();
  e.stopPropagation();

  if (_currentMode === 'form_scope') {
    if (!_isManualSelecting) return;
    const candidate = InspectorLib.resolveContainerFromElement(target);
    if (candidate) highlight(candidate);
    return;
  }
  highlight(target);
}

function handleMouseOut(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  if (target.closest('.Cognilot-inspector-toolbar')) return;

  if (_currentMode === 'form_scope') {
    if (!_isManualSelecting) return;
    const candidate = InspectorLib.resolveContainerFromElement(target);
    if (candidate && _selectedContainer === candidate) return;
    if (candidate) removeHighlight(candidate);
    return;
  }
  removeHighlight(target);
}

async function handleClick(e: MouseEvent): Promise<void> {
  const target = e.target as HTMLElement;
  if (target.closest('.Cognilot-inspector-toolbar')) return;
  e.preventDefault();
  e.stopPropagation();

  try {
    if (_currentMode === 'form_scope') {
      if (!_isManualSelecting) return;
      const container = InspectorLib.resolveContainerFromElement(target);
      if (!container) return;

      const domUtil = window.Cognilot?.SDK?.Core?.DOMUtil;
      const selector = domUtil?.getUniqueSelector(container) || null;

      saveManualSelector(selector);

      _selectedContainer = container;
      _activeSource = 'manual_scan';
      _isManualSelecting = false;
      setCursor(false);
      setManualSelectMode(false);
      uiSetSelectedContainer(container);

      publishScopedPreview(container, 'manual_selection');
      return;
    }

    disable();
    const engine = window.Cognilot.SDK.Engines.ExtractionEngine;
    if (!engine) return;

    const gateway = (payload: { markdown?: string }): void => {
      if (payload.markdown) {
        const url = `https://chatgpt.com/?q=${encodeURIComponent(payload.markdown)}`;
        window.open(url, '_blank');
      }
    };
    if (_currentMode === 'visual') {
      await engine.handleCapture(target, ExtractorLib.extractVisual, gateway);
    } else {
      engine.handleMarkdown(target, ExtractorLib.extractMarkdown, gateway);
    }
  } catch (err) {
    console.error('[Inspector] Error:', err);
  }
}

function bindEvents(): void {
  _boundHandleMouseOver = (e) => handleMouseOver(e);
  _boundHandleMouseOut = (e) => handleMouseOut(e);
  _boundHandleClick = (e) => handleClick(e);
  _boundHandleEsc = (e) => {
    if (e.key === 'Escape') disable();
  };
  _boundPrevent = (e) => {
    if ((e.target as HTMLElement).closest('.Cognilot-inspector-toolbar')) return;
    e.preventDefault();
    e.stopPropagation();
  };

  document.addEventListener('mouseover', _boundHandleMouseOver as EventListener, true);
  document.addEventListener('mouseout', _boundHandleMouseOut as EventListener, true);
  document.addEventListener('click', _boundHandleClick as EventListener, true);
  document.addEventListener('keydown', _boundHandleEsc as EventListener, true);
  document.addEventListener('mousedown', _boundPrevent as EventListener, true);
  document.addEventListener('mouseup', _boundPrevent as EventListener, true);
}

function unbindEvents(): void {
  if (_boundHandleMouseOver)
    document.removeEventListener('mouseover', _boundHandleMouseOver as EventListener, true);
  if (_boundHandleMouseOut)
    document.removeEventListener('mouseout', _boundHandleMouseOut as EventListener, true);
  if (_boundHandleClick)
    document.removeEventListener('click', _boundHandleClick as EventListener, true);
  if (_boundHandleEsc)
    document.removeEventListener('keydown', _boundHandleEsc as EventListener, true);
  if (_boundPrevent) {
    document.removeEventListener('mousedown', _boundPrevent as EventListener, true);
    document.removeEventListener('mouseup', _boundPrevent as EventListener, true);
  }
}

// ─── PUBLIC API ──────────────────────────────────────────────

export function enable(activeFormId?: string): void {
  if (_active) return;
  _active = true;

  Logger.info('🕵️ Inspector Enabled');

  try {
    chrome.runtime.sendMessage(
      {
        action: 'inspectorLockDetection',
        data: { locked: true },
      },
      {},
      () => {
        const runtime = chrome.runtime as any;
        if (runtime.lastError) {
          // silently ignore
        }
      }
    );
  } catch (_e) {
    // silently ignore
  }

  const onSolveClick = (): void => handleSolveClick();
  const onManualSelectClick = (): void => handleManualSelectClick();
  const onCaptureClick = (): void => {
    void handleCaptureClick();
  };
  const onMarkdownClick = (): void => {
    handleMarkdownClick();
  };

  showToolbar(
    (mode: string) => {
      _currentMode = mode;
      if (mode === 'form_scope') {
        void activateDefaultFormScopePreview();
      } else {
        _selectedContainer = null;
        _detectedFieldCount = 0;
        uiSetSelectedContainer(null);
        updateActionButtons(0, {
          onManualSelectClick,
          onSolveClick,
          onCaptureClick,
          onMarkdownClick,
        });
      }
    },
    onSolveClick,
    onManualSelectClick,
    onCaptureClick,
    onMarkdownClick,
    () => disable()
  );

  // PRIORITY 0: Use activeFormId if provided by the sidebar
  let container: HTMLElement | null = null;
  if (activeFormId) {
    try {
      const registry = window.Cognilot?.SDK?.registry;
      if (registry) {
        const entries = registry.getAll().filter(
          (e: any) => String(e.formScopeId || e.formId || e.form_id) === String(activeFormId)
        );
        if (entries.length > 0) {
          const firstEntry = entries[0];
          const rawNode = firstEntry.node && typeof firstEntry.node.getRawNode === 'function'
            ? firstEntry.node.getRawNode()
            : firstEntry.node;
          const firstEl = rawNode || (firstEntry.selector ? document.querySelector(firstEntry.selector) : null);
          if (firstEl) {
            container = InspectorLib.resolveContainerFromElement(firstEl as HTMLElement);
          }
        }
      }
    } catch (e) {
      console.warn('[Inspector] Error finding container for activeFormId:', e);
    }
  }

  if (container) {
    _selectedContainer = container;
    _activeSource = 'auto_scan';
    uiSetSelectedContainer(container);
    // Find fields for this container
    const detection = window.CognilotAPI?.detect
      ? window.CognilotAPI.detect(container, false)
      : ({ questions: [], count: 0 } as any);
    publishScopedPreview(container, 'auto_detection', detection);
    _isManualSelecting = false;
    setCursor(false);
    bindEvents();
    return;
  }

  // PRIORITY 1: Restore last manual selection
  const storedSelector = loadManualSelector();
  if (storedSelector) {
    let container: HTMLElement | null = null;
    try {
      container = document.querySelector(storedSelector);
    } catch (_e) {
      // silently ignore
    }
    if (container) {
      _selectedContainer = container;
      _activeSource = 'manual_scan';
      uiSetSelectedContainer(container);
      publishScopedPreview(container, 'manual_selection');
      _isManualSelecting = false;
      setCursor(false);
      bindEvents();
      return;
    } else {
      saveManualSelector(null);
    }
  }

  // PRIORITY 2: Use auto-scan cache
  const cachedResult = window.Cognilot._discoveryCache?.get() ?? null;
  const cacheSelector = cachedResult
    ? (cachedResult as any).formSelector || (cachedResult as any).form_selector
    : null;
  let cacheContainer: HTMLElement | null = null;
  if (cacheSelector) {
    try {
      cacheContainer = document.querySelector(cacheSelector as string);
    } catch (_e) {
      // silently ignore
    }
  }

  if (cacheContainer) {
    _selectedContainer = cacheContainer;
    _activeSource = 'auto_scan';
    uiSetSelectedContainer(cacheContainer);
    publishScopedPreview(cacheContainer, 'auto_detection', cachedResult);
    _isManualSelecting = false;
    setCursor(false);
  } else {
    // PRIORITY 3: No detection — manual selection mode
    _activeSource = null;
    _isManualSelecting = true;
    setCursor(true);
    setManualSelectMode(true);
    updateActionButtons(0, {
      onManualSelectClick,
      onSolveClick,
      onCaptureClick,
      onMarkdownClick,
    });
  }

  bindEvents();
}

export function disable(): void {
  if (!_active) return;
  _active = false;
  _selectedContainer = null;

  try {
    chrome.runtime.sendMessage(
      {
        action: 'inspectorUnlockDetection',
        data: { locked: false },
      },
      {},
      () => {
        const runtime = chrome.runtime as any;
        if (runtime.lastError) {
          // silently ignore
        }
      }
    );
  } catch (_e) {
    // silently ignore
  }

  uiClear();
  unbindEvents();
}

export function redetectOnActiveScope(): boolean {
  const selector = loadManualSelector();
  if (!selector) return false;

  let container: HTMLElement | null = null;
  try {
    container = document.querySelector(selector);
  } catch (_e) {
    // silently ignore
  }
  if (!container) {
    saveManualSelector(null);
    return false;
  }

  if (window.Cognilot.SDK?.facade) window.Cognilot.SDK.facade.invalidateCache();

  const detection = window.CognilotAPI?.detect
    ? window.CognilotAPI.detect(container, false)
    : ({ questions: [], count: 0 } as unknown as DetectionPayload);

  _selectedContainer = container;
  _activeSource = 'manual_scan';
  _detectedFieldCount = (detection as DetectionPayload).count || 0;

  const payload =
    typeof (detection as any).serialize === 'function' ? (detection as any).serialize() : detection;
  PreviewPublisher.publish(payload as Record<string, unknown>, 'manual_selection', 'refresh');

  return true;
}

export function isActive(): boolean {
  return _active;
}

export const InspectorController = {
  enable,
  disable,
  redetectOnActiveScope,
  isActive,
};
