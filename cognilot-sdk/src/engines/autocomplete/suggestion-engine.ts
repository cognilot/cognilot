import { CognilotSDK } from '../../index';
import { PlatformAdapter, CognilotNode } from '../../platforms/interface';
import { LabelExtractor, LabelMetadata } from '../detection/label-extractor';

export interface SuggestionRequest {
  field: LabelMetadata;
  context: any;
}

/**
 * SuggestionEngine
 * Orchestrates the generation of AI-powered suggestions for form fields.
 */
export class SuggestionEngine {
  private sdk: CognilotSDK;
  private platform: PlatformAdapter;
  private labelExtractor: LabelExtractor;
  private requestCache: Map<string, any> = new Map();

  constructor(sdk: CognilotSDK) {
    this.sdk = sdk;
    this.platform = sdk.platform;
    this.labelExtractor = new LabelExtractor(this.platform);
  }

  /**
   * Handles a field trigger (e.g., focus or click) to fetch suggestions.
   */
  async handleTrigger(node: CognilotNode, options: any = {}) {
    // 1. Validation (Strictly text fields)
    const fieldType = node.type || '';
    const tagName = node.tagName.toLowerCase();

    if (['radio', 'checkbox', 'file'].includes(fieldType) || tagName === 'select') {
      return {
        error: 'Field is not textual. SuggestionEngine handles only text/inputs.',
      };
    }

    // 1b. Registry fast-path: if already resolved, skip the whole pipeline.
    //     ActionEngine handles this case before reaching here (Case A),
    //     but SuggestionEngine also guards against double-resolution.
    const registryEntry = this.sdk.registry.findByNode(node.getRawNode());

    // If resolved via existing_value but now empty, reset registry entry
    const currentValue = node.value?.trim() ?? '';
    if (
      registryEntry &&
      registryEntry.status === 'resolved' &&
      registryEntry.resolution?.source === 'existing_value' &&
      !currentValue
    ) {
      registryEntry.status = 'pending';
      registryEntry.resolution = null;
    }

    if (
      registryEntry?.status === 'resolved' &&
      registryEntry.resolution?.source !== 'existing_value'
    ) {
      console.log(
        `[SuggestionEngine] Registry fast-path for "${registryEntry.text}" (${registryEntry.resolution?.source})`
      );
      return {
        success: true,
        value: registryEntry.resolution?.value ?? '',
        options: registryEntry.resolution?.options ?? [],
        source: registryEntry.resolution?.source,
        field: registryEntry.metadata,
        type: 'discrete',
      };
    }

    // 2. Re-use Auto-Detection Data
    let metadata: LabelMetadata | null = null;
    const lastDetection = this.sdk.detection.lastResult;

    if (lastDetection) {
      const match = lastDetection.questions.find((q) => q.node.getRawNode() === node.getRawNode());
      if (match) {
        console.log(`[SuggestionEngine] Logic Match Found: Re-using metadata for "${match.text}"`);
        metadata = match.metadata;
      }
    }

    // 3. Case 2: No Match -> On-demand Detection
    if (!metadata) {
      console.log(`[SuggestionEngine] No auto-detection match. Performing on-demand scan...`);
      const onDemandResult = await this.sdk.detection.detect(node);
      const match = onDemandResult.questions.find((q) => q.node.getRawNode() === node.getRawNode());

      if (match) {
        metadata = match.metadata;
      } else {
        // Final fallback: Single field extraction
        metadata = this.labelExtractor.extractFieldMetadata(node);
      }
    }

    if (!metadata.label && !metadata.source) return null;

    // 4. Local Resolution Level (Check Alias/Profile first)
    const localMatch = await this.resolveLocally(node, metadata);
    if (localMatch) {
      return localMatch;
    }

    // 5. Cache Check (Memory -> Persistent Storage)
    const cacheKey =
      (node as any).id || (node as any).getAttribute('name') || metadata.label || 'unknown';

    // In-Memory check (Fastest)
    if (this.requestCache.has(cacheKey)) {
      console.log(`[SuggestionEngine] Memory Cache Hit for "${metadata.label}"`);
      const cachedRes = this.requestCache.get(cacheKey);
      if (cachedRes && !cachedRes.options) cachedRes.options = [cachedRes.value]; // Ensure ghost-text compatibility
      return cachedRes;
    }

    // Persistent Storage check (Survives Refresh)
    const storage = this.sdk.adapters?.storage;
    if (storage) {
      const storageResult = await (storage as any).get('Cognilot_suggestions_cache', 'session');
      const persistentCache = storageResult?.Cognilot_suggestions_cache || storageResult || {};
      if (persistentCache[cacheKey]) {
        console.log(`[SuggestionEngine] Persistent Cache Hit for "${metadata.label}"`);
        const cachedRes = persistentCache[cacheKey];
        if (cachedRes && !cachedRes.options) cachedRes.options = [cachedRes.value];
        this.requestCache.set(cacheKey, cachedRes); // Hydro memories for speed
        return cachedRes;
      }
    }

    // 5. Build Request Payload with Local Context
    const settings = this.sdk.adapters?.settings
      ? await (this.sdk.adapters.settings as any).getSettings()
      : {};
    const provider = settings.aiModels?.suggestionsProvider || 'llama-3.1-8b-instant';
    const useProfileContext = settings.copilotSuggestions?.useProfileContext !== false;

    // NEW: Get Local Profile and Sync Queue
    const profile = useProfileContext
      ? (await this.sdk.adapters?.auth?.getActiveProfile()) || {}
      : {};
    // LAZY SYNC: We no longer send sync_queue in the Priority request to minimize latency.
    const syncQueue: any[] = [];
    const globalContext = this.platform.getGlobalContext();

    const payload: any = {
      provider: provider,
      questions: [
        {
          key: cacheKey,
          field: {
            label: metadata.label,
            placeholder: (node as any).getAttribute('placeholder'),
            name: (node as any).getAttribute('name'),
            id: (node as any).id,
            type: (node as any).type || 'text',
            tagName: node.tagName || 'INPUT',
            required: metadata.required || false,
          },
        },
      ],
      user_context: {
        profile: profile,
        sync_queue: syncQueue,
      },
      page_context: {
        domain: globalContext.location.hostname,
        path: globalContext.location.pathname,
        title: globalContext.document.title,
        h1: globalContext.document.querySelector('h1')?.innerText || '',
      },
    };

    const activeProvider = await this.sdk.inference.getSelectedProviderName();
    if (activeProvider === 'byok' || activeProvider === 'gemini-nano') {
      console.log(`[SuggestionEngine] Local inference route chosen: ${activeProvider}`);
      const promptContext = {
        label: metadata.label,
        type: (node as any).type || 'text',
        placeholder: (node as any).getAttribute('placeholder') || undefined,
        value: (node as any).value || undefined,
        formContext: (node as any).formContext || undefined,
        pageUrl: globalContext.location.href,
        pageTitle: globalContext.document.title,
      };

      try {
        const result = await this.sdk.inference.route(promptContext);
        console.log(`[SuggestionEngine] Local Inference Result:`, result);

        if (result && result.value) {
          const finalRes = {
            success: true,
            value: result.value,
            options: [result.value],
            field: {
              ...metadata,
              placeholder: (node as any).getAttribute('placeholder') || '',
            },
            source: result.provider,
            type: 'discrete' as const,
          };
          this.requestCache.set(cacheKey, finalRes);
          return finalRes;
        }
      } catch (err) {
        console.warn('[SuggestionEngine] Local inference failed:', err);
      }
    }

    try {
      console.log(`[SuggestionEngine] ==> Request Payload (${provider}):`, payload);
      const response = await this.sdk.apiClient.request(
        '/api/suggestions/batch',
        payload,
        'SuggestionEngine'
      );
      console.log(`[SuggestionEngine] <== Response Received:`, response);

      if (response && response.ok) {
        // 1. Handle Standardized Profile (Piggyback Learning)
        if (response.standardized_profile && this.sdk.profile) {
          await this.sdk.profile.updateFromStandardizedData(response.standardized_profile);
          if (this.sdk.alias) await this.sdk.alias.clearSyncQueue();
        }

        // 2. Extract specific result
        if (response.results) {
          const suggestion = response.results[cacheKey];
          if (suggestion) {
            const options = Array.isArray(suggestion) ? suggestion : suggestion.options || [];
            const value =
              options.length > 0
                ? options[0]
                : typeof suggestion === 'object'
                  ? suggestion.value
                  : suggestion;

            if (value !== undefined && value !== null) {
              const finalRes = {
                success: true,
                value: value,
                options: options.length > 0 ? options : [value],
                field: {
                  ...metadata,
                  placeholder: (node as any).getAttribute('placeholder') || '',
                },
                source: (response as any).meta?.model || provider,
                type: suggestion.type || 'discrete',
              };

              console.log(`[SuggestionEngine] Prepared Result:`, finalRes);
              this.requestCache.set(cacheKey, finalRes);

              // ── Phase 3: Sync result to FieldRegistry ────────────────────────
              // After the AI responds, update the registry so subsequent
              // clicks on this field are served from Case A (zero latency).
              const regEntry = this.sdk.registry.findByNode(node.getRawNode());
              if (regEntry) {
                this.sdk.registry.updateResolution(regEntry.id, {
                  value: finalRes.value ?? null,
                  options: finalRes.options ?? [],
                  source: 'ai',
                });
              }

              if (storage) {
                const storageResult = await (storage as any).get(
                  'Cognilot_suggestions_cache',
                  'session'
                );
                const persistentCache =
                  storageResult?.Cognilot_suggestions_cache || storageResult || {};
                persistentCache[cacheKey] = finalRes;
                await (storage as any).set(
                  'Cognilot_suggestions_cache',
                  persistentCache,
                  'session'
                );
              }

              return finalRes;
            }
          }
        }
      }

      if (!response || !response.ok) {
        throw new Error(response?.statusText || 'API server unavailable');
      }
    } catch (e) {
      console.error('[SuggestionEngine] Failed to fetch suggestion:', e);
      return null;
    }

    return null;
  }

