import { CognilotSDK } from '../../index';
import { PlatformAdapter, CognilotNode } from '../../platforms/interface';
import { FieldRegistryEntry } from '../../contracts/field-registry-entry';

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
  async handleTrigger(node: CognilotNode) {
    if (!node) return { error: 'Node not found or invalid' };

    const type = (node.type || '').toLowerCase();
    const tagName = node.tagName.toLowerCase();
    const isChoice = ['radio', 'checkbox', 'file', 'select'].includes(type) || tagName === 'select';

    console.log(`[ActionEngine] Trigger: ${tagName}[type="${type}"] isChoice=${isChoice}`);

    // ── Registry lookup ──────────────────────────────────────────────────────
    const entry = this.sdk.registry.findByNode(node.getRawNode());

    if (entry) {
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
                source: entry.resolution?.source ?? 'alias_cache',
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
          aiResult = await this.sdk.suggestion.handleTrigger(node);
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
          this._prefetchFormScope(entry.formScopeId, node).catch((err) =>
            console.warn('[ActionEngine] Prefetch failed (non-critical):', err)
          );
        }

        return aiResult;
      }
    }

    // ── CASE C: Not in registry (dynamic/SPA field) ─────────────────────────
    console.log(`[ActionEngine] CASE C — Field not in registry. Running on-demand detection...`);
    return this._handleUnregisteredField(node, isChoice);
  }

  /**
   * Fallback handler for fields that were not captured during the proactive page scan.
   * Mirrors the old handleTrigger() flow: detect on-demand, then suggest/decide.
   * Registers the resolved field in the FieldRegistry for future instant access.
   */
  private async _handleUnregisteredField(node: CognilotNode, isChoice: boolean) {
    let result;
    if (isChoice) {
      result = await this.sdk.decision.handleTrigger(node);
    } else {
      result = await this.sdk.suggestion.handleTrigger(node);
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
  private async _prefetchFormScope(formScopeId: string, activeNode: CognilotNode) {
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

    // Separate by engine type
    const textFields = pendingFields
      .filter((f) => !['radio', 'checkbox', 'file', 'select'].includes(f.type))
      .map((f) => ({ node: f.node, metadata: f.metadata }));

    const choiceFields = pendingFields
      .filter((f) => ['radio', 'checkbox', 'file', 'select'].includes(f.type))
      .map((f) => ({ node: f.node, metadata: f.metadata }));

    // Fire batch requests (fire & forget from the caller's perspective)
    const batchPromises: Promise<any>[] = [];

    if (textFields.length > 0) {
      batchPromises.push(
        this.sdk.suggestion.prefetchBatch(textFields as any).then(() => {
          // After batch resolves, mark registry entries as resolved
          this._syncBatchResultsToRegistry(
            pendingFields.filter((f) => !['radio', 'checkbox', 'file', 'select'].includes(f.type))
          );
        })
      );
    }

    if (choiceFields.length > 0) {
      batchPromises.push(
        this.sdk.decision.prefetchBatch(choiceFields as any).then(() => {
          this._syncDecisionBatchResultsToRegistry(
            pendingFields.filter((f) => ['radio', 'checkbox', 'file', 'select'].includes(f.type))
          );
        })
      );
    }

    await Promise.allSettled(batchPromises);

    // Notify listeners (e.g. Chrome Extension Content Script) that batch prefetching has finished
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cognilot-prefetch-complete', {
          detail: { formScopeId },
        })
      );
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

    for (const entry of pendingEntries) {
      if (entry.status !== 'pending') continue;
      const cacheKey = entry.id || entry.name || entry.text || '';
      const cached = suggestionCache.get(cacheKey);
      if (cached && cached.value) {
        this.sdk.registry.updateResolution(entry.id, {
          value: cached.value,
          options: cached.options ?? [cached.value],
          source: 'ai',
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
        const decision = cachedDecisions[entry.id];
        if (decision) {
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
  async executeBatch(questions: any[], onProgress?: (data: any) => void) {
    if (!questions || questions.length === 0) {
      onProgress?.({ status: 'complete', solved: 0, failed: 0, total: 0 });
      return { success: true, results: [] };
    }

    onProgress?.({ status: 'batch_start', total: questions.length });

    // 1. Ensure nodes are active (re-wrap if they came from serialised DTOs or missing node property)
    questions.forEach((q) => {
      const needsWrap = !q.node || typeof q.node.setValue !== 'function';
      if (needsWrap && q.selector) {
        console.log(
          `[ActionEngine] Attempting to recover node for ${q.id} via selector: ${q.selector}`
        );
        const el = document.querySelector(q.selector);
        if (el) {
          q.node = this.sdk.wrap(el);
          console.log(`[ActionEngine] Successfully recovered node for ${q.id}`);
        } else {
          console.warn(
            `[ActionEngine] Failed to find element for ${q.id} with selector: ${q.selector}`
          );
        }
      }
    });

    console.log(`[ActionEngine] Orchestrating batch: ${questions.length} fields.`);

    // 2. Prefetch non-cached fields in single batch API calls
    const textFields = questions.filter((q) => {
      const type = (q.type || '').toLowerCase();
      const tagName = (q.tagName || '').toLowerCase();
      return !['radio', 'checkbox', 'file'].includes(type) && tagName !== 'select';
    });
    const choiceFields = questions.filter((q) => {
      const type = (q.type || '').toLowerCase();
      const tagName = (q.tagName || '').toLowerCase();
      return ['radio', 'checkbox', 'file'].includes(type) || tagName === 'select';
    });

    if (textFields.length > 0) {
      await this.sdk.suggestion.prefetchBatch(textFields as any);
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

      try {
        console.log(`[ActionEngine] Solving field ${i + 1}/${questions.length}: ${q.text}`);
        const result: any = await this.handleTrigger(q.node);

        let success = false;
        let answerValue = '';

        if (result && !result.error) {
          const type = (q.type || '').toLowerCase();
          const tagName = (q.tagName || '').toLowerCase();
          const isChoice = ['radio', 'checkbox', 'file'].includes(type) || tagName === 'select';

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
    console.log(`[ActionEngine] Applying text: "${value}" to ${node.tagName}`);
    try {
      await node.setValue(value);
      return true;
    } catch (e) {
      console.error('[ActionEngine] Failed to apply suggestion:', e);
      return false;
    }
  }

  private async _applyDecision(node: CognilotNode, decision: any) {
    console.log(
      `[ActionEngine] Applying decision indices: ${decision.selected_indices} to ${node.tagName}`
    );
    try {
      // Handle Radios/Checkboxes/Selects
      const type = node.type || '';
      const tagName = node.tagName.toLowerCase();

      if (type === 'radio' || type === 'checkbox') {
        await node.click(); // Simple click for the element itself
      } else if (tagName === 'select') {
        await node.setValue(decision.selected_values?.[0] || '');
      } else if (decision.selected_indices && decision.selected_indices.length > 0) {
        // Complex case: find the actual option nodes (not implemented in metadata but available via DOM)
        // For now, if the node is the field itself, we just click it as a fallback
        await node.click();
      }
      return true;
    } catch (e) {
      console.error('[ActionEngine] Failed to apply decision:', e);
      return false;
    }
  }
}
