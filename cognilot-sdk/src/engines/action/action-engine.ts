import { CognilotSDK } from '../../index';
import { PlatformAdapter, CognilotNode } from '../../platforms/interface';
import { FieldRegistryEntry, isResolvableFieldType } from '../../contracts/field-registry-entry';
import { LabelExtractor } from '../detection/label-extractor';

/**
 * ActionEngine
 * Centralized entry point for all form-filling and interaction logic.
 * Encapsulates SuggestionEngine and DecisionEngine to provide a unified Facade.
 */
export class ActionEngine {
  private sdk: CognilotSDK;
  private platform: PlatformAdapter;
  private labelExtractor: LabelExtractor;

  constructor(sdk: CognilotSDK) {
    this.sdk = sdk;
    this.platform = sdk.platform;
    this.labelExtractor = new LabelExtractor(sdk.platform);
  }

  private _prefetchedScopes: Set<string> = new Set();

  /**
   * Universal trigger for field interaction (Focus/Click).
   * Automatically dispatches to Suggestion or Decision engine.
   *
   * NEW — Universal Suggestion architecture (Phase 3):
   * Before dispatching to any engine, the FieldRegistry is consulted.
   *
   * Resolution order:
   *   CASE A — Field is in registry + status 'resolved':
   *             Return the pre-computed resolution instantly (zero-latency ghost text).
   *             If the field belongs to a form, trigger background batch prefetch for
   *             other pending fields in that same form scope.
   *
   *   CASE B — Field is in registry + status 'pending':
   *             No local match was found at page load. Call the AI engine now.
   *             After the response, update the registry entry.
   *             If the field belongs to a form, trigger background batch prefetch.
   *
   *   CASE C — Field is NOT in registry (dynamic/SPA field):
   *             Fallback to the original on-demand detection + suggestion flow.
   *             Register the result so subsequent clicks are instant.
   */
  async handleTrigger(node: CognilotNode, options: any = {}) {
    if (!node) return { error: 'Node not found or invalid' };

    const type = (node.type || '').toLowerCase();
    const tagName = node.tagName.toLowerCase();
    const role = (node as any).getAttribute?.('role');
    const isCombobox =
      role === 'combobox' || (node as any).getAttribute?.('aria-autocomplete') !== null;

    if (!isResolvableFieldType(type)) {
      return { error: `Field is detection-only (${type}) and cannot be resolved` };
    }

    // ── Registry lookup ──────────────────────────────────────────────────────
    const entry = this.sdk.registry.findByNode(node.getRawNode());

    if (type === 'file') {
      const fileName = entry?.resolution?.value || 'cv_candidato.pdf';
      const fileApplied = await this._applyFileInput(node, { name: fileName });
      return {
        success: fileApplied,
        value: fileName,
        source: 'memory',
        type: 'discrete',
      };
    }

    let isChoice = ['radio', 'checkbox', 'select'].includes(type) || tagName === 'select';
    if (!isChoice && (isCombobox || type === 'autocomplete')) {
      const liveOptions = this.labelExtractor.collectChoiceOptions(node) || [];
      if (liveOptions.length > 0 || (entry?.options && entry.options.length > 0)) {
        isChoice = true;
        if (entry && (!entry.options || entry.options.length === 0)) {
          entry.options = liveOptions;
        }
      }
    }

    console.log(`[ActionEngine] Trigger: ${tagName}[type="${type}"] isChoice=${isChoice}`);

    if (entry && !options?.clipboard) {
      // If the field was resolved from an existing value, but is now empty,
      // it means the user cleared the field and wants a suggestion. We reset it to pending.
      const currentValue = node.value?.trim() ?? '';
      if (
        entry.status === 'resolved' &&
        entry.resolution?.source === 'existing_value' &&
        !currentValue
      ) {
        entry.status = 'pending';
        entry.resolution = null;
      }

      // ── CASE A: Already resolved locally ───────────────────────────────────
      if (entry.status === 'resolved') {
        console.log(
          `[ActionEngine] CASE A — Registry hit (${entry.resolution?.source}) for "${entry.text}"`
        );

        // For fields resolved from existing_value we skip ghost text entirely
        // (the field already has content; the user didn't ask for a suggestion).
        // For alias/profile matches we return the resolution for the ghost-text layer.
        const result =
          entry.resolution?.source !== 'existing_value'
            ? {
                success: true,
                value: entry.resolution?.value ?? '',
                options: entry.resolution?.options?.length
                  ? entry.resolution.options
                  : [entry.resolution?.value ?? ''],
                allChoices: entry.options || [],
                _allOptions: entry.options || [],
                source: entry.resolution?.source ?? 'memory',
                field: entry.metadata,
                type: isChoice ? 'discrete' : 'text',
              }
            : null;

        // Batch prefetch for pending siblings in the same form (fire & forget)
        if (entry.belongsToForm && entry.formScopeId) {
          this._prefetchFormScope(entry.formScopeId, node).catch((err) =>
            console.warn('[ActionEngine] Prefetch failed (non-critical):', err)
          );
        }

        return result;
      }

      // ── CASE B: In registry but pending (needs AI) ─────────────────────────
      if (entry.status === 'pending') {
        console.log(
          `[ActionEngine] CASE B — Registry hit (pending) for "${entry.text}". Calling AI...`
        );

        let aiResult: any;
        if (isChoice) {
          aiResult = await this.sdk.decision.handleTrigger(node);
          const allExtractedChoices =
            entry?.options && entry.options.length > 0
              ? entry.options
              : this.labelExtractor.collectChoiceOptions(node) || [];
          if (
            aiResult &&
            !aiResult.error &&
            (Array.isArray(aiResult.selected_values) || aiResult.value)
          ) {
            const resVal = aiResult.selected_values?.[0] || aiResult.value || '';
            aiResult = {
              success: true,
              value: resVal,
              options: aiResult.selected_values || [resVal],
              allChoices: allExtractedChoices,
              _allOptions: allExtractedChoices,
              selected_values: aiResult.selected_values || [resVal],
              selected_indices: aiResult.selected_indices,
              ghost_indices: aiResult.ghost_indices,
              source: aiResult.source || 'ai',
              type: 'discrete',
            };
          }
        } else {
          aiResult = await this.sdk.suggestion.handleTrigger(node, options);
        }

        // Update registry with the AI result
        if (aiResult && !aiResult.error) {
          if (isChoice && aiResult.allChoices && aiResult.allChoices.length > 0) {
            entry.options = aiResult.allChoices;
          }
          const resVal = isChoice
            ? aiResult.selected_values?.[0] || aiResult.value || 'Selected'
            : (aiResult.value ?? null);
          this.sdk.registry.updateResolution(entry.id, {
            value: resVal,
            options: [resVal].filter(Boolean),
            source: 'ai',
          });
        } else {
          this.sdk.registry.markFailed(entry.id);
        }

        // Batch prefetch for pending siblings in the same form (fire & forget)
        if (entry.belongsToForm && entry.formScopeId) {
          this._prefetchFormScope(entry.formScopeId, node, options).catch((err) =>
            console.warn('[ActionEngine] Prefetch failed (non-critical):', err)
          );
        }

        return aiResult;
      }
    }

    // ── CASE C: Not in registry (or forced via clipboard) ────────────────────
    console.log(`[ActionEngine] Running AI trigger (options passed)...`);
    let aiResult: any = await this._handleUnregisteredField(node, isChoice, options);
    if (isChoice && aiResult && !aiResult.error && Array.isArray(aiResult.selected_values)) {
      aiResult = {
        success: true,
        value: aiResult.selected_values[0] || '',
        options: aiResult.selected_values || [],
        selected_values: aiResult.selected_values,
        selected_indices: aiResult.selected_indices,
        ghost_indices: aiResult.ghost_indices,
        source: aiResult.source || 'ai',
        type: 'discrete',
      };
    }

    if (entry && entry.belongsToForm && entry.formScopeId) {
      this._prefetchFormScope(entry.formScopeId, node, options).catch((err) =>
        console.warn('[ActionEngine] Prefetch failed (non-critical):', err)
      );
    }

    return aiResult;
  }