  /**
   * Checks for local matches (Alias/Profile) before calling AI.
   */
  async resolveLocally(node: CognilotNode, metadata: LabelMetadata) {
    const settings = this.sdk.adapters?.settings
      ? await (this.sdk.adapters.settings as any).getSettings()
      : {};
    const useProfileContext = settings.copilotSuggestions?.useProfileContext !== false;
    if (!useProfileContext) return null;

    // Convert to DTO expected by Resolvers
    const fieldDto: any = {
      text: metadata.label,
      name: (node as any).getAttribute('name'),
      id: (node as any).id,
      placeholder: (node as any).getAttribute('placeholder'),
      type: (node as any).type || 'text',
    };

    // 1. Check Alias Cache
    if (this.sdk.alias) {
      const localMatch = await this.sdk.alias.resolve(fieldDto);
      if (localMatch && localMatch.success) {
        console.log(`[SuggestionEngine] Alias Match Hit for "${metadata.label}"`);
        return {
          success: true,
          value: localMatch.suggestion.options?.[0] || '',
          options: localMatch.suggestion.options || [localMatch.suggestion.options?.[0]],
          field: {
            ...metadata,
            placeholder: (node as any).getAttribute('placeholder') || '',
          },
          source: localMatch.suggestion.source || 'alias_cache',
          type: localMatch.suggestion.type || 'discrete',
        };
      }
    }

    // 2. Check Profile Cache
    if (this.sdk.profile) {
      const profileMatch = await this.sdk.profile.resolve(fieldDto);
      if (profileMatch && profileMatch.success) {
        console.log(`[SuggestionEngine] Profile Match Hit for "${metadata.label}"`);
        return {
          success: true,
          value: profileMatch.suggestion.options?.[0] || '',
          options: profileMatch.suggestion.options || [profileMatch.suggestion.options?.[0]],
          field: {
            ...metadata,
            placeholder: (node as any).getAttribute('placeholder') || '',
          },
          source: profileMatch.suggestion.source || 'profile_cache',
          type: profileMatch.suggestion.type || 'discrete',
        };
      }
    }

    return null;
  }

