import { CognilotSDK } from '../index';
import { FieldDetectionResponse } from '../contracts/field-detection-response';
import { LabelUtil } from './label-util';

/**
 * AliasResolver
 * Responsible for mapping specific field signatures to precisely learned responses over time.
 */
export class AliasResolver {
  private sdk: CognilotSDK;
  private _aliasTtlMs = 24 * 60 * 60 * 1000; // 1 day sliding TTL
  private _idleTimer: any = null;

  constructor(sdk: CognilotSDK) {
    this.sdk = sdk;
    this.setupCleanupListeners();
  }

  private setupCleanupListeners() {
    if (typeof window !== 'undefined' && window.addEventListener) {
      // Cleanup on departure
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushQueue(true); // Flush with keepalive
        }
      });

      // Flush on form submit (Capture confirmed state)
      window.addEventListener(
        'submit',
        () => {
          this.flushQueue();
        },
        true
      ); // Capture phase to ensure it runs
    }
  }

  async resolve(field: FieldDetectionResponse) {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return null;

    const result = await storage.get('Cognilot_alias_cache');
    const aliasCache = result?.Cognilot_alias_cache || result || {};
    const now = Date.now();

    const normalizedLabel = LabelUtil.normalizeText(field.text);
    const normalizedName = LabelUtil.normalizeText(field.name || '');
    const normalizedPlaceholder = LabelUtil.normalizeText(field.placeholder || '');
    const normalizedId = LabelUtil.normalizeText(field.id || '');

    // 1. Prioritize direct label match (Best cross-site portability)
    const labelKey = this.normalizeAliasKey(normalizedLabel);
    if (labelKey && aliasCache[labelKey]) {
      return this._returnAliasMatch(aliasCache, labelKey, now, storage);
    }

    // 2. Fallback to name/placeholder/id matches
    const exactParts = [normalizedName, normalizedPlaceholder, normalizedId].filter(
      (p) => p.length >= 2
    );
    const textToMatch = [normalizedLabel, normalizedName, normalizedPlaceholder, normalizedId]
      .join(' ')
      .trim();

    for (const alias in aliasCache) {
      if (alias === labelKey) continue; // Already checked

      const normAlias = LabelUtil.normalizeText(alias);
      if (
        exactParts.includes(normAlias) ||
        (textToMatch.includes(normAlias) && normAlias.length >= 4)
      ) {
        return this._returnAliasMatch(aliasCache, alias, now, storage);
      }
    }

    return null;
  }

  private async _returnAliasMatch(aliasCache: any, key: string, now: number, storage: any) {
    const entry = aliasCache[key];
    if (!entry || !entry.options || entry.options.length === 0) return null;

    if (entry.expires_at && now > entry.expires_at) {
      delete aliasCache[key];
      await storage.set('Cognilot_alias_cache', aliasCache);
      return null;
    }

    entry.last_used_at = now;
    entry.expires_at = now + this._aliasTtlMs;
    await storage.set('Cognilot_alias_cache', aliasCache);

    return {
      success: true,
      suggestion: {
        options: entry.options.map(String).slice(0, 5),
        type: 'discrete',
        source: 'alias_cache',
      },
      reasoning: `Alias Cache Match: ${key}`,
    };
  }

  private _learningLock = new Map<string, number>();

  /**
   * Persists a newly learned value into the alias cache and adds it to the sync queue.
   */
  async persistAlias(label: string, value: string, skipSync = false) {
    const settings = this.sdk.adapters?.settings
      ? await (this.sdk.adapters.settings as any).getSettings()
      : {};
    const useProfileContext = settings.copilotSuggestions?.useProfileContext !== false;
    if (!useProfileContext) {
      console.log(`[AliasResolver] Skip persisting alias: useProfileContext is disabled`);
      return false;
    }

    const storage = this.sdk.adapters?.storage;
    if (!storage) return false;

    const auth = this.sdk.adapters?.auth;
    const authenticated = auth ? await auth.isAuthenticated() : false;
    if (!authenticated) {
      skipSync = true;
    }

    const aliasKey = this.normalizeAliasKey(label);
    if (!aliasKey) return false;

    const trimmedValue = String(value).trim();
    if (!trimmedValue) return false;

    const lockKey = `${aliasKey}:${trimmedValue.toLowerCase()}`;
    const now = Date.now();
    const lastLearn = this._learningLock.get(lockKey);

    if (lastLearn && now - lastLearn < 2000) {
      console.log(`[AliasResolver] 🛡️ Learning lock active for "${aliasKey}"`);
      return false;
    }
    this._learningLock.set(lockKey, now);

    const result = await storage.get(['Cognilot_alias_cache', 'Cognilot_sync_queue']);
    const aliasCache = result?.Cognilot_alias_cache || {};
    let syncQueue = result?.Cognilot_sync_queue || [];

    // 1. Check for redundancy
    const existingRaw = aliasCache[aliasKey];
    const existingOptions = existingRaw?.options || existingRaw?.values || [];
    const isRedundant =
      existingOptions.length > 0 &&
      String(existingOptions[0]).trim().toLowerCase() === trimmedValue.toLowerCase();

    if (isRedundant) {
      console.log(
        `[AliasResolver] Skip redundant persistence for "${aliasKey}" (value already current)`
      );
      return true; // Already learned
    }

    // 2. Update Alias Cache (Exact matches)
    let newOptions = [trimmedValue];
    const combined = [...newOptions, ...existingOptions.map((x: any) => String(x).trim())];
    newOptions = [...new Set(combined)].slice(0, 5);

    aliasCache[aliasKey] = {
      type: 'discrete',
      options: newOptions,
      last_used_at: now,
      expires_at: now + this._aliasTtlMs,
    };

    let addedToQueue = false;

    // 3. Add to Sync Queue (Semantic/Profile learning)
    // Only add if this specific label/value pair isn't already in the queue (Case Insensitive)
    if (!skipSync) {
      const alreadyInQueue = syncQueue.some(
        (item: any) =>
          item.label === aliasKey &&
          String(item.value).trim().toLowerCase() === trimmedValue.toLowerCase()
      );

      if (!alreadyInQueue) {
        syncQueue.push({
          label: aliasKey,
          value: trimmedValue,
          timestamp: now,
        });
        // Keep queue reasonable
        if (syncQueue.length > 20) syncQueue = syncQueue.slice(-20);
        addedToQueue = true;
      }
    }

    console.log(
      `[AliasResolver] Persisting alias: "${aliasKey}" -> "${trimmedValue}" (skipSync=${skipSync})`
    );

    const payload = {
      Cognilot_alias_cache: aliasCache,
      Cognilot_sync_queue: syncQueue,
    };

    try {
      await storage.set(payload);
      console.log(`[AliasResolver] ✅ Cache saved successfully`, payload);
    } catch (e) {
      console.error(`[AliasResolver] ❌ Failed to save cache:`, e);
    }

    // 4. Trigger Idle Sync (Debounced 5s)
    if (addedToQueue) {
      this.scheduleIdleSync();
    }

    return true;
  }

  private scheduleIdleSync() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      this.flushQueue();
    }, 5000);
  }

  /**
   * Forcibly sends the sync queue to the backend for standardization.
   * @param keepalive If true, uses fetch keepalive (useful for page unload)
   */
  async flushQueue(keepalive = false) {
    const settings = this.sdk.adapters?.settings
      ? await (this.sdk.adapters.settings as any).getSettings()
      : {};
    const useProfileContext = settings.copilotSuggestions?.useProfileContext !== false;
    if (!useProfileContext) return;

    const queue = await this.getSyncQueue();
    if (queue.length === 0) return;

    console.log(
      `[AliasResolver] 🚀 Flushing sync queue (${queue.length} items, keepalive=${keepalive})...`
    );

    try {
      const globalContext = this.sdk.platform.getGlobalContext();
      const formattedQueue = queue.map((item: any) => ({
        key: item.label,
        value: item.value,
        domain: globalContext.location.hostname || 'unknown',
        confirmedAt: new Date(item.timestamp || Date.now()).toISOString(),
      }));

      const response = await this.sdk.apiClient.request(
        '/api/profile/sync',
        {
          sync_queue: formattedQueue,
        },
        'AliasResolver',
        { keepalive }
      );

      // Update local profile cache with the refined data
      if (response && response.profile?.dataLearned && this.sdk.profile) {
        console.log(`[AliasResolver] Processing standardized profile from standalone flush...`);
        await this.sdk.profile.updateFromStandardizedData(response.profile.dataLearned);
      }

      await this.clearSyncQueue();
    } catch (e) {
      console.warn('[AliasResolver] Failed to flush queue:', e);
    }
  }

  /**
   * Returns the current queue of aliases pending standardization.
   */
  async getSyncQueue() {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return [];
    const result = await storage.get('Cognilot_sync_queue');
    return result?.Cognilot_sync_queue || [];
  }

  /**
   * Clears the sync queue after successful backend processing.
   */
  async clearSyncQueue() {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return;
    await storage.set({ Cognilot_sync_queue: [] });
  }

  private normalizeAliasKey(label: string): string {
    if (!label) return '';
    let k = label.trim().toLowerCase();
    k = k.replace(/[\n\r]+/g, ' ');
    k = k.replace(/\s+/g, ' ');
    if (k.length > 80) k = k.substring(0, 80);
    return k.trim();
  }
}