  /**
   * Fallback handler for fields that were not captured during the proactive page scan.
   * Mirrors the old handleTrigger() flow: detect on-demand, then suggest/decide.
   * Registers the resolved field in the FieldRegistry for future instant access.
   */
  private async _handleUnregisteredField(node: CognilotNode, isChoice: boolean, options: any = {}) {
    let result: any;
    if (isChoice) {
      result = await this.sdk.decision.handleTrigger(node);
      const allExtractedChoices = this.labelExtractor.collectChoiceOptions(node) || [];
      if (result && !result.error && Array.isArray(result.selected_values)) {
        result = {
          success: true,
          value: result.selected_values[0] || '',
          options: result.selected_values || [],
          allChoices: allExtractedChoices,
          _allOptions: allExtractedChoices,
          selected_values: result.selected_values,
          selected_indices: result.selected_indices,
          ghost_indices: result.ghost_indices,
          source: result.source || 'ai',
          type: 'discrete',
        };
      }
    } else {
      result = await this.sdk.suggestion.handleTrigger(node, options);
    }

    // Opportunistically register so the next click is instant
    if (result && !result.error) {
      const metadata = this.sdk.detection.getFieldMetadata(node);
      const selector = this.labelExtractor.buildFallbackSelector(node) ?? '';
      const stableId = node.id || `Cognilot-dynamic-${Date.now()}`;

      const dynamicEntry: FieldRegistryEntry = {
        id: stableId,
        type: node.type || node.tagName.toLowerCase(),
        tagName: node.tagName,
        name: node.name || '',
        text: metadata?.label || '',
        placeholder: node.getAttribute('placeholder') || '',
        required: metadata?.required || false,
        options: isChoice ? result.allChoices || [] : [],
        ref_id: '',
        section_ref_id: '',
        metadata: metadata || ({} as any),
        selector,
        node,
        belongsToForm: false,
        formScopeId: null,
        resolution: {
          value: result.value ?? null,
          options: result.options ?? (result.value ? [result.value] : []),
          source: 'ai',
        },
        status: 'resolved',
      };

      this.sdk.registry.register(dynamicEntry);
    }

    return result;
  }

