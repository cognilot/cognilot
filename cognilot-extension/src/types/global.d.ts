/**
 * Global Type Declarations for Cognilot Extension
 * Covers the SDK (from @Cognilot-org/sdk), Vite env, and shared interfaces
 */

// ─── Vite Environment Augmentation ───────────────────────────────────
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL_LOCAL?: string;
  readonly VITE_WEB_APP_URL_LOCAL?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ─── SDK Types (from @Cognilot-org/sdk — bundles globals for compatibility) ──
// These mirror the classes/interfaces exported by the SDK bundle

interface SDKNode {
  platform: string;
  element: HTMLElement;
  readonly tagName: string;
  readonly type: string;
  readonly id: string;
  readonly name: string;
  readonly className: string;
  readonly value: string;
  readonly isVisible: boolean;
  readonly isInteractive: boolean;
  readonly textContent: string;
  getAttribute(name: string): string | null;
  getInnerText(): string;
  getStyle(prop: string): string;
  getParent(): SDKNode | null;
  getChildren(): SDKNode[];
  querySelector(selector: string): SDKNode | null;
  querySelectorAll(selector: string): SDKNode[];
  closest(selector: string): SDKNode | null;
  contains(node: SDKNode): boolean;
  getNextSibling(): SDKNode | null;
  getPreviousSibling(): SDKNode | null;
  isBefore(node: SDKNode): boolean;
  setValue(value: string): Promise<void>;
  click(): Promise<void>;
  triggerEvent(name: string): void;
  getRawNode(): HTMLElement;
}

interface SDKPlatform {
  identifier: string;
  wrap(el: HTMLElement | null): SDKNode | null;
  getRootNode(): SDKNode;
  getComputedStyle(node: SDKNode): Record<string, string>;
  evaluateXPath(expr: string, context: SDKNode): SDKNode[];
  getGlobalContext(): SDKGlobalContext;
}

interface SDKGlobalContext {
  location: {
    hostname: string;
    pathname: string;
    href: string;
  };
  title: string;
  document: Document;
}

interface SDKFieldMetadata {
  label: string | null;
  labelElement: SDKNode | null;
  helper_text: string;
  required: boolean;
  confidence: number;
  source: string | null;
}

interface SDKDetectionResult {
  form_id: string;
  form_selector: string;
  questions: SDKQuestionDTO[];
  is_likely_form: boolean;
  metadata: Record<string, unknown>;
  page_features: Record<string, unknown>;
}

interface SDKQuestionDTO {
  text: string;
  type: string;
  placeholder: string;
  options: Array<{ text: string; value: string; index: number }>;
  id: string;
  name: string;
  tagName: string;
  required: boolean;
  ref_id: string;
  section_ref_id: string;
  metadata: SDKFieldMetadata;
  selector: string;
  node: SDKNode;
  currentValue?: string;
}

interface SDKSuggestionResult {
  success: boolean;
  value: string;
  options: string[];
  field: SDKFieldMetadata & { placeholder?: string };
  source: string;
  type: string;
  error?: string;
  _batchStarted?: boolean;
}

interface SDKDecisionResult {
  selected_indices: number[];
  selected_values: string[];
  ghost_indices: number[];
  source: string;
  is_example?: boolean;
}

interface SDKBatchResult {
  success: boolean;
  results: Array<{
    id: string;
    success: boolean;
    answer?: string;
    error?: string;
  }>;
  summary?: { solved: number; total: number };
}

interface SDKDetectionEngine {
  lastResult: SDKDetectionResult | null;
  detect(node?: SDKNode | null, freeFilter?: boolean, source?: string): SDKDetectionResult;
  getFieldMetadata(node: SDKNode): SDKFieldMetadata;
  cacheResult(result: SDKDetectionResult, source: string): void;
  matchField(el: HTMLElement): SDKQuestionDTO | null;
  getCache(): { result: SDKDetectionResult; source: string; timestamp: number } | null;
  invalidateCache(): void;
  resolver: {
    resolveFormScope(node: SDKNode): SDKNode | null;
    resolveFormScopeByRadialExpansion(
      node: SDKNode,
      collector: unknown
    ): { formContainer: SDKNode; fieldRefs: unknown[]; score: number; radius: number } | null;
  };
  collector: unknown;
  extractor: {
    extractFieldMetadata(node: SDKNode): SDKFieldMetadata;
    extractFieldLabel(node: SDKNode): string | null;
    buildFallbackSelector(node: SDKNode): string;
    collectChoiceOptions(node: SDKNode): Array<{ text: string; value: string; index: number }>;
  };
}

interface SDKSuggestionEngine {
  handleTrigger(
    node: SDKNode,
    options?: Record<string, unknown>
  ): Promise<SDKSuggestionResult | null>;
  handleRefine(
    node: SDKNode,
    text: string
  ): Promise<{ success: boolean; value?: string; field?: unknown } | null>;
  confirmSuggestion(node: SDKNode, value: string, skipSync?: boolean): Promise<void>;
  prefetchBatch(questions: SDKQuestionDTO[]): Promise<void>;
}

