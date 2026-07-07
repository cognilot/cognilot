import { CognilotNode, PlatformAdapter } from '../../platforms/interface';
import { FieldDetectionResponse } from '../../contracts/field-detection-response';
import { FieldRegistryEntry } from '../../contracts/field-registry-entry';
import { FormScopeInfo } from '../../contracts/form-scope-info';
import { FieldCollector } from './field-collector';
import { LabelExtractor } from './label-extractor';
import { FormScopeResolver, RadialContext } from './form-scope-resolver';

export interface PageFeatures {
  title: string;
  url: string;
  has_stripe: boolean;
  has_recaptcha: boolean;
  has_hcaptcha: boolean;
  forms_count: number;
}

export interface DetectionResult {
  questions: FieldDetectionResponse[];
  form_id: string;
  form_selector: string;
  is_likely_form: boolean;
  page_features: PageFeatures;
  metadata: {
    platform: string;
    strategy: string;
    radius: number;
    total_detected_fields: number;
    filtered_by_plan: boolean;
    is_virtual_form?: boolean;
    isolated_field?: boolean;
  };
}

export type DetectionSource = 'auto_scan' | 'manual_scan';

export interface DetectionCacheEntry {
  result: DetectionResult;
  source: DetectionSource;
  timestamp: number;
}

/**
 * DetectionEngine
 * Main detection engine orchestrator porting the logic from the original JS SDK.
 */
