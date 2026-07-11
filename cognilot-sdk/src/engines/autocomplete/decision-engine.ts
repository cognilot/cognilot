import { CognilotSDK } from '../../index';
import { CognilotNode } from '../../platforms/interface';
import { FieldDetectionResponse } from '../../contracts/field-detection-response';
import { DecisionResponse } from '../../contracts/decision-response';
import { LabelExtractor } from '../detection/label-extractor';

/**
 * DecisionEngine
 * Logic exclusively for selection fields: Radios, Checkboxes, Selects, Files.
 * Refactored to be reactive (triggered by interaction).
 */
export class DecisionEngine {
  private sdk: CognilotSDK;
  private labelExtractor: LabelExtractor;

  constructor(sdk: CognilotSDK) {
    this.sdk = sdk;
    this.labelExtractor = new LabelExtractor(sdk.platform);
  }

  /**
   * Handles a field trigger (e.g., click or focus) for selection fields.
   */
  async handleTrigger(node: CognilotNode): Promise<DecisionResponse | { error: string } | null> {
    // 1. Validation
    const fieldType = node.type || '';
    const tagName = node.tagName.toLowerCase();
    const isChoice = ['radio', 'checkbox', 'file'].includes(fieldType) || tagName === 'select';

    if (!isChoice) {
      return {
        error: 'Field is not a selection type. DecisionEngine handles only choices.',
      };
    }

    // 2. Re-use Auto-Detection Data
    let fieldMetadata: FieldDetectionResponse | null = null;
    const lastDetection = this.sdk.detection.lastResult;

    if (lastDetection) {
      fieldMetadata =
        lastDetection.questions.find((q) => q.node.getRawNode() === node.getRawNode()) || null;
    }

    // 3. Optional: On-demand detection if missing
    if (!fieldMetadata) {
      console.log(`[DecisionEngine] No auto-detection match. Performing on-demand scan...`);
      const result = await this.sdk.detection.detect(node);
      fieldMetadata =
        result.questions.find((q) => q.node.getRawNode() === node.getRawNode()) || null;
    }

    if (!fieldMetadata) return null;

    // 4. Decision Logic (Session Cache -> Alias Cache -> Remote)
    const storage = this.sdk.adapters?.storage;
    if (storage) {
      const cachedDecisions = (await storage.get('Cognilot_decisions_cache')) || {};
      const cached = cachedDecisions[fieldMetadata.id || ''];
      if (cached) {
        console.log(`[DecisionEngine] Decision Session Cache Hit for ${fieldMetadata.text}`);
        return cached;
      }
    }

    // 4.5 Alias Cache (Persistent Learned Matches)
    if (this.sdk.alias) {
      const localMatch = await (this.sdk as any).alias.resolve(fieldMetadata);
      if (localMatch && localMatch.success) {
        console.log(`[DecisionEngine] Alias Cache Hit for ${fieldMetadata.text}`);
        const learnedOptions = localMatch.suggestion.options || [];

        // Map learned values back to indices in the current element
        const selected_indices: number[] = [];
        const selected_values: string[] = [];

        learnedOptions.forEach((val: any) => {
          const idx = (fieldMetadata as any).options.findIndex(
            (o: any) => o.value === val || o.text === val
          );
          if (idx !== -1) {
            selected_indices.push(idx);
            selected_values.push((fieldMetadata as any).options[idx].value);
          }
        });

        if (selected_indices.length > 0) {
          return {
            selected_indices,
            selected_values,
            ghost_indices: selected_indices,
            source: 'alias',
          };
        }
      }
    }

    // 5. Remote Fetch (On-demand)
    console.log(`[DecisionEngine] Fetching decision for "${fieldMetadata.text}"...`);

    const settings = this.sdk.adapters?.settings;
    const actionsProvider = settings
      ? await settings.getSetting('aiModels.actionsProvider', 'llama-3.1-8b-instant')
      : 'llama-3.1-8b-instant';
    const payload = {
      provider: actionsProvider,
      questions: [
        {
          id: fieldMetadata.id,
          label: fieldMetadata.text,
          type: fieldMetadata.type,
          options: fieldMetadata.options,
        },
      ],
    };

    try {
      const response = await this.sdk.apiClient.request(
        '/api/decision/batch',
        payload,
        'DecisionEngine'
      );
      if (response && response.ok && response.results) {
        const decision = response.results[fieldMetadata.id || ''] || null;
        if (decision) {
          // Enrich result for the UI
          decision.ghost_indices = decision.selected_indices || [];
          decision.is_example = true;

          // Save back to cache
          if (storage) {
            const cachedDecisions = (await (storage as any).get('Cognilot_decisions_cache')) || {};
            cachedDecisions[fieldMetadata.id || ''] = decision;
            await (storage as any).set('Cognilot_decisions_cache', cachedDecisions);
          }
          return decision;
        }
      }

      if (!response || !response.ok) {
        throw new Error(response?.statusText || 'API server unavailable');
      }
    } catch (e) {
      console.error('[DecisionEngine] Decision fetch failed:', e);
      return null;
    }

    return null;
  }

