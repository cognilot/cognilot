import type { PlatformAdapter, CognilotNode } from './platforms/interface';
import { WebPlatform } from './platforms/web-platform';
import { DetectionEngine } from './engines/detection/detection-engine';
import { SuggestionEngine } from './engines/autocomplete/suggestion-engine';
import { ActionEngine } from './engines/action/action-engine';
import { DecisionEngine } from './engines/autocomplete/decision-engine';
import { DetectionFacade } from './detection-facade';
import { ApiClient } from './clients/api-client';
import { PlanGuard } from './policy/plan-guard';
import { AliasResolver } from './core/alias-resolver';
import { ProfileResolver } from './core/profile-resolver';
import { FieldRegistry } from './core/field-registry';
import { PageScanner } from './engines/detection/page-scanner';
import { InferenceRouter } from './inference/InferenceRouter';
import { PromptTemplateManager } from './inference/PromptTemplateManager';

export { WebPlatform };
export {
  BaseStorageAdapter,
  BaseMessagingAdapter,
  BasePageContextAdapter,
  BaseDOMAdapter,
  BaseSettingsAdapter,
  BaseAuthAdapter,
} from './adapters/base-adapters';
import {
  BaseStorageAdapter,
  BaseMessagingAdapter,
  BasePageContextAdapter,
  BaseDOMAdapter,
  BaseSettingsAdapter,
  BaseAuthAdapter,
} from './adapters/base-adapters';
import { SettingsManager } from './core/settings-manager';
export * from './contracts/field-detection-response';
export * from './contracts/field-registry-entry';
export * from './contracts/form-scope-info';
export * from './contracts/suggestion-request';
export * from './contracts/suggestion-response';
export * from './contracts/decision-response';
export * from './contracts/decision-request';
export * from './contracts/field-context';
export * from './contracts/page-context';
export { FieldRegistry } from './core/field-registry';
export { PageScanner } from './engines/detection/page-scanner';
export type { PlatformAdapter, CognilotNode };

// ── Inference Module ──────────────────────────────────────────────────────────
export {
  InferenceRouter,
  InferenceUnavailableError,
  GeminiNanoProvider,
  GroqProvider,
  BYOKProvider,
} from './inference/index';
export type {
  InferenceProvider,
  CompletionOptions,
  InferenceResult,
  ProviderSelectionReason,
  InferenceRouterConfig,
  FieldPromptContext,
  GroqProviderConfig,
  BYOKConfig,
  BYOKProviderType,
} from './inference/index';

export interface SDKConfig {
  platform: PlatformAdapter;
  apiBaseUrl?: string;
  adapters?: {
    storage?: any;
    messaging?: any;
    auth?: any;
    settings?: any;
  };
}

export class CognilotSDK {
  public platform: PlatformAdapter;
  public adapters: SDKConfig['adapters'];

  // Public Engines (Primary Gateways)
  /** Orchestrates page and form scanning */
  public detection: DetectionEngine;
  /** Orchestrates all field interactions and form solving */
  public action: ActionEngine;
  public inference: InferenceRouter;

  // Internal Engines (Orchestrated by ActionEngine)
  /** @internal Processes textual suggestions */
  public suggestion: SuggestionEngine;
  /** @internal Processes choice-based decisions */
  public decision: DecisionEngine;
  public alias: AliasResolver;
  public profile: ProfileResolver;

  // Universal Suggestion — Phase 2
  /**
   * In-memory store for all text-input fields scanned on the current page.
   * Source of truth for the Universal Suggestion architecture.
   * Queried by ActionEngine on every user interaction.
   */
  public registry: FieldRegistry;

  /**
   * Proactive page scanner. Runs at page load to fill the registry
   * and starts a MutationObserver for SPA / dynamic fields.
   */
  public scanner: PageScanner;

  // Tools & Facades
  public facade: DetectionFacade;
  public apiClient: ApiClient;
  public policy: PlanGuard;