export class DetectionEngine {
  public adapter: PlatformAdapter;
  public collector: FieldCollector;
  public resolver: FormScopeResolver;
  public extractor: LabelExtractor;
  public lastResult: DetectionResult | null = null;
  private _cache: DetectionCacheEntry | null = null;

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
    this.extractor = new LabelExtractor(adapter);
    this.collector = new FieldCollector(adapter, this.extractor);
    this.resolver = new FormScopeResolver(adapter);
  }

  /**
   * Detect form fields within a broad scope or the entire page.
   */
  public detect(
    scopeElement: CognilotNode | null = null,
    isFreePlan: boolean = true,
    source: DetectionSource = 'auto_scan'
  ): DetectionResult {
    let radialContext: RadialContext | null = null;
    let root: CognilotNode | null = scopeElement;

    if (!root) {
      // Find best form in page if no scope provided
      const allSeedsSelector =
        'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"], iframe';
      const pageRoot = this.adapter.getRootNode();
      const seeds = pageRoot
        ? pageRoot.querySelectorAll(allSeedsSelector).filter((el) => el.isVisible)
        : [];

      const evaluated = new Set();
      for (const seed of seeds.slice(0, 30)) {
        const context = this.resolver.resolveFormScopeByRadialExpansion(seed, this.collector);
        if (!context || evaluated.has(context.formContainer.getRawNode())) continue;
        evaluated.add(context.formContainer.getRawNode());

        if (!radialContext || context.score > radialContext.score) {
          radialContext = context;
        }
      }
      // Only proceed if a significant form was found by the resolver
      root = radialContext ? radialContext.formContainer : null;
    } else {
      // --- SMART ADAPTIVE MODE ---
      // 1. If the node itself is a seed, try finding its "form home" first
      const isSeed = this.isElementSeed(root);
      if (isSeed) {
        radialContext = this.resolver.resolveFormScopeByRadialExpansion(root, this.collector);
        if (radialContext) {
          root = radialContext.formContainer;
        }
      }

      // 2. If no radial expansion worked, try strict manual boundary search
      if (!radialContext) {
        radialContext = this.resolver.buildManualScopeContext(root, this.collector);
      }

      // 3. SINGLE-FIELD FALLBACK: If we still don't have a form, try to extract it as isolated field
      if (!radialContext) {
        let singleField = this.collector.extractSingleTextField(scopeElement!);

        if (!singleField && scopeElement) {
          const allSeedsSelector =
            'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"]';
          const childFields = scopeElement
            .querySelectorAll(allSeedsSelector)
            .filter((el) => el.isVisible);
          if (childFields.length === 1) {
            singleField = this.collector.extractSingleTextField(childFields[0]);
          }
        }

        if (singleField) {
          const result = this.createSingleFieldResult(singleField, scopeElement!);
          this.lastResult = result;
          return result;
        }

        // Explicitly abort if no valid context or isolated field
        this.lastResult = this.createEmptyResult();
        return this.lastResult;
      }
    }

    if (!root) {
      this.lastResult = this.createEmptyResult();
      return this.lastResult;
    }

    // 2. Collect ALL fields within that scope
    const allQuestions = this.collector.collectCandidateFields(root!, radialContext!);

    // 3. Filter results based on plan
    const filteredQuestions = isFreePlan
      ? allQuestions.filter((q) => {
          const type = (q.type || '').toLowerCase();
          return !(['radio', 'checkbox', 'file'].includes(type) || type.startsWith('select'));
        })
      : allQuestions;

    // 4. Significance Check & Deduplication
    const seenKeys = new Set<string>();
    const uniqueFields = filteredQuestions.filter((q: any) => {
      const key = q.ref_id
        ? `ref:${q.ref_id}`
        : `label:${(q.text || q.metadata?.label || '').toLowerCase().trim()}`;
      if (!key || seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    const isSignificant = uniqueFields.length >= 2;
    const isLikelyForm = isSignificant;

    // 6. Enrich with page features
    const pageFeatures = this.enrichWithPageFeatures();

    const result: DetectionResult = {
      form_id:
        radialContext?.formContainer?.getAttribute('id') ||
        `form-${Math.random().toString(36).substr(2, 9)}`,
      form_selector: this.extractor.buildFallbackSelector(root!),
      questions: uniqueFields,
      is_likely_form: isLikelyForm,
      metadata: {
        platform: 'universal',
        strategy: 'radial-expansion',
        radius: radialContext?.radius || 0,
        total_detected_fields: uniqueFields.length,
        filtered_by_plan: isFreePlan && allQuestions.length > filteredQuestions.length,
      },
      page_features: pageFeatures,
    };

    this.lastResult = result;
    this.cacheResult(result, source);
    return result;
  }

  /**
   * Performs a full-page proactive scan of ALL visible text-input fields.
   *
   * This is the entry point for the Universal Suggestion architecture.
   * It does NOT use a form scope as a filter; instead it collects every field on
   * the page, then classifies them by running radial expansion on unassigned
   * seeds to identify form scopes (belongsToForm flag).
   *
   * Designed to be called once at page load by PageScanner, with a configurable
   * field cap (default: 80) to avoid blocking the main thread on heavy pages.
   *
   * NOTE: detect() is NOT called here and is NOT modified. This method is fully
   * additive and backwards-compatible.
   *
   * @param maxFields - Maximum number of fields to scan (default: 80).
   * @returns An object with the flat list of FieldRegistryEntry objects (without
   *          resolution — PageScanner handles that step) and the identified FormScopeInfo list.
   */
  public scanAllFields(maxFields = 80): {
    fields: FieldRegistryEntry[];
    formScopes: FormScopeInfo[];
  } {
    const root = this.adapter.getRootNode();
    if (!root) return { fields: [], formScopes: [] };

    // ── 1. Collect ALL visible inputs from the page root ─────────────────────
    const allSeedsSelector =
      'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="image"]), ' +
      'textarea, select, [contenteditable="true"], [role="textbox"]';

    const allRaw = root.querySelectorAll(allSeedsSelector).filter((el) => el.isVisible);
    const seeds = allRaw.slice(0, maxFields);

    // ── 2. Build a FieldRegistryEntry per seed ───────────────────────────────
    const fields: FieldRegistryEntry[] = [];

    for (const el of seeds) {
      const metadata = this.extractor.extractFieldMetadata(el);
      const label = metadata?.label;
      if (!label?.trim()) continue; // Skip fields with no extractable label

      const tagName = el.tagName.toLowerCase();
      const rawType = (el.getAttribute('type') || '').toLowerCase();
      const isContentEditable = el.getAttribute('contenteditable') === 'true';
      const isTextbox = el.getAttribute('role') === 'textbox';
      const cleanType =
        isContentEditable || isTextbox
          ? 'text'
          : el.tagName.toLowerCase() === 'select'
            ? 'select'
            : rawType || tagName;

      // Generate a stable id: prefer DOM id, fall back to a selector-based hash
      const stableId =
        el.id ||
        `Cognilot-field-${this.extractor
          .buildFallbackSelector(el)
          .replace(/[^a-z0-9]/gi, '-')
          .substring(0, 40)}`;

      const entry: FieldRegistryEntry = {
        // ── Inherited from FieldDetectionResponse shape ──────────────────────
        id: stableId,
        type: cleanType,
        tagName: el.tagName,
        name: el.name || '',
        text: label,
        placeholder: el.getAttribute('placeholder') || '',
        required: metadata.required,
        options: cleanType === 'select' ? (this.extractor.collectChoiceOptions?.(el) ?? []) : [],
        ref_id: '',
        section_ref_id: '',
        metadata,
        selector: this.extractor.buildFallbackSelector(el),
        node: el,
        // ── Registry flags ────────────────────────────────────────────────────
        belongsToForm: false,
        formScopeId: null,
        // ── Initial lifecycle state ───────────────────────────────────────────
        resolution: null,
        status: 'pending',
      };

      fields.push(entry);
    }

    // ── 3. Identify form scopes and assign flags ──────────────────────────────
    const formScopes = this._identifyFormScopes(fields);

    return { fields, formScopes };
  }

  /**
   * Identifies distinct form scopes within a flat list of FieldRegistryEntry objects.
   *
   * Algorithm:
   * 1. Iterates the field list; for each field not yet assigned to a scope,
   *    runs radial expansion from that field as the seed.
   * 2. If the expansion yields a significant container, ALL fields in the full
   *    list whose DOM node is contained within that container are assigned to
   *    the same FormScopeInfo (same formScopeId, belongsToForm = true).
   * 3. Fields for which no significant container is found remain isolated
   *    (belongsToForm = false, formScopeId = null).
   *
   * This achieves multi-form detection in a single O(n * depth) traversal.
   *
   * @param fields - Flat list produced by scanAllFields (step 2).
   * @returns The list of identified FormScopeInfo objects.
   */
  private _identifyFormScopes(fields: FieldRegistryEntry[]): FormScopeInfo[] {
    const formScopes: FormScopeInfo[] = [];
    const seenContainers = new Set<any>();

    for (const field of fields) {
      // Skip if already assigned to a scope
      if (field.belongsToForm) continue;

      // Run radial expansion from this field's node as the seed
      const context: RadialContext | null = this.resolver.resolveFormScopeByRadialExpansion(
        field.node,
        this.collector
      );

      // No significant container found → field remains isolated
      if (!context) continue;

      const containerRaw = context.formContainer.getRawNode();

      // Skip if we already registered this container (de-duplication)
      if (seenContainers.has(containerRaw)) continue;
      seenContainers.add(containerRaw);

      // Determine strategy label
      const tag = context.formContainer.tagName.toLowerCase();
      const role = context.formContainer.getAttribute('role') || '';
      let strategy: FormScopeInfo['strategy'] = 'radial';
      if (tag === 'form' || role === 'form') {
        strategy = 'native';
      } else if (
        context.formContainer.className &&
        /form-container|form-wrapper|form-section|gform_wrapper|office-form/.test(
          context.formContainer.className
        )
      ) {
        strategy = 'virtual';
      }

      const scopeId =
        context.formContainer.getAttribute('id') || `Cognilot-scope-${formScopes.length + 1}`;

      const scopeInfo: FormScopeInfo = {
        id: scopeId,
        container: context.formContainer,
        strategy,
        selector: this.extractor.buildFallbackSelector(context.formContainer),
        score: context.score,
      };
      formScopes.push(scopeInfo);

      // Assign all fields contained within this scope
      for (const f of fields) {
        if (!f.belongsToForm && context.formContainer.contains(f.node)) {
          f.belongsToForm = true;
          f.formScopeId = scopeId;
          f.formScore = context.score;
        }
      }
    }

    return formScopes;
  }

  /**
   * Helper to retrieve metadata for a single field.
   */
  public getFieldMetadata(node: CognilotNode) {
    return this.extractor.extractFieldMetadata(node);
  }

  /**
   * Stores a detection result in the cache with priority.
   * manual_scan always overrides auto_scan, but auto_scan cannot override manual_scan.
   */
  public cacheResult(result: DetectionResult, source: DetectionSource) {
    if (!result || !result.is_likely_form) return;
    // manual_scan is never overridden by auto_scan
    if (this._cache && this._cache.source === 'manual_scan' && source === 'auto_scan') return;
    this._cache = { result, source, timestamp: Date.now() };
  }

  /**
   * Find if a given raw DOM element matches any field in the cached detection.
   * Match priority: node identity → CSS selector → ref_id → name attribute.
   * Returns the matching FieldDetectionResponse or null.
   */
  public matchField(rawElement: any): FieldDetectionResponse | null {
    if (!this._cache || !this._cache.result.questions) return null;
    for (const q of this._cache.result.questions) {
      // 1. Direct node identity
      if (q.node && q.node.getRawNode() === rawElement) return q;
      // 2. CSS selector match
      if (q.selector && rawElement.matches?.(q.selector)) {
        try {
          if (rawElement.matches(q.selector)) return q;
        } catch (e) {}
      }
      // 3. ref_id match
      if (q.ref_id && rawElement.id && rawElement.id === q.ref_id) return q;
      // 4. name attribute match
      if (q.name && rawElement.name && rawElement.name === q.name) return q;
    }
    return null;
  }

  /** Returns the current detection cache entry, or null. */
  public getCache(): DetectionCacheEntry | null {
    return this._cache;
  }

  /** Clears the detection cache entirely. */
  public invalidateCache() {
    this._cache = null;
  }

  private enrichWithPageFeatures(): PageFeatures {
    const root = this.adapter.getRootNode();
    const doc = this.adapter.getGlobalContext().document;

    return {
      title: doc?.title || '',
      url: this.adapter.getGlobalContext().location?.href || '',
      has_stripe: !!root?.querySelectorAll('iframe[src*="stripe"]').length,
      has_recaptcha: !!root?.querySelectorAll('iframe[src*="recaptcha"], .g-recaptcha').length,
      has_hcaptcha: !!root?.querySelectorAll('iframe[src*="hcaptcha"]').length,
      forms_count: doc?.forms?.length || 0,
    };
  }

  private createEmptyResult(): DetectionResult {
    return {
      questions: [],
      form_id: 'empty',
      form_selector: '',
      is_likely_form: false,
      page_features: {
        title: '',
        url: '',
        has_stripe: false,
        has_recaptcha: false,
        has_hcaptcha: false,
        forms_count: 0,
      },
      metadata: {
        platform: 'universal',
        strategy: 'none',
        radius: 0,
        total_detected_fields: 0,
        filtered_by_plan: false,
        is_virtual_form: false,
        isolated_field: false,
      },
    };
  }

  private isElementSeed(node: CognilotNode): boolean {
    const tag = node.tagName.toLowerCase();
    const type = (node.getAttribute('type') || '').toLowerCase();
    const isInput = tag === 'input' && !['hidden', 'button', 'submit', 'image'].includes(type);
    const isOther =
      ['textarea', 'select'].includes(tag) ||
      node.getAttribute('contenteditable') === 'true' ||
      node.getAttribute('role') === 'textbox';
    return isInput || isOther;
  }

  private createSingleFieldResult(
    field: FieldDetectionResponse,
    node: CognilotNode
  ): DetectionResult {
    const pageFeatures = this.enrichWithPageFeatures();
    return {
      questions: [field],
      form_id: node.id || 'virtual_ref_' + Date.now().toString(36),
      form_selector: this.extractor.buildFallbackSelector(node),
      is_likely_form: false,
      page_features: pageFeatures,
      metadata: {
        platform: 'universal',
        strategy: 'single-field-fallback',
        radius: 0,
        total_detected_fields: 1,
        filtered_by_plan: false,
        is_virtual_form: true,
        isolated_field: true,
      },
    };
  }
}