interface SDKActionEngine {
  handleTrigger(node: SDKNode): Promise<SDKSuggestionResult | SDKDecisionResult | null>;
  executeBatch(
    questions: SDKQuestionDTO[],
    progressHandler?: (progress: unknown) => void
  ): Promise<SDKBatchResult>;
  solveForm(node: SDKNode): Promise<SDKBatchResult>;
  refineText(
    node: SDKNode,
    text: string
  ): Promise<{ success: boolean; value?: string; field?: unknown } | null>;
}

interface SDKDecisionEngine {
  handleTrigger(node: SDKNode): Promise<SDKDecisionResult | null>;
  prefetchBatch(questions: SDKQuestionDTO[]): Promise<void>;
}

interface SDKAliasResolver {
  resolve(question: {
    text: string;
    name?: string;
    placeholder?: string;
    id?: string;
    type?: string;
  }): Promise<{
    success: boolean;
    suggestion: { options: string[]; type: string; source: string };
    reasoning: string;
  } | null>;
  persistAlias(label: string, value: string, skipSync?: boolean): Promise<boolean>;
  flushQueue(keepalive?: boolean): Promise<void>;
  clearSyncQueue(): Promise<void>;
}

interface SDKProfileResolver {
  resolve(question: {
    text: string;
    name?: string;
    placeholder?: string;
    id?: string;
    type?: string;
  }): Promise<{
    success: boolean;
    suggestion: { options: string[]; type: string; source: string };
    reasoning: string;
  } | null>;
  updateFromStandardizedData(data: Record<string, unknown>): Promise<void>;
  getProfile(): Promise<Record<string, unknown>>;
}

interface SDKFacade {
  detect(el?: HTMLElement | null, freeFilter?: boolean, source?: string): SDKDetectionResult;
  extractFieldMetadata(el: HTMLElement): SDKFieldMetadata | null;
  matchField(el: HTMLElement): SDKQuestionDTO | null;
  getCache(): { result: SDKDetectionResult; source: string; timestamp: number } | null;
  invalidateCache(): void;
}

interface SDKSettingsManager {
  DEFAULT_SETTINGS: {
    visual: { showBorders: boolean; showButtons: boolean };
    copilotSuggestions: {
      enabled: boolean;
      ghostText: boolean;
      showInPlaceholder: boolean;
      cacheSuggestions: boolean;
      learnCustomFields: boolean;
    };
    aiModels: {
      suggestionsProvider: string;
      actionsProvider: string;
    };
  };
  getValueByPath(obj: Record<string, unknown>, path: string, fallback?: unknown): unknown;
  setValueByPath(
    obj: Record<string, unknown>,
    path: string,
    value: unknown
  ): Record<string, unknown>;
  deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T;
}

interface SDKFieldRegistryEntry {
  id: string;
  type: string;
  tagName: string;
  name: string;
  text: string;
  placeholder: string;
  required: boolean;
  options: Array<{ text: string; value: string; index: number }>;
  selector: string;
  belongsToForm: boolean;
  formScopeId: string | null;
  formScore: number;
  status: 'pending' | 'resolved' | 'failed';
  resolution: { value: string; options: string[]; source: string } | null;
  node: SDKNode;
  formName?: string | null;
}

interface SDKFieldRegistry {
  register(entry: SDKFieldRegistryEntry): void;
  updateResolution(
    id: string,
    resolution: { value: string; options: string[]; source: string }
  ): void;
  markFailed(id: string): void;
  clear(): void;
  findByNode(el: object): SDKFieldRegistryEntry | null;
  findBySelector(selector: string): SDKFieldRegistryEntry | null;
  findById(id: string): SDKFieldRegistryEntry | null;
  getAll(): SDKFieldRegistryEntry[];
  getFormFields(): SDKFieldRegistryEntry[];
  getPendingFields(): SDKFieldRegistryEntry[];
  getPendingFieldsByFormScope(formScopeId: string): SDKFieldRegistryEntry[];
  getByFormScope(formScopeId: string): SDKFieldRegistryEntry[];
  getSummary(): {
    total: number;
    resolved: number;
    pending: number;
    failed: number;
    formFields: number;
    isolatedFields: number;
  };
  readonly size: number;
  readonly resolvedCount: number;
  readonly pendingCount: number;
  readonly formFieldCount: number;
}

interface SDKPageScanner {
  scanOnPageLoad(): Promise<void>;
  startObserving(): void;
  stopObserving(): void;
}

interface CognilotSDKInstance {
  platform: SDKPlatform;
  adapters: Record<string, unknown>;
  detection: SDKDetectionEngine;
  action: SDKActionEngine;
  suggestion: SDKSuggestionEngine;
  decision: SDKDecisionEngine;
  alias: SDKAliasResolver;
  profile: SDKProfileResolver;
  facade: SDKFacade;
  apiClient: {
    request(
      url: string,
      payload: unknown,
      tag?: string,
      options?: Record<string, unknown>
    ): Promise<Record<string, unknown>>;
  };
  policy: {
    isFreePlan(user: unknown): boolean;
    canBatchFetch(user: unknown, count: number): boolean;
  };
  wrap(el: HTMLElement): SDKNode | null;