  /**
   * Batches multiple suggestion requests into a single API call for efficiency.
   * Filters out already cached/local matches.
   */
  async prefetchBatch(items: { node: CognilotNode; metadata: LabelMetadata }[]) {
    const globalContext = this.platform.getGlobalContext();
    const storage = this.sdk.adapters?.storage;

    // 1. Filter items that are NOT in cache and NOT resolvable locally
    const pendingItems = [];
    for (const item of items) {
      const cacheKey =
        (item.node as any).id ||
        (item.node as any).getAttribute('name') ||
        item.metadata.label ||
        'unknown';
      if (this.requestCache.has(cacheKey)) continue;

      const localMatch = await this.resolveLocally(item.node, item.metadata);
      if (localMatch) {
        this.requestCache.set(cacheKey, localMatch); // Prime memory cache
        continue;
      }

      pendingItems.push({ key: cacheKey, item });
    }

    if (pendingItems.length === 0) return;

    const settings = this.sdk.adapters?.settings
      ? await (this.sdk.adapters.settings as any).getSettings()
      : {};
    const provider = settings.aiModels?.suggestionsProvider || 'llama-3.1-8b-instant';
    const activeProvider = await this.sdk.inference.getSelectedProviderName();
    if (activeProvider === 'byok' || activeProvider === 'gemini-nano') {
      console.log(`[SuggestionEngine] Prefetch: Local inference route chosen: ${activeProvider}`);
      const globalContext = this.platform.getGlobalContext();

      await Promise.all(
        pendingItems.map(async (p) => {
          const promptContext = {
            label: p.item.metadata.label,
            type: (p.item.node as any).type || 'text',
            placeholder: (p.item.node as any).getAttribute('placeholder') || undefined,
            value: (p.item.node as any).value || undefined,
            formContext: (p.item.node as any).formContext || undefined,
            pageUrl: globalContext.location.href,
            pageTitle: globalContext.document.title,
          };

          try {
            const result = await this.sdk.inference.route(promptContext);
            if (result && result.value) {
              const finalRes = {
                success: true,
                value: result.value,
                options: [result.value],
                field: {
                  ...p.item.metadata,
                  placeholder: (p.item.node as any).getAttribute('placeholder') || '',
                },
                source: result.provider,
                type: 'discrete' as const,
              };
              this.requestCache.set(p.key, finalRes);
            }
          } catch (err) {
            console.warn(
              `[SuggestionEngine] Prefetch local inference failed for key "${p.key}":`,
              err
            );
          }
        })
      );
      return;
    }

    const useProfileContext = settings.copilotSuggestions?.useProfileContext !== false;

    // Build multi-question payload
    const profile = useProfileContext
      ? (await this.sdk.adapters?.auth?.getActiveProfile()) || {}
      : {};

    // SYNC: No longer piggybacking. Dedicated /api/learner/standardize handles this.
    const syncQueue: any[] = [];

    const payload: any = {
      provider: provider,
      questions: pendingItems.map((p) => ({
        key: p.key,
        field: {
          label: p.item.metadata.label,
          placeholder: (p.item.node as any).getAttribute('placeholder'),
          name: (p.item.node as any).getAttribute('name'),
          id: (p.item.node as any).id,
          type: (p.item.node as any).type || 'text',
          tagName: p.item.node.tagName || 'INPUT',
          required: p.item.metadata.required || false,
        },
      })),
      user_context: {
        profile: profile,
        sync_queue: syncQueue,
      },
      page_context: {
        domain: globalContext.location.hostname,
        path: globalContext.location.pathname,
        title: globalContext.document.title,
        h1: globalContext.document.querySelector('h1')?.innerText || '',
      },
    };

    try {
      console.log(
        `[SuggestionEngine] Prefetching batch (${provider}) for ${pendingItems.length} fields...`
      );
      const response = await this.sdk.apiClient.request(
        '/api/suggestions/batch',
        payload,
        'SuggestionEngine'
      );

      if (response && response.ok) {
        // 1. Handle Standardized Profile (Piggyback Learning)
        if (response.standardized_profile && this.sdk.profile) {
          await this.sdk.profile.updateFromStandardizedData(response.standardized_profile);
          if (this.sdk.alias) await this.sdk.alias.clearSyncQueue();
        }

        // 2. Extract results
        if (response.results) {
          const storageResult = storage
            ? await (storage as any).get('Cognilot_suggestions_cache', 'session')
            : null;
          const persistentCache = storageResult?.Cognilot_suggestions_cache || storageResult || {};

          for (const p of pendingItems) {
            const suggestion = response.results[p.key];
            if (suggestion) {
              const options = Array.isArray(suggestion) ? suggestion : suggestion.options || [];
              const value =
                options.length > 0
                  ? options[0]
                  : typeof suggestion === 'object'
                    ? suggestion.value
                    : suggestion;

              if (value !== undefined && value !== null) {
                const result = {
                  success: true,
                  value,
                  options: options.length > 0 ? options : [value],
                  field: {
                    ...p.item.metadata,
                    placeholder: (p.item.node as any).getAttribute('placeholder') || '',
                  },
                  source: (response as any).meta?.model || provider,
                  type: suggestion.type || 'discrete',
                };
                this.requestCache.set(p.key, result);
                if (persistentCache) persistentCache[p.key] = result;
              }
            }
          }

          if (storage && Object.keys(persistentCache).length > 0) {
            await (storage as any).set('Cognilot_suggestions_cache', persistentCache, 'session');
          }
        }
      }
    } catch (e) {
      console.error('[SuggestionEngine] Batch prefetch failed:', e);
    }
  }

