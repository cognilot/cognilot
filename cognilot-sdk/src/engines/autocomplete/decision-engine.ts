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
    const fieldType = (node.type || '').toLowerCase();
    const tagName = node.tagName.toLowerCase();
    const role = (node as any).getAttribute?.('role');
    const isCombobox =
      role === 'combobox' || (node as any).getAttribute?.('aria-autocomplete') !== null;
    const isChoice =
      ['radio', 'checkbox', 'select', 'autocomplete'].includes(fieldType) ||
      tagName === 'select' ||
      isCombobox;

    if (!isChoice) {
      return {
        error:
          'Field is not a supported selection type. DecisionEngine handles only choices (radio, checkbox, select, autocomplete).',
      };
    }

    // 2. Re-use Auto-Detection Data
    let fieldMetadata: FieldDetectionResponse | null = null;
    const lastDetection = this.sdk.detection.lastResult;
    const rawNode = node.getRawNode();

    const matchesQuestion = (q: FieldDetectionResponse) => {
      if (q.node.getRawNode() === rawNode) return true;
      if (Array.isArray(q.groupNodes)) {
        return q.groupNodes.some((gn) => gn.getRawNode?.() === rawNode || (gn as any) === rawNode);
      }
      if (q.name && node.name && q.name === node.name) return true;
      return false;
    };

    if (lastDetection && Array.isArray(lastDetection.questions)) {
      fieldMetadata = lastDetection.questions.find(matchesQuestion) || null;
    }

    // 3. Optional: On-demand detection if missing
    if (!fieldMetadata) {
      console.log(`[DecisionEngine] No auto-detection match. Performing on-demand scan...`);
      const result = await this.sdk.detection.detect(node);
      if (result && Array.isArray(result.questions)) {
        fieldMetadata = result.questions.find(matchesQuestion) || null;
      }
    }

    if (!fieldMetadata) return null;

    // 3.5 Live Option Harvesting: If options were empty at scan time (e.g. dynamic combobox), re-extract from DOM
    if (!fieldMetadata.options || fieldMetadata.options.length === 0) {
      const liveOptions = this.labelExtractor.collectChoiceOptions(node);
      if (liveOptions.length > 0) {
        fieldMetadata.options = liveOptions;
      }
    }

    // 4. Decision Logic (Session Cache -> Alias Cache -> Remote)
    const storage = this.sdk.adapters?.storage;
    if (storage) {
      const storageResult = await storage.get('Cognilot_decisions_cache');
      const cachedDecisions = storageResult?.Cognilot_decisions_cache || storageResult || {};
      const globalContext = this.sdk.platform.getGlobalContext();
      const domain = (globalContext?.location?.hostname || '').toLowerCase();
      const rawNode = node.getRawNode() as any;
      const rawId = rawNode?.id;
      const rawName = rawNode?.name;
      const cleanName = rawName
        ? rawName.replace(/\[|\]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
        : null;
      const text = fieldMetadata.text || fieldMetadata.metadata?.label;
      const qId = fieldMetadata.id || fieldMetadata.name || text;

      const candidateKeys = [
        qId,
        fieldMetadata.id,
        rawId,
        fieldMetadata.name,
        rawName,
        cleanName,
        text,
        fieldMetadata.metadata?.label,
        domain && qId ? `${domain}::${qId}` : null,
        domain && text ? `${domain}::${text}` : null,
        domain && (fieldMetadata.name || rawName)
          ? `${domain}::${fieldMetadata.name || rawName}`
          : null,
      ].filter(Boolean) as string[];

      let cached: any = null;
      for (const k of candidateKeys) {
        if (cachedDecisions[k]) {
          const cand = cachedDecisions[k];
          if (
            cand &&
            ((Array.isArray(cand.selected_values) && cand.selected_values.length > 0) || cand.value)
          ) {
            cached = cand;
            break;
          }
        }
      }

      if (cached) {
        console.log(`[DecisionEngine] Decision Session Cache Hit for ${fieldMetadata.text}`);
        return cached;
      }
    }

    // 4.5 Memory Cache (Persistent Learned Matches)
    if (this.sdk.memory) {
      const localMatch = await this.sdk.memory.resolve(fieldMetadata);
      if (localMatch && localMatch.success) {
        console.log(`[DecisionEngine] Memory Cache Hit for ${fieldMetadata.text}`);
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
            source: 'memory',
          };
        }
      }
    }

    // 5. Remote Fetch (On-demand)
    if (!fieldMetadata.options || fieldMetadata.options.length === 0) {
      console.log(
        `[DecisionEngine] No options available for "${fieldMetadata.text}". Delegating to SuggestionEngine...`
      );
      const sugResult = await this.sdk.suggestion.handleTrigger(node);
      if (sugResult && sugResult.value) {
        return {
          value: sugResult.value,
          selected_values: [sugResult.value],
          selected_indices: [0],
          ghost_indices: [0],
          source: sugResult.source || 'ai',
          allChoices: [],
          options: [],
        } as any;
      }
      return null;
    }

    console.log(`[DecisionEngine] Fetching decision for "${fieldMetadata.text}"...`);

    const settings = this.sdk.adapters?.settings;
    const actionsProvider = settings
      ? await settings.getSetting('aiModels.actionsProvider', 'openai/gpt-oss-120b')
      : 'openai/gpt-oss-120b';
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
          decision.source = (response as any).meta?.model || 'llm';
          decision.allChoices = fieldMetadata.options || [];
          decision.options = fieldMetadata.options || [];

          // Save back to cache across all candidate lookup keys
          if (storage) {
            const storageResult = await (storage as any).get('Cognilot_decisions_cache');
            const cachedDecisions = storageResult?.Cognilot_decisions_cache || storageResult || {};
            const globalContext = this.sdk.platform.getGlobalContext();
            const domain = (globalContext?.location?.hostname || '').toLowerCase();
            const rawNode = node.getRawNode() as any;
            const rawId = rawNode?.id;
            const rawName = rawNode?.name;
            const cleanName = rawName
              ? rawName.replace(/\[|\]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
              : null;
            const text = fieldMetadata.text || fieldMetadata.metadata?.label;
            const qId = fieldMetadata.id || fieldMetadata.name || text;

            const candidateKeys = [
              qId,
              fieldMetadata.id,
              rawId,
              fieldMetadata.name,
              rawName,
              cleanName,
              text,
              fieldMetadata.metadata?.label,
              domain && qId ? `${domain}::${qId}` : null,
              domain && text ? `${domain}::${text}` : null,
              domain && (fieldMetadata.name || rawName)
                ? `${domain}::${fieldMetadata.name || rawName}`
                : null,
            ].filter(Boolean) as string[];

            for (const key of candidateKeys) {
              cachedDecisions[key] = decision;
            }
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

    // 1. Filter out fields that are not supported choices, or are already in session cache or alias cache
    const pendingFields = [];
    for (const field of fields) {
      const type = (field.type || '').toLowerCase();
      const role = (field.node as any)?.getAttribute?.('role');
      const isCombobox =
        role === 'combobox' || (field.node as any)?.getAttribute?.('aria-autocomplete') !== null;
      if (!['radio', 'checkbox', 'select', 'autocomplete'].includes(type) && !isCombobox) continue;
      if (cachedDecisions[field.id || '']) continue;

      // Check Memory Cache
      if (this.sdk.memory) {
        const memoryMatch = await this.sdk.memory.resolve(field);
        if (memoryMatch && memoryMatch.success) {
          // Map to indices and save to session cache (level 1)
          const learnedOptions = memoryMatch.suggestion.options || [];
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
              source: 'memory',
              allChoices: field.options || [],
              options: field.options || [],
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
      ? await settings.getSetting('aiModels.actionsProvider', 'openai/gpt-oss-120b')
      : 'openai/gpt-oss-120b';

    // 2. Multi-field payload
    const payload = {
      provider: actionsProvider,
      questions: pendingFields.map((f, idx) => ({
        id: f.id || f.name || f.ref_id || f.text || `choice-field-${idx + 1}`,
        label: f.text || f.metadata?.label || '',
        type: f.type || 'radio',
        options: Array.isArray(f.options)
          ? f.options.map((opt: any) =>
              typeof opt === 'string'
                ? { text: opt, value: opt }
                : { text: opt?.text || opt?.value || '', value: opt?.value || opt?.text || '' }
            )
          : [],
      })),
    };

    try {
      const response = await this.sdk.apiClient.request(
        '/api/decision/batch',
        payload,
        'DecisionEngine'
      );
      if (response && response.ok && response.results) {
        console.log('[DecisionEngine] <== Batch Response Received from AI:', response.results);
        const globalContext = this.sdk.platform.getGlobalContext();
        const domain = (globalContext?.location?.hostname || '').toLowerCase();

        for (let i = 0; i < pendingFields.length; i++) {
          const f = pendingFields[i];
          const rawNode =
            typeof (f as any).node?.getRawNode === 'function'
              ? (f as any).node.getRawNode()
              : (f as any).node;
          const rawId = rawNode?.id || (f as any).id;
          const rawName = rawNode?.name || (f as any).name;
          const cleanName = rawName
            ? rawName.replace(/\[|\]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
            : null;
          const strippedCognilotId = f.id
            ? f.id.replace(/^Cognilot-field-/i, '').replace(/-/g, '_')
            : null;
          const text = f.text || f.metadata?.label;
          const qId = f.id || f.name || f.ref_id || text || `choice-field-${i + 1}`;

          const candidateLookupKeys = [
            qId,
            f.id,
            rawId,
            strippedCognilotId,
            f.name,
            rawName,
            cleanName,
            text,
            f.metadata?.label,
            domain && qId ? `${domain}::${qId}` : null,
            domain && text ? `${domain}::${text}` : null,
            domain && (f.name || rawName) ? `${domain}::${f.name || rawName}` : null,
          ].filter(Boolean) as string[];

          let decision: any = null;
          for (const key of candidateLookupKeys) {
            if (response.results[key]) {
              decision = response.results[key];
              break;
            }
          }

          if (decision) {
            const hasSelection =
              Array.isArray(decision.selected_values) && decision.selected_values.length > 0;
            console.log(
              `[DecisionEngine] 💡 Prefetched decision for "${f.text || f.metadata?.label || qId}":`,
              hasSelection ? decision.selected_values : '[] (unselected)'
            );
            if (hasSelection) {
              decision.ghost_indices = decision.selected_indices || [];
              decision.source = (response as any).meta?.model || 'llm';
              decision.allChoices = f.options || [];
              decision.options = f.options || [];
              for (const key of candidateLookupKeys) {
                cachedDecisions[key] = decision;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('[DecisionEngine] Batch prefetch failed:', e);
    }

    if (storage) await storage.set('Cognilot_decisions_cache', cachedDecisions);
  }

  /** Clears persistent decisions cache to allow full re-resolution on context toggle */
  async clearCache(): Promise<void> {
    const storage = this.sdk.adapters?.storage;
    if (storage) {
      try {
        await storage.set('Cognilot_decisions_cache', {});
        console.log('[DecisionEngine] 🗑️ Decisions cache cleared.');
      } catch (e) {
        console.warn('[DecisionEngine] Failed to clear storage cache:', e);
      }
    }
  }
}
