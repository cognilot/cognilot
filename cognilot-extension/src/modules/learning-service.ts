/**
 * LearningService
 *
 * Continuously captures confirmed field values from user interactions
 * and syncs them to the Cognilot backend profile (for authenticated users)
 * or stores them locally in chrome.storage (for anonymous users).
 *
 * This creates a self-improving feedback loop:
 * 1. User accepts or corrects a suggestion.
 * 2. LearningService captures the confirmed value.
 * 3. Value is stored in the user's profile, improving future suggestions.
 *
 * Architecture:
 * - Anonymous: chrome.storage.local — no sync, no backend
 * - Authenticated: POST /api/profile/sync every SYNC_INTERVAL_MS
 */
export interface LearningEntry {
  /** Semantic field label (normalized) e.g. "email", "full_name" */
  key: string;
  /** The confirmed value */
  value: string;
  /** The domain where this value was confirmed */
  domain: string;
  /** ISO timestamp */
  confirmedAt: string;
}

/** Options for initializing the LearningService */
export interface LearningServiceConfig {
  /** Returns the current JWT, or null if anonymous */
  getAuthToken: () => Promise<string | null>;
  /** Base URL of the Cognilot API */
  apiBaseUrl: string;
  /** How often to flush the sync queue to the backend (ms). Default: 30000 */
  syncIntervalMs?: number;
}

export class LearningService {
  private static readonly STORAGE_KEY = 'cognilot_learned_fields';
  private static readonly SYNC_QUEUE_KEY = 'cognilot_sync_queue';
  private static readonly SYNC_INTERVAL_MS = 30_000;

  private config: LearningServiceConfig;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: LearningServiceConfig) {
    this.config = config;
  }

  /**
   * Starts the background sync interval.
   * Call this once from the extension's background script or content script init.
   */
  start(): void {
    if (this.syncTimer) return; // Guard against double-start

    const interval = this.config.syncIntervalMs ?? LearningService.SYNC_INTERVAL_MS;
    this.syncTimer = setInterval(() => {
      this.flushSyncQueue().catch((err) => {
        console.warn('[LearningService] Sync flush failed:', err);
      });
    }, interval);

    console.log(`[LearningService] Started. Sync interval: ${interval}ms`);
  }

  /**
   * Stops the background sync timer.
   * Call this when the sidebar or content script is torn down.
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Records a confirmed field value.
   * Called when the user accepts a suggestion or manually types a value
   * that should be remembered.
   *
   * @param key - Semantic field key (e.g. "email", "company_name")
   * @param value - The value to remember
   * @param domain - Current page domain (for context-aware future suggestions)
   */
  async confirm(key: string, value: string, domain: string): Promise<void> {
    if (!key || !value) return;

    const prefs = await chrome.storage.local.get('Cognilot_preference_cache');
    const settings = prefs.Cognilot_preference_cache || {};
    const useProfileContext = settings.copilotSuggestions?.useProfileContext !== false;
    if (!useProfileContext) {
      console.log('[LearningService] Skip confirm learning: useProfileContext is disabled');
      return;
    }

    const normalizedKey = this.normalizeKey(key);
    const entry: LearningEntry = {
      key: normalizedKey,
      value,
      domain,
      confirmedAt: new Date().toISOString(),
    };

    // Always save locally first (fast, works offline)
    await this.saveLocal(entry);

    // Queue for server sync (authenticated users only)
    const token = await this.config.getAuthToken();
    if (token) {
      await this.enqueueForSync(entry);
    }
  }

  /**
   * Retrieves a previously learned value for a field key.
   * Checks local storage only — server values are synced into local cache.
   *
   * @param key - Semantic field key
   * @returns The most recently confirmed value, or null
   */
  async recall(key: string): Promise<string | null> {
    const normalizedKey = this.normalizeKey(key);
    const data = await this.getLocalStore();
    return data[normalizedKey]?.value ?? null;
  }

  /**
   * Returns all learned field-value pairs.
   * Used by the profile page to display what the system has learned.
   */
  async getAll(): Promise<Record<string, LearningEntry>> {
    return this.getLocalStore();
  }

  /**
   * Immediately flushes the sync queue to the backend without waiting for
   * the next interval. Useful on auth events (login/logout).
   */
  async flushNow(): Promise<void> {
    await this.flushSyncQueue();
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private async saveLocal(entry: LearningEntry): Promise<void> {
    const store = await this.getLocalStore();
    store[entry.key] = entry;
    await chrome.storage.local.set({ [LearningService.STORAGE_KEY]: store });
  }

  private async getLocalStore(): Promise<Record<string, LearningEntry>> {
    const result = await chrome.storage.local.get(LearningService.STORAGE_KEY);
    return (result[LearningService.STORAGE_KEY] as Record<string, LearningEntry>) ?? {};
  }

  private async enqueueForSync(entry: LearningEntry): Promise<void> {
    const result = await chrome.storage.local.get(LearningService.SYNC_QUEUE_KEY);
    const queue: LearningEntry[] =
      (result[LearningService.SYNC_QUEUE_KEY] as LearningEntry[]) ?? [];

    // Deduplicate: if this key already exists in queue, replace it
    const dedupedQueue = queue.filter((e) => e.key !== entry.key);
    dedupedQueue.push(entry);

    await chrome.storage.local.set({ [LearningService.SYNC_QUEUE_KEY]: dedupedQueue });
  }

  private async flushSyncQueue(): Promise<void> {
    const token = await this.config.getAuthToken();
    if (!token) return; // No-op for anonymous users

    const result = await chrome.storage.local.get(LearningService.SYNC_QUEUE_KEY);
    const queue: LearningEntry[] =
      (result[LearningService.SYNC_QUEUE_KEY] as LearningEntry[]) ?? [];

    if (queue.length === 0) return;

    const payload = {
      sync_queue: queue.map((entry) => ({
        key: entry.key,
        value: entry.value,
        domain: entry.domain,
        confirmedAt: entry.confirmedAt,
      })),
    };

    const response = await fetch(`${this.config.apiBaseUrl}/api/profile/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      // Clear the queue only after a successful sync
      await chrome.storage.local.remove(LearningService.SYNC_QUEUE_KEY);
      console.log(`[LearningService] Synced ${queue.length} entries to backend.`);
    } else {
      console.warn(`[LearningService] Sync failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Normalizes a field label into a consistent storage key.
   * e.g. "Full Name" → "full_name", "E-mail Address" → "email_address"
   */
  private normalizeKey(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