  /**
   * Batches multiple choice-based decisions into a single API call.
   */
  async prefetchBatch(fields: FieldDetectionResponse[]) {
    const storage = this.sdk.adapters?.storage;
    const storageResult = storage ? await storage.get('Cognilot_decisions_cache') : null;
    const cachedDecisions = storageResult?.Cognilot_decisions_cache || storageResult || {};

    // 1. Filter out fields that are already in session cache or alias cache
    const pendingFields = [];
    for (const field of fields) {
      if (cachedDecisions[field.id || '']) continue;

      // Check Alias Cache
      if (this.sdk.alias) {
        const aliasMatch = await (this.sdk as any).alias.resolve(field);
        if (aliasMatch && aliasMatch.success) {
          // Map to indices and save to session cache (level 1)
          const learnedOptions = aliasMatch.suggestion.options || [];
          const selected_indices: number[] = [];
          const selected_values: string[] = [];

          learnedOptions.forEach((val: any) => {
            const idx = (field as any).options.findIndex(
              (o: any) => o.value === val || o.text === val
            );
            if (idx !== -1) {
              selected_indices.push(idx);
              selected_values.push((field as any).options[idx].value);
            }
          });

          if (selected_indices.length > 0) {
            cachedDecisions[field.id || ''] = {
              selected_indices,
              selected_values,
              ghost_indices: selected_indices,
              source: 'alias',
            };
            continue;
          }
        }
      }
      pendingFields.push(field);
    }

    if (pendingFields.length === 0) {
      if (storage) await storage.set('Cognilot_decisions_cache', cachedDecisions);
      return;
    }

    console.log(`[DecisionEngine] Prefetching ${pendingFields.length} choices...`);

    const settings = this.sdk.adapters?.settings;
    const actionsProvider = settings
      ? await settings.getSetting('aiModels.actionsProvider', 'llama-3.1-8b-instant')
      : 'llama-3.1-8b-instant';

    // 2. Multi-field payload
    const payload = {
      provider: actionsProvider,
      questions: pendingFields.map((f) => ({
        id: f.id,
        label: f.text,
        type: f.type,
        options: f.options,
      })),
    };

    try {
      const response = await this.sdk.apiClient.request(
        '/api/decision/batch',
        payload,
        'DecisionEngine'
      );
      if (response && response.ok && response.results) {
        for (const f of pendingFields) {
          const decision = response.results[f.id || ''];
          if (decision) {
            decision.ghost_indices = decision.selected_indices || [];
            decision.source = (response as any).meta?.model || 'llm';
            cachedDecisions[f.id || ''] = decision;
          }
        }
      }
    } catch (e) {
      console.error('[DecisionEngine] Batch prefetch failed:', e);
    }

    if (storage) await storage.set('Cognilot_decisions_cache', cachedDecisions);
  }
}