  // Universal Suggestion infrastructure (Phase 2)
  registry: SDKFieldRegistry;
  scanner: SDKPageScanner;

  /**
   * Triggers the proactive page scan.
   * Called by the browser bootstrap after adapters are registered.
   */
  initUniversalScan(): Promise<void>;

  // Compatibility layer set by @Cognilot-org/sdk
  Adapters: {
    StorageAdapter: new () => unknown;
    MessagingAdapter: new () => unknown;
    DOMAdapter: new () => unknown;
    SettingsAdapter: new () => unknown;
    AuthAdapter: new () => unknown;
    PageContextAdapter: new () => unknown;
  };
  Core: {
    Registry: {
      registerAdapters(adapters: Record<string, unknown>): void;
      registerAdapter(name: string, adapter: unknown): void;
      getAdapter(name: string): unknown;
    };
    SettingsManager: SDKSettingsManager;
    DetectionPostProcessor: { process(result: unknown): unknown };
    DOMExtractor: {
      extractPageAsMarkdown(): string;
      extractFieldMetadata?(el: HTMLElement): SDKFieldMetadata;
      extractPageContext?(includeMarkdown: boolean): Record<string, unknown>;
    };
    DOMUtil: {
      getUniqueSelector(el: HTMLElement | null): string;
    };
  };
  DetectionFacade: SDKFacade;
  Engines: {
    DetectionEngine: SDKDetectionEngine;
    SuggestionEngine: SDKSuggestionEngine;
    ActionEngine: SDKActionEngine;
    DecisionEngine: SDKDecisionEngine;
    ExtractionEngine?: {
      handleCapture(el: HTMLElement, extractor: unknown, gateway: unknown): Promise<void>;
      handleMarkdown(el: HTMLElement, extractor: unknown, gateway: unknown): void;
    };
    Detection: {
      FormScopeResolver: SDKDetectionEngine['resolver'];
      FieldCollector: unknown;
      LabelExtractor: SDKDetectionEngine['extractor'];
    };
  };
}

// ─── Augmented HTMLElement for Cognilot custom properties ───────────
interface HTMLElement {
  _CognilotGhost?: HTMLDivElement;
  _CognilotGhostRaf?: number;
  _CognilotHint?: HTMLDivElement;
  _CognilotHelp?: HTMLDivElement;
  _CognilotSuggestion?: SuggestionState;
  _isTabCompletion?: boolean;
  _blockCognilotTrigger?: boolean;
  _CognilotLastLearnedValue?: string;
  _CognilotFocusValue?: string;
  _CognilotOriginalBoxShadow?: string;
  _CognilotOriginalOutline?: string;
  _CognilotOriginalBackgroundColor?: string;
  _CognilotSelectedOutline?: string;
  _CognilotSelectedBoxShadow?: string;
  _CognilotSelectedBackground?: string;
  _CognilotSelectedZIndex?: string;
  _CognilotSelectedPosition?: string;
}

// ─── Suggestion state attached to elements ──────────────────────────
interface SuggestionState {
  options?: string[];
  _allOptions?: string[];
  _activeIndex?: number;
  _isHintHidden?: boolean;
  _isFeedback?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  isNoMatch?: boolean;
  isHelp?: boolean;
  error?: string;
  type?: string;
  source?: string;
  value?: string;
  field?: {
    label?: string;
    placeholder?: string;
    name?: string;
    id?: string;
    type?: string;
    required?: boolean;
    tagName?: string;
  };
}

// ─── Page Context ───────────────────────────────────────────────────
interface PageContext {
  url: string;
  domain: string;
  title: string;
  language: string;
}

// ─── Window Augmentations ───────────────────────────────────────────
interface Window {
  Cognilot: {
    SDK: CognilotSDKInstance;
    Settings: Record<string, unknown>;
    _authenticated: boolean;
    _isPro: boolean;
    _discoveryCache?: {
      get(): SDKDetectionResult | null;
      hasRan(): boolean;
      invalidate(): void;
    };
    [key: string]: unknown;
  };
  CognilotAPI: {
    solveAll(questions?: SDKQuestionDTO[] | null): unknown;
    enableInspector(): void;
    disableInspector(): void;
    detect(
      scopeElement?: HTMLElement | null,
      silent?: boolean
    ): import('../lib/detection_payload').DetectionPayload;
  };
  CognilotSDK: unknown;
  TurndownService: new () => {
    turndown(html: string | HTMLElement): string;
  };
  aidenOverlayActive?: boolean;
  aidenEnableInspector?: () => void;
  aidenDetectForms?: () => unknown;
  showToast?: (msg: string, type?: string, duration?: number) => void;
  CONFIG?: Record<string, unknown>;
}
