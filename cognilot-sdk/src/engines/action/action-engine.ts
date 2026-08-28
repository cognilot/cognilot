import { CognilotSDK } from '../../index';
import { PlatformAdapter, CognilotNode } from '../../platforms/interface';
import { FieldRegistryEntry, isResolvableFieldType } from '../../contracts/field-registry-entry';

/**
 * ActionEngine
 * Centralized entry point for all form-filling and interaction logic.
 * Encapsulates SuggestionEngine and DecisionEngine to provide a unified Facade.
 */
export class ActionEngine {
  private sdk: CognilotSDK;
  private platform: PlatformAdapter;

  constructor(sdk: CognilotSDK) {
    this.sdk = sdk;
    this.platform = sdk.platform;
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
    const isCombobox = (node as any).getAttribute?.('role') === 'combobox';

    if (!isResolvableFieldType(type) || isCombobox) {
      return { error: `Field is detection-only (${type || 'combobox'}) and cannot be resolved` };
    }

    const isChoice = ['radio', 'checkbox', 'select'].includes(type) || tagName === 'select';

    console.log(`[ActionEngine] Trigger: ${tagName}[type="${type}"] isChoice=${isChoice}`);

    // ── Registry lookup ──────────────────────────────────────────────────────
    const entry = this.sdk.registry.findByNode(node.getRawNode());

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
                options: entry.resolution?.options ?? [],
                source: entry.resolution?.source ?? 'memory',
                field: entry.metadata,
                type: 'discrete',
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

        let aiResult;
        if (isChoice) {
          aiResult = await this.sdk.decision.handleTrigger(node);
        } else {
          aiResult = await this.sdk.suggestion.handleTrigger(node, options);
        }

        // Update registry with the AI result
        if (aiResult && !aiResult.error) {
          this.sdk.registry.updateResolution(entry.id, {
            value: isChoice
              ? aiResult.selected_values?.[0] || 'Selected'
              : (aiResult.value ?? null),
            options: isChoice
              ? aiResult.selected_values || []
              : (aiResult.options ?? (aiResult.value ? [aiResult.value] : [])),
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
    const aiResult = await this._handleUnregisteredField(node, isChoice, options);

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
    let result;
    if (isChoice) {
      result = await this.sdk.decision.handleTrigger(node);
    } else {
      result = await this.sdk.suggestion.handleTrigger(node, options);
    }

    // Opportunistically register so the next click is instant
    if (result && !result.error) {
      const metadata = this.sdk.detection.getFieldMetadata(node);
      const selector = (this.sdk.detection as any).extractor?.buildFallbackSelector(node) ?? '';
      const stableId = node.id || `Cognilot-dynamic-${Date.now()}`;

      const dynamicEntry: FieldRegistryEntry = {
        id: stableId,
        type: node.type || node.tagName.toLowerCase(),
        tagName: node.tagName,
        name: node.name || '',
        text: metadata?.label || '',
        placeholder: node.getAttribute('placeholder') || '',
        required: metadata?.required || false,
        options: [],
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
    const textFields = pendingFields
      .filter(
        (f) =>
          !['radio', 'checkbox', 'select'].includes(f.type) &&
          isResolvableFieldType(f.type) &&
          f.resolvable !== false
      )
      .map((f) => ({ node: f.node, metadata: f.metadata }));

    const choiceFields = pendingFields.filter((f) =>
      ['radio', 'checkbox', 'select'].includes(f.type)
    );

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
                  !['radio', 'checkbox', 'select'].includes(f.type) &&
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
            this._syncDecisionBatchResultsToRegistry(
              pendingFields.filter((f) => ['radio', 'checkbox', 'select'].includes(f.type))
            );
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

      const keysToTry = [
        id ? `${domain}::${id}` : null,
        name ? `${domain}::${name}` : null,
        text ? `${domain}::${text}` : null,
        id || null,
        name || null,
        text || null,
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

      for (const entry of pendingEntries) {
        if (entry.status !== 'pending') continue;
        const rawNode = entry.node?.getRawNode?.() as any;
        const attrName =
          rawNode && typeof rawNode.getAttribute === 'function'
            ? rawNode.getAttribute('name')
            : null;
        const name = entry.name || attrName;
        const text = entry.text || entry.metadata?.label;

        const candidateKeys = [entry.id, name, text, entry.selector].filter(Boolean) as string[];

        let decision: any = null;
        for (const key of candidateKeys) {
          if (cachedDecisions[key]) {
            decision = cachedDecisions[key];
            break;
          }
        }

        if (decision) {
          console.log(
            `[ActionEngine] ✅ Synced decision prefetch result to FieldRegistry for "${text || entry.text}":`,
            decision.selected_values
          );
          this.sdk.registry.updateResolution(entry.id, {
            value: decision.selected_values?.[0] || 'Selected',
            options: decision.selected_values || [],
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
      return (
        !['radio', 'checkbox', 'select'].includes(type) &&
        tagName !== 'select' &&
        isResolvableFieldType(type)
      );
    });
    const choiceFields = questions.filter((q) => {
      const type = (q.type || '').toLowerCase();
      const tagName = (q.tagName || '').toLowerCase();
      return ['radio', 'checkbox', 'select'].includes(type) || tagName === 'select';
    });

    if (textFields.length > 0) {
      await this.sdk.suggestion.prefetchBatch(textFields as any, options);
    }
    if (choiceFields.length > 0) {
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

          if (isChoice) {
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
    console.log(`[ActionEngine] Applying text: "${value}" to ${node.tagName}`);
    try {
      await node.setValue(value);
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
      }
      return true;
    } catch (e) {
      console.error('[ActionEngine] Failed to apply decision:', e);
      return false;
    }
  }
}