  constructor(config: SDKConfig) {
    this.platform = config.platform;
    this.adapters = config.adapters || {};

    // Initialize engines
    this.detection = new DetectionEngine(this.platform);
    this.suggestion = new SuggestionEngine(this);
    this.action = new ActionEngine(this);
    this.decision = new DecisionEngine(this);
    this.alias = new AliasResolver(this);
    this.profile = new ProfileResolver(this);

    // Universal Suggestion infrastructure
    this.registry = new FieldRegistry();
    this.scanner = new PageScanner(this, this.registry);

    // Tools
    this.facade = new DetectionFacade(this);
    this.apiClient = new ApiClient(this, config.apiBaseUrl);
    this.policy = new PlanGuard();

    const templateManager = new PromptTemplateManager(this);
    this.inference = new InferenceRouter({
      apiBaseUrl: this.apiClient.apiBaseUrl,
      getAuthToken: async () => {
        const auth = this.adapters?.auth;
        if (!auth) return null;
        return auth.getToken();
      },
      getByokConfig: async () => {
        const settings = this.adapters?.settings;
        if (!settings) return null;
        const suggestionsProvider = await settings.getSetting(
          'aiModels.suggestionsProvider',
          'llama-3.1-8b-instant'
        );
        if (!suggestionsProvider || !suggestionsProvider.startsWith('byok-')) return null;
        const provider = suggestionsProvider.replace('byok-', '');
        const apiKey = await settings.getSetting(`byok.providers.${provider}.apiKey`, '');
        const model = await settings.getSetting(`byok.providers.${provider}.model`, '');
        return { provider, apiKey, model };
      },
      getProfile: async () => {
        if (!this.profile) return {};
        return this.profile.getProfile();
      },
      templateManager: templateManager,
    });
  }

  /**
   * Helper to wrap a raw element into an CognilotNode
   */
  wrap(element: any): CognilotNode | null {
    return this.platform.wrap(element);
  }

  /**
   * Triggers the proactive page scan.
   * Called by the browser bootstrap after adapters are registered.
   * Safe to call multiple times — PageScanner guards against concurrent runs.
   */
  async initUniversalScan(): Promise<void> {
    await this.scanner.scanOnPageLoad();
  }
}

/**
 * Browser Bootstrap
 * Populates window.Cognilot.SDK for backward compatibility with the legacy extension.
 */
if (typeof window !== 'undefined') {
  const _window = window as any;
  _window.Cognilot = _window.Cognilot || {};

  // Initialize SDK with Web platform
  const sdk = new CognilotSDK({ platform: new WebPlatform() });

  // Expose as the new standard
  _window.Cognilot.SDK = sdk;

  // Compatibility Mapping for Adapters (Critical for host_adapters.js)
  (sdk as any).Adapters = {
    StorageAdapter: BaseStorageAdapter,
    MessagingAdapter: BaseMessagingAdapter,
    DOMAdapter: BaseDOMAdapter,
    SettingsAdapter: BaseSettingsAdapter,
    AuthAdapter: BaseAuthAdapter,
    PageContextAdapter: BasePageContextAdapter,
  };

  // Compatibility Mapping for Core Utilities
  (sdk as any).Core = {
    Registry: {
      registerAdapters: (config: any) => {
        console.log('🔌 [Cognilot SDK Proxy] Registering multiple legacy adapters...', config);
        sdk.adapters = { ...sdk.adapters, ...config };

        // ── Phase 2: Trigger proactive scan after adapters are registered ────
        // We defer to the next microtask so the caller finishes its setup first.
        // The scanner guards against concurrent runs internally.
        Promise.resolve().then(() => {
          sdk.initUniversalScan().catch((err: any) => {
            console.warn('[Cognilot SDK] Universal scan failed:', err);
          });
        });
      },
      registerAdapter: (name: string, adapter: any) => {
        console.log(`🔌 [Cognilot SDK Proxy] Registering legacy adapter: ${name}`);
        sdk.adapters = { ...sdk.adapters, [name]: adapter };
      },
      getAdapter: (name: string) => (sdk.adapters as any)[name] || null,
    },
    SettingsManager: SettingsManager,
    DetectionPostProcessor: {
      process: (res: any) => sdk.detection.lastResult || res,
    },
    DOMExtractor: {
      extractPageAsMarkdown: () => {
        // Simplified markdown extraction using title/url if full implementation is missing
        return `Title: ${document.title}\nURL: ${window.location.href}`;
      },
    },
    DOMUtil: {
      getUniqueSelector: (el: any) => {
        if (!el) return '';
        if (el.id) return `#${el.id}`;
        return el.tagName.toLowerCase();
      },
    },
  };

  // Compatibility Mapping for Engines
  (sdk as any).DetectionFacade = sdk.facade;
  (sdk as any).Engines = {
    DetectionEngine: sdk.detection,
    SuggestionEngine: sdk.suggestion,
    ActionEngine: sdk.action,
    DecisionEngine: sdk.decision,
    Detection: {
      FormScopeResolver: (sdk.detection as any).resolver,
      FieldCollector: (sdk.detection as any).collector,
      LabelExtractor: (sdk.detection as any).extractor,
    },
  };

  // Expose new Universal Suggestion infrastructure for the extension
  (sdk as any).FieldRegistry = sdk.registry;
  (sdk as any).PageScanner = sdk.scanner;

  console.log('🚀 [Cognilot SDK] Local Live Link established via window.Cognilot.SDK');
}