  /**
   * Refines (improves) the current text of a field using AI.
   */
  async handleRefine(node: CognilotNode, currentText: string) {
    const triggerRes: any = await this.handleTrigger(node);
    if (!triggerRes || triggerRes.error) return { success: false };

    const globalContext = this.platform.getGlobalContext();
    const payload = {
      field: {
        label: triggerRes.field.label,
        type: (node as any).type || 'text',
        tagName: node.tagName,
      },
      page_context: {
        domain: globalContext.location.hostname,
        path: globalContext.location.pathname,
        title: globalContext.document.title,
      },
      raw_text: currentText,
      learn_on_enhance: false,
    };

    try {
      const response = await this.sdk.apiClient.request(
        '/api/suggestions/refine',
        payload,
        'SuggestionEngine'
      );
      if (response && response.ok && response.refined_text) {
        return {
          success: true,
          value: response.refined_text,
          type: 'refine',
          field: triggerRes.field,
        };
      }
    } catch (e) {
      console.error('[SuggestionEngine] Refinement failed:', e);
    }
    return { success: false };
  }

  /**
   * Confirms a suggestion was accepted by the user and persists it as an alias.
   */
  async confirmSuggestion(node: CognilotNode, value: string, skipSync = true) {
    if (!node || !value) return;

    // Security Gate: Never learn from password fields
    if (node.type === 'password' || node.getAttribute?.('type') === 'password') {
      console.warn('[SuggestionEngine] Skipping learning/alias persistence for password field.');
      return;
    }

    // Extract metadata for the node to get the label
    const metadata = this.sdk.detection.getFieldMetadata(node);
    const label =
      metadata?.label ||
      (node as any).getAttribute?.('name') ||
      (node as any).id ||
      (node as any).getAttribute?.('placeholder');

    if (label && this.sdk.alias) {
      console.log(
        `[SuggestionEngine] Learning alias for "${label}" -> "${value}" (skipSync=${skipSync})`
      );
      await this.sdk.alias.persistAlias(label, value, skipSync);
    }
  }
}