  /**
   * Clears prefetched scopes tracking and persistent caches to allow
   * full re-resolution when the user switches context (e.g. toggling clipboard/CV).
   */
  async invalidatePrefetchCache(): Promise<void> {
    this._prefetchedScopes.clear();
    await this.sdk.suggestion?.clearCache?.();
    await this.sdk.decision?.clearCache?.();
    console.log(
      '[ActionEngine] 🔄 Prefetch cache invalidated across suggestion and decision engines.'
    );
  }

  /**
   * Public prefetch wrapper for external triggers (like context toggles).
   */
  async prefetchFormScope(
    formScopeId: string,
    activeNode: CognilotNode,
    options: any = {}
  ): Promise<void> {
    return this._prefetchFormScope(formScopeId, activeNode, options);
  }

  /**
   * Identifies pending siblings in a form scope and triggers a batch prefetch.
   * Only fires once per form scope per page load (guarded by _prefetchedScopes).
   * Only includes fields with status === 'pending' — already-resolved fields are skipped.
   *
   * @param formScopeId  - The stable ID of the form scope.
   * @param activeNode   - The field the user just clicked (excluded from the batch).
   */
  private async _prefetchFormScope(
    formScopeId: string,
    activeNode: CognilotNode,
    options: any = {}
  ) {
    // Deduplicate: only prefetch each form scope once per page load
    if (this._prefetchedScopes.has(formScopeId)) return;
    this._prefetchedScopes.add(formScopeId);

    const pendingFields = this.sdk.registry
      .getPendingFieldsByFormScope(formScopeId)
      .filter((f) => f.node.getRawNode() !== activeNode.getRawNode());

    if (pendingFields.length === 0) {
      console.log(`[ActionEngine] No pending fields to prefetch in scope "${formScopeId}".`);
      return;
    }

    console.log(
      `[ActionEngine] Prefetching ${pendingFields.length} pending field(s) in scope "${formScopeId}"...`
    );

    // Separate by engine type (resolvable only)
    const choiceFields = pendingFields.filter((f) => {
      const type = (f.type || '').toLowerCase();
      const role = (f.node as any)?.getAttribute?.('role');
      const isCombobox =
        role === 'combobox' || (f.node as any)?.getAttribute?.('aria-autocomplete') !== null;
      const isSelect = ['radio', 'checkbox', 'select'].includes(type);
      const isAutocompleteWithChoices =
        (type === 'autocomplete' || isCombobox) && Array.isArray(f.options) && f.options.length > 0;
      return isSelect || isAutocompleteWithChoices;
    });

    const textFields = pendingFields
      .filter((f) => {
        const type = (f.type || '').toLowerCase();
        const role = (f.node as any)?.getAttribute?.('role');
        const isCombobox =
          role === 'combobox' || (f.node as any)?.getAttribute?.('aria-autocomplete') !== null;
        const isSelect = ['radio', 'checkbox', 'select'].includes(type);
        const isAutocompleteWithChoices =
          (type === 'autocomplete' || isCombobox) &&
          Array.isArray(f.options) &&
          f.options.length > 0;
        if (isSelect || isAutocompleteWithChoices) return false;
        return isResolvableFieldType(type) && f.resolvable !== false;
      })
      .map((f) => ({ node: f.node, metadata: f.metadata }));

    // Fire batch requests (fire & forget from the caller's perspective)
    const batchPromises: Promise<any>[] = [];

    try {
      if (textFields.length > 0) {
        batchPromises.push(
          this.sdk.suggestion.prefetchBatch(textFields as any, options).then(() => {
            // After batch resolves, mark registry entries as resolved
            this._syncBatchResultsToRegistry(
              pendingFields.filter(
                (f) =>
                  !choiceFields.some((cf) => cf.id === f.id) &&
                  isResolvableFieldType(f.type) &&
                  f.resolvable !== false
              )
            );
          })
        );
      }

      if (choiceFields.length > 0) {
        batchPromises.push(
          this.sdk.decision.prefetchBatch(choiceFields as any).then(() => {
            this._syncDecisionBatchResultsToRegistry(choiceFields);
          })
        );
      }

      const settled = await Promise.allSettled(batchPromises);
      const hasErrors = settled.some((r) => r.status === 'rejected');
      if (hasErrors) {
        // Allow retry on next trigger if any batch failed
        this._prefetchedScopes.delete(formScopeId);
      }
    } catch (err) {
      this._prefetchedScopes.delete(formScopeId);
      console.warn('[ActionEngine] Prefetch batch error:', err);
    } finally {
      // Notify listeners (e.g. Chrome Extension Content Script) that batch prefetching has finished
      if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cognilot-prefetch-complete', {
            detail: { formScopeId },
          })
        );
      }
    }
  }

  /**
   * After a batch prefetch completes, check the SuggestionEngine's request cache
   * and update the FieldRegistry for any fields that were resolved.
   * This ensures the registry stays in sync with the suggestion cache.
   */
  private _syncBatchResultsToRegistry(pendingEntries: FieldRegistryEntry[]) {
    const suggestionCache = (this.sdk.suggestion as any).requestCache as Map<string, any>;
    if (!suggestionCache) return;

    const globalContext = this.platform.getGlobalContext();
    const domain = globalContext?.location?.hostname || 'unknown';

    for (const entry of pendingEntries) {
      if (entry.status !== 'pending') continue;
      const rawNode = entry.node?.getRawNode?.() as any;
      const id = entry.id;
      const attrName =
        rawNode && typeof rawNode.getAttribute === 'function' ? rawNode.getAttribute('name') : null;
      const name = entry.name || attrName;
      const text = entry.text || entry.metadata?.label;

      const fieldIdentifier = (this.sdk.suggestion as any)?.getUniqueFieldIdentifier?.(
        entry.node,
        entry.metadata
      );
      const isArrayName = (n: string) => /\[\]|\[\d*\]/.test(n);
      const keysToTry = [
        fieldIdentifier ? `${domain}::${fieldIdentifier}` : null,
        fieldIdentifier || null,
        id ? `${domain}::${id}` : null,
        text ? `${domain}::${text}` : null,
        name && text && isArrayName(name) ? `${domain}::${name}::${text}` : null,
        name && !isArrayName(name) ? `${domain}::${name}` : null,
        id || null,
        text || null,
        name && text && isArrayName(name) ? `${name}::${text}` : null,
        name && !isArrayName(name) ? name : null,
      ].filter(Boolean) as string[];

      let cached: any = null;
      for (const key of keysToTry) {
        if (suggestionCache.has(key)) {
          cached = suggestionCache.get(key);
          break;
        }
      }

      if (cached && cached.value) {
        console.log(
          `[ActionEngine] ✅ Synced prefetch result to FieldRegistry for "${text || entry.text}": "${cached.value}"`
        );
        this.sdk.registry.updateResolution(entry.id, {
          value: cached.value,
          options: cached.options ?? [cached.value],
          source: cached.source || 'ai',
        });
      }
    }
  }

  /**
   * After a batch prefetch completes, check the DecisionEngine's storage cache
   * and update the FieldRegistry for any choice fields that were resolved.
   */
  private async _syncDecisionBatchResultsToRegistry(pendingEntries: FieldRegistryEntry[]) {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return;

    try {
      const cached = await storage.get('Cognilot_decisions_cache');
      const cachedDecisions = cached?.Cognilot_decisions_cache || cached || {};
      const globalContext = this.platform.getGlobalContext();
      const domain = (globalContext?.location?.hostname || '').toLowerCase();

      for (const entry of pendingEntries) {
        if (entry.status !== 'pending') continue;
        const rawNode =
          typeof (entry.node as any)?.getRawNode === 'function'
            ? (entry.node as any).getRawNode()
            : (entry.node as any);
        const rawId = rawNode?.id;
        const attrName =
          rawNode && typeof rawNode.getAttribute === 'function'
            ? rawNode.getAttribute('name')
            : null;
        const name = entry.name || attrName;
        const cleanName = name
          ? name.replace(/\[|\]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
          : null;
        const strippedCognilotId = entry.id
          ? entry.id.replace(/^Cognilot-field-/i, '').replace(/-/g, '_')
          : null;
        const text = entry.text || entry.metadata?.label;

        const candidateKeys = [
          entry.id,
          rawId,
          strippedCognilotId,
          name,
          cleanName,
          text,
          entry.selector,
          domain && entry.id ? `${domain}::${entry.id}` : null,
          domain && text ? `${domain}::${text}` : null,
          domain && (name || cleanName) ? `${domain}::${name || cleanName}` : null,
        ].filter(Boolean) as string[];

        let decision: any = null;
        for (const key of candidateKeys) {
          if (cachedDecisions[key]) {
            decision = cachedDecisions[key];
            break;
          }
        }

        if (decision) {
          const hasSelection =
            Array.isArray(decision.selected_values) && decision.selected_values.length > 0;
          if (!hasSelection) continue;

          const cachedOptions = decision.allChoices || decision.options || [];
          if (cachedOptions.length > 0 && (!entry.options || entry.options.length === 0)) {
            entry.options = cachedOptions;
          }
          console.log(
            `[ActionEngine] ✅ Synced decision prefetch result to FieldRegistry for "${text || entry.text}":`,
            decision.selected_values
          );
          this.sdk.registry.updateResolution(entry.id, {
            value: decision.selected_values[0],
            options: [decision.selected_values[0]],
            source: 'ai',
          });
        }
      }
    } catch (e) {
      console.warn('[ActionEngine] Failed to sync decision batch to registry:', e);
    }
  }

  /**
   * Orchestrates the execution of a batch of fields.
   * Handles prefetching and parallel processing for different field types.
   */
  async executeBatch(questions: any[], onProgress?: (data: any) => void, options: any = {}) {
    if (!questions || questions.length === 0) {
      onProgress?.({ status: 'complete', solved: 0, failed: 0, total: 0 });
      return { success: true, results: [] };
    }

    onProgress?.({ status: 'batch_start', total: questions.length });

    // 1. Ensure nodes are active (re-wrap if they came from serialised DTOs or missing node property)
    questions.forEach((q) => {
      let node = q.node;
      const isInvalidNode = !node || typeof node.setValue !== 'function';
      if (isInvalidNode) {
        // A. Lookup in FieldRegistry by ID, selector, name or text
        let registryEntry =
          (q.id && typeof this.sdk.registry?.findById === 'function'
            ? this.sdk.registry.findById(q.id)
            : null) ||
          (q.selector && typeof this.sdk.registry?.findBySelector === 'function'
            ? this.sdk.registry.findBySelector(q.selector)
            : null);

        if (!registryEntry && typeof this.sdk.registry?.getAll === 'function') {
          const allEntries = this.sdk.registry.getAll();
          registryEntry =
            allEntries.find(
              (e: any) =>
                (q.id && e.id === q.id) ||
                (q.selector && e.selector === q.selector) ||
                (q.name && e.name === q.name) ||
                (q.text && (e.text === q.text || e.metadata?.label === q.text))
            ) || null;
        }

        if (registryEntry?.node) {
          node = registryEntry.node;
        } else if (typeof document !== 'undefined') {
          // B. Lookup in DOM via selector, ID, or name
          let el: HTMLElement | null = null;
          if (q.selector) {
            try {
              el = document.querySelector(q.selector);
            } catch (e) {}
          }
          if (!el && q.id) {
            el = document.getElementById(q.id);
          }
          if (!el && q.name) {
            try {
              el = document.querySelector(`[name="${CSS.escape(q.name)}"]`);
            } catch (e) {}
          }
          if (el) {
            node = this.sdk.wrap(el);
          }
        }
      }

      q.node = node;

      // Sync metadata and options if missing
      if (q.id && typeof this.sdk.registry?.findById === 'function') {
        const reg = this.sdk.registry.findById(q.id);
        if (reg) {
          if (!q.metadata) q.metadata = reg.metadata;
          if (!q.options || q.options.length === 0) q.options = reg.options;
          if (!q.type && reg.type) q.type = reg.type;
        }
      }
    });

    console.log(`[ActionEngine] Orchestrating batch: ${questions.length} fields.`);

    // 2. Prefetch non-cached fields in single batch API calls
    const textFields = questions.filter((q) => {
      const type = (q.type || '').toLowerCase();
      const tagName = (q.tagName || '').toLowerCase();
      const role = (q.node as any)?.getAttribute?.('role');
      const isCombobox =
        role === 'combobox' || (q.node as any)?.getAttribute?.('aria-autocomplete') !== null;
      return (
        !['radio', 'checkbox', 'select', 'autocomplete'].includes(type) &&
        !isCombobox &&
        tagName !== 'select' &&
        isResolvableFieldType(type) &&
        q.status !== 'detected' &&
        q.resolvable !== false
      );
    });
    const choiceFields = questions.filter((q) => {
      const type = (q.type || '').toLowerCase();
      const tagName = (q.tagName || '').toLowerCase();
      return (
        (['radio', 'checkbox', 'select'].includes(type) || tagName === 'select') &&
        isResolvableFieldType(type) &&
        q.status !== 'detected' &&
        q.resolvable !== false
      );
    });

    if (textFields.length > 0 && typeof this.sdk.suggestion?.prefetchBatch === 'function') {
      await this.sdk.suggestion.prefetchBatch(textFields as any, options);
    }
    if (choiceFields.length > 0 && typeof this.sdk.decision?.prefetchBatch === 'function') {
      await this.sdk.decision.prefetchBatch(choiceFields as any);
    }

    const results: any[] = [];
    let solved = 0;
    let failed = 0;

    // Process sequentially for better UI feedback and to avoid race conditions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const type = (q.type || '').toLowerCase();

      // Skip non-resolvable fields (search, autocomplete, file, etc.)
      if (!isResolvableFieldType(type) || q.status === 'detected' || q.resolvable === false) {
        console.log(
          `[ActionEngine] Skipping non-resolvable field ${i + 1}/${questions.length}: ${q.text} (${type})`
        );
        solved++;
        results.push({ id: q.id, success: true, answer: 'Omitido (Solo detección)' });
        onProgress?.({
          status: 'step',
          index: i + 1,
          total: questions.length,
          id: q.id,
          success: true,
          answer: 'Omitido (Solo detección)',
        });
        continue;
      }

      try {
        console.log(`[ActionEngine] Solving field ${i + 1}/${questions.length}: ${q.text}`);
        const result: any = await this.handleTrigger(q.node, options);

        let success = false;
        let answerValue = '';

        if (result && !result.error) {
          const tagName = (q.tagName || '').toLowerCase();
          const isChoice = ['radio', 'checkbox', 'select'].includes(type) || tagName === 'select';

          if (type === 'file') {
            success =
              result.success ??
              (await this._applyFileInput(q.node, {
                name: typeof result.value === 'string' ? result.value : 'cv_candidato.pdf',
              }));
            answerValue = typeof result.value === 'string' ? result.value : 'CV Adjuntado';
          } else if (isChoice) {
            success = await this._applyDecision(q.node, result);
            answerValue = result.selected_values?.[0] || 'Selected';
          } else if (result.value) {
            if (result.type === 'example') {
              console.log(
                `[ActionEngine] Skipping batch autofill for field "${q.text}" because suggestion is an example.`
              );
              success = true;
              answerValue = 'Omitido (Ejemplo)';
            } else {
              success = await this._applySuggestion(q.node, result.value);
              answerValue = result.value;
            }
          }
        }

        if (success) solved++;
        else failed++;

        const fieldRes = { id: q.id, success, answer: answerValue };
        results.push(fieldRes);

        // Report step to UI
        onProgress?.({
          status: 'step',
          index: i + 1,
          total: questions.length,
          id: q.id,
          success,
          answer: answerValue,
        });
      } catch (e) {
        console.error(`[ActionEngine] Critical error on field ${q.id}:`, e);
        failed++;
        results.push({ id: q.id, success: false, error: String(e) });
        onProgress?.({
          status: 'step',
          index: i + 1,
          total: questions.length,
          id: q.id,
          success: false,
        });
      }
    }

    onProgress?.({
      status: 'complete',
      solved,
      failed,
      total: questions.length,
    });

    return {
      success: true,
      results,
      summary: { solved, total: questions.length },
    };
  }

  /**
   * Solves an entire form by orchestrating discovery and batch execution.
   */
  async solveForm(formNode: CognilotNode) {
    console.log(`[ActionEngine] Solving form...`);

    // 1. Ensure we have the latest detection for this scope
    let detection = await this.sdk.detection.detect(formNode);

    if (!detection.questions || detection.questions.length === 0) {
      return { success: false, message: 'No fields detected to solve.' };
    }

    // 2. Delegate to batch execution
    return this.executeBatch(detection.questions);
  }

  /**
   * Refines (improves) the current text of a field.
   */
  async refineText(node: CognilotNode, currentText: string) {
    return this.sdk.suggestion.handleRefine(node, currentText);
  }

  private async _applySuggestion(node: CognilotNode, value: string) {
    if (!node) {
      console.warn('[ActionEngine] _applySuggestion called with null node');
      return false;
    }

    let cleanValue = value;
    const rawType = (node.type || (node.getAttribute?.('type') ?? '')).toLowerCase();

    // 1. Numeric validation, sanitization & clamping
    if (rawType === 'number') {
      const sanitized = String(cleanValue).replace(/[^0-9.-]/g, '');
      if (sanitized) {
        let numVal = parseFloat(sanitized);
        if (!isNaN(numVal)) {
          const minAttr = node.getAttribute?.('min');
          const maxAttr = node.getAttribute?.('max');
          if (minAttr !== null && minAttr !== undefined && minAttr !== '') {
            const minNum = parseFloat(minAttr);
            if (!isNaN(minNum)) numVal = Math.max(minNum, numVal);
          }
          if (maxAttr !== null && maxAttr !== undefined && maxAttr !== '') {
            const maxNum = parseFloat(maxAttr);
            if (!isNaN(maxNum)) numVal = Math.min(maxNum, numVal);
          }
          cleanValue = String(numVal);
        } else {
          cleanValue = sanitized;
        }
      } else {
        cleanValue = sanitized;
      }
    }

    // 2. Maxlength defensive truncation
    const maxlengthAttr = node.getAttribute?.('maxlength');
    if (maxlengthAttr) {
      const maxLen = parseInt(maxlengthAttr, 10);
      if (!isNaN(maxLen) && maxLen > 0 && cleanValue.length > maxLen) {
        cleanValue = cleanValue.slice(0, maxLen);
      }
    }

    console.log(`[ActionEngine] Applying text: "${cleanValue}" to ${node.tagName}`);
    try {
      await node.setValue(cleanValue);
      const raw = node.getRawNode<HTMLElement>();
      if (raw && typeof raw.dispatchEvent === 'function') {
        raw.dispatchEvent(new Event('input', { bubbles: true }));
        raw.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    } catch (e) {
      console.error('[ActionEngine] Failed to apply suggestion:', e);
      return false;
    }
  }

  private async _applyFileInput(
    node: CognilotNode,
    fileData?: { name?: string; type?: string; content?: Blob | string }
  ): Promise<boolean> {
    const raw = node.getRawNode<HTMLInputElement>();
    if (!raw) return false;

    try {
      if (typeof DataTransfer !== 'undefined') {
        const dt = new DataTransfer();
        let fileName = (fileData?.name || 'cv_candidato.pdf').trim();

        // Sanitize fileName: ensure it contains an extension matching accept attribute or fallback to .pdf
        if (!fileName.includes('.')) {
          const acceptAttr = raw.getAttribute?.('accept');
          if (acceptAttr) {
            const firstExt = acceptAttr.split(',')[0].trim();
            fileName += firstExt.startsWith('.') ? firstExt : `.${firstExt}`;
          } else {
            fileName += '.pdf';
          }
        }

        // Determine MIME type
        let fileType = fileData?.type;
        if (!fileType) {
          const lower = fileName.toLowerCase();
          if (lower.endsWith('.pdf')) {
            fileType = 'application/pdf';
          } else if (lower.endsWith('.docx')) {
            fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          } else if (lower.endsWith('.doc')) {
            fileType = 'application/msword';
          } else if (lower.endsWith('.png')) {
            fileType = 'image/png';
          } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
            fileType = 'image/jpeg';
          } else {
            fileType = 'application/pdf';
          }
        }

        const blobContent =
          fileData?.content instanceof Blob
            ? fileData.content
            : new Blob(
                [
                  typeof fileData?.content === 'string'
                    ? fileData.content
                    : '%PDF-1.4 simulated CV document',
                ],
                { type: fileType }
              );

        const file = new File([blobContent], fileName, { type: fileType });
        dt.items.add(file);
        raw.files = dt.files;

        raw.dispatchEvent?.(new Event('input', { bubbles: true }));
        raw.dispatchEvent?.(new Event('change', { bubbles: true }));
        console.log(
          `[ActionEngine] ✅ Successfully applied file "${fileName}" to input[type="file"]`
        );
        return true;
      }
    } catch (err) {
      console.warn('[ActionEngine] Failed to apply file to input:', err);
    }
    return false;
  }

  private async _applyDecision(node: CognilotNode, decision: any) {
    const type = node.type || '';
    const tagName = node.tagName.toLowerCase();

    console.log(`[ActionEngine] Applying decision to ${tagName}[type="${type}"]:`, decision);

    try {
      if (type === 'radio' || type === 'checkbox') {
        const resolvedVals: string[] =
          Array.isArray(decision.selected_values) && decision.selected_values.length > 0
            ? decision.selected_values.map(String)
            : Array.isArray(decision.options) && decision.options.length > 0
              ? decision.options.map(String)
              : [String(decision.value)];

        const rawEl = node.getRawNode<HTMLInputElement>();
        const inputName = rawEl.name;
        const inputType = rawEl.type;
        const doc = rawEl.ownerDocument || document;

        let groupInputs: HTMLInputElement[] = [];
        if (inputName) {
          groupInputs = Array.from(
            doc.querySelectorAll<HTMLInputElement>(
              `input[type="${inputType}"][name="${CSS.escape(inputName)}"]`
            )
          );
        }

        if (groupInputs.length <= 1) {
          const parentGroup = rawEl.closest(
            'fieldset, [role="group"], .group, [data-controller*="choice"]'
          );
          if (parentGroup) {
            groupInputs = Array.from(
              parentGroup.querySelectorAll<HTMLInputElement>(`input[type="${inputType}"]`)
            );
          }
        }

        if (groupInputs.length === 0) {
          groupInputs = [rawEl];
        }

        let clickedAny = false;
        groupInputs.forEach((input, index) => {
          const inputVal = (input.value || '').toLowerCase().trim();
          const inputId = (input.id || '').toLowerCase().trim();

          let isMatch = resolvedVals.some((v) => String(v).toLowerCase().trim() === inputVal);

          const entry = this.sdk.registry.findByNode(rawEl);
          if (!isMatch && entry && entry.options && Array.isArray(entry.options)) {
            const opt = entry.options.find(
              (o: any) =>
                String(o.value || '')
                  .toLowerCase()
                  .trim() === inputVal ||
                (inputId &&
                  String(o.value || '')
                    .toLowerCase()
                    .trim() === inputId) ||
                o.index === index
            );
            if (opt) {
              isMatch = resolvedVals.some((v) => {
                const valStr = String(v).toLowerCase().trim();
                const optText = String(opt.text || '')
                  .toLowerCase()
                  .trim();
                const optVal = String(opt.value || '')
                  .toLowerCase()
                  .trim();
                return (
                  valStr === optText ||
                  valStr === optVal ||
                  valStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
                    optText.normalize('NFD').replace(/[\u0300-\u036f]/g, '') ||
                  valStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
                    optVal.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                );
              });
            }
          }

          if (!isMatch) {
            const labelEl =
              (input.closest('label') as HTMLElement) ??
              (input.id ? doc.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null) ??
              input.parentElement;
            if (labelEl) {
              const labelText = (labelEl.textContent || '').toLowerCase().trim();
              isMatch = resolvedVals.some((v) => {
                const valStr = String(v).toLowerCase().trim();
                return (
                  valStr === labelText ||
                  valStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
                    labelText.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                );
              });
            }
          }

          const shouldClick =
            inputType === 'checkbox' ? isMatch !== input.checked : isMatch && !input.checked;

          if (shouldClick) {
            input.click();
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            clickedAny = true;
          }
        });

        return clickedAny;
      } else if (tagName === 'select') {
        const selectEl = node.getRawNode<HTMLSelectElement>();
        const resolvedVals: string[] =
          Array.isArray(decision.selected_values) && decision.selected_values.length > 0
            ? decision.selected_values.map(String)
            : Array.isArray(decision.options) && decision.options.length > 0
              ? decision.options.map(String)
              : [String(decision.value)];

        let matchVal = '';
        for (const option of Array.from(selectEl.options)) {
          const optVal = option.value.toLowerCase().trim();
          const optText = option.text.toLowerCase().trim();
          const matched = resolvedVals.some((v) => {
            const valStr = String(v).toLowerCase().trim();
            return (
              valStr === optVal ||
              valStr === optText ||
              valStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
                optVal.normalize('NFD').replace(/[\u0300-\u036f]/g, '') ||
              valStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
                optText.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            );
          });
          if (matched) {
            matchVal = option.value;
            break;
          }
        }

        if (matchVal) {
          selectEl.value = matchVal;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        } else if (resolvedVals[0]) {
          selectEl.value = resolvedVals[0];
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      } else {
        // Autocomplete / Combobox support: click matching option in live portal if mounted, or update input value
        const rawEl = node.getRawNode<HTMLInputElement>();
        const resolvedVals: string[] =
          Array.isArray(decision.selected_values) && decision.selected_values.length > 0
            ? decision.selected_values.map(String)
            : Array.isArray(decision.options) && decision.options.length > 0
              ? decision.options.map(String)
              : [String(decision.value)];
        const targetVal = (resolvedVals[0] || '').trim();

        if (targetVal) {
          const doc = rawEl.ownerDocument || document;
          const inputId = rawEl.id;
          const controlsId = rawEl.getAttribute('aria-controls');
          const listboxEl =
            (controlsId ? doc.getElementById(controlsId) : null) ||
            (inputId
              ? doc.getElementById(`${inputId}-listbox`) || doc.getElementById(`${inputId}_list`)
              : null) ||
            doc.querySelector(
              '.MuiAutocomplete-popper [role="listbox"], .p-autocomplete-panel [role="listbox"], .p-autocomplete-panel, .ant-select-dropdown, [data-radix-popper-content-wrapper] [role="listbox"], [role="listbox"]'
            );

          let optionClicked = false;
          if (listboxEl) {
            const options = Array.from(
              listboxEl.querySelectorAll(
                '[role="option"], .MuiAutocomplete-option, .p-autocomplete-item, li[role="option"]'
              )
            );
            for (const opt of options) {
              const optText = (opt.textContent || '').trim().toLowerCase();
              const optVal = (
                (opt as HTMLElement).getAttribute('data-value') ||
                (opt as HTMLElement).getAttribute('data-val') ||
                opt.getAttribute('value') ||
                ''
              )
                .trim()
                .toLowerCase();

              if (
                targetVal.toLowerCase() === optText ||
                targetVal.toLowerCase() === optVal ||
                optText.includes(targetVal.toLowerCase())
              ) {
                (opt as HTMLElement).click();
                optionClicked = true;
                break;
              }
            }
          }

          if (!optionClicked) {
            rawEl.value = targetVal;
            rawEl.dispatchEvent(new Event('input', { bubbles: true }));
            rawEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return true;
        }
      }
      return true;
    } catch (e) {
      console.error('[ActionEngine] Failed to apply decision:', e);
      return false;
    }
  }
}
