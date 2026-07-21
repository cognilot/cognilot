import { CognilotSDK } from '../index';
import { FieldDetectionResponse } from '../contracts/field-detection-response';
import { LabelUtil } from './label-util';

/**
 * AliasResolver
 * Maps field labels to memory profile keys.
 * Resolution flow: alias label → memoryKey → values from profile_cache.
 *
 * The alias cache stores { label → { memoryKey } } mappings.
 * When resolving, it looks up the memoryKey in profile_cache to return actual values.
 */
export class AliasResolver {
  private sdk: CognilotSDK;
  private _idleTimer: any = null;

  /**
   * Multilingual seed aliases — bootstraps label→memoryKey mapping without
   * needing learned aliases. Each entry defines pattern words in multiple
   * languages. The first matching entry (by textToMatch substring) wins.
   */
  private static readonly SEED_ALIASES: Array<{
    memoryKey: string;
    patterns: string[];
  }> = [
    { memoryKey: 'email', patterns: ['email', 'e-mail', 'mail', 'correo', 'почта'] },
    { memoryKey: 'username', patterns: ['username', 'user name', 'usuario', 'nick', 'handle'] },
    {
      memoryKey: 'phone',
      patterns: ['phone', 'teléfono', 'telefono', 'celular', 'movil', 'mobile', 'tel', 'телефон'],
    },
    {
      memoryKey: 'given_name',
      patterns: ['first name', 'given name', 'nombre', 'nombres', 'nome', 'prénom'],
    },
    {
      memoryKey: 'family_name',
      patterns: ['last name', 'family name', 'apellido', 'apellidos', 'surname', 'sobrenome'],
    },
    {
      memoryKey: 'full_name',
      patterns: ['full name', 'nombre completo', 'nome completo', 'полное имя'],
    },
    { memoryKey: 'country', patterns: ['country', 'país', 'pais', 'nation', 'pays', 'land'] },
    { memoryKey: 'city', patterns: ['city', 'ciudad', 'cidade', 'stadt', 'ville', 'città'] },
    {
      memoryKey: 'address',
      patterns: ['address', 'dirección', 'direccion', 'calle', 'street', 'endereço', 'adresse'],
    },
    {
      memoryKey: 'postal_code',
      patterns: ['zip', 'postal', 'código postal', 'codigo postal', 'code postal'],
    },
    {
      memoryKey: 'national_id',
      patterns: ['dni', 'cedula', 'national id', 'documento', 'id number', 'passport'],
    },
    { memoryKey: 'company', patterns: ['company', 'empresa', 'society', 'société'] },
    {
      memoryKey: 'job_title',
      patterns: ['job', 'cargo', 'puesto', 'posición', 'posicion', 'position', 'title', 'titre'],
    },
    {
      memoryKey: 'birth_date',
      patterns: ['birth', 'nacimiento', 'fecha', 'dob', 'date of birth', 'date naissance'],
    },
    {
      memoryKey: 'university',
      patterns: [
        'university',
        'universidad',
        'universidade',
        'université',
        'institution',
        'institución',
      ],
    },
    { memoryKey: 'degree', patterns: ['degree', 'carrera', 'título', 'titulo', 'diploma'] },
  ];

  constructor(sdk: CognilotSDK) {
    this.sdk = sdk;
    this.setupCleanupListeners();
  }

  private setupCleanupListeners() {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushQueue(true);
        }
      });

      window.addEventListener(
        'submit',
        () => {
          this.flushQueue();
        },
        true
      );
    }
  }

  async resolve(field: FieldDetectionResponse) {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return null;

    const result = await storage.get(['Cognilot_alias_cache', 'Cognilot_profile_cache']);
    const aliasCache = result?.Cognilot_alias_cache || {};
    const profile = result?.Cognilot_profile_cache || {};
    const flatProfile = profile.data_learned || profile || {};

    const normalizedLabel = LabelUtil.normalizeText(field.text);
    const normalizedName = LabelUtil.normalizeText(field.name || '');
    const normalizedPlaceholder = LabelUtil.normalizeText(field.placeholder || '');
    const normalizedId = LabelUtil.normalizeText(field.id || '');

    const textToMatch = [normalizedLabel, normalizedName, normalizedPlaceholder, normalizedId]
      .join(' ')
      .trim();
    const exactParts = [
      normalizedLabel,
      normalizedName,
      normalizedPlaceholder,
      normalizedId,
    ].filter((p) => p.length >= 2);

    // 1. Direct label match (learned alias cache)
    const labelKey = this.normalizeAliasKey(normalizedLabel);
    if (labelKey && aliasCache[labelKey]) {
      return this._resolveAlias(aliasCache, labelKey, flatProfile);
    }

    // 2. Seed aliases (multilingual bootstrap dictionary)
    const seedResult = this._matchSeedAliases(textToMatch, flatProfile);
    if (seedResult) return seedResult;

    // 3. Fallback: name/placeholder/id match (learned alias cache)
    for (const aliasKey in aliasCache) {
      if (aliasKey === labelKey) continue;

      const normAlias = LabelUtil.normalizeText(aliasKey);
      if (
        exactParts.includes(normAlias) ||
        (textToMatch.includes(normAlias) && normAlias.length >= 4)
      ) {
        return this._resolveAlias(aliasCache, aliasKey, flatProfile);
      }
    }

    return null;
  }

  private _resolveAlias(
    aliasCache: Record<string, { memoryKey: string }>,
    key: string,
    flatProfile: Record<string, unknown>
  ) {
    const entry = aliasCache[key];
    if (!entry || !entry.memoryKey) return null;

    const raw = flatProfile[entry.memoryKey];
    const options = this._normalizeOptions(raw);
    if (options.length === 0) return null;

    return {
      success: true,
      suggestion: {
        options: options.slice(0, 5),
        type: 'discrete',
        source: 'alias_cache',
      },
      memoryKey: entry.memoryKey,
      reasoning: `Alias → memoryKey "${entry.memoryKey}" → ${options.length} value(s)`,
    };
  }

  private _normalizeOptions(value: unknown): string[] {
    if (Array.isArray(value)) {
      return [...new Set(value.map((v) => String(v || '').trim()).filter(Boolean))];
    }
    const single = String(value || '').trim();
    return single ? [single] : [];
  }

  /**
   * Matches field text against the multilingual seed alias dictionary.
   * Returns the first seed entry whose pattern appears in textToMatch,
   * resolved against the profile cache.
   */
  private _matchSeedAliases(textToMatch: string, flatProfile: Record<string, unknown>) {
    for (const entry of AliasResolver.SEED_ALIASES) {
      const matchingPattern = entry.patterns.find((pattern) => {
        const normPattern = LabelUtil.normalizeText(pattern);
        return normPattern.length >= 3 && textToMatch.includes(normPattern);
      });
      if (!matchingPattern) continue;

      const raw = flatProfile[entry.memoryKey];
      const options = this._normalizeOptions(raw);
      if (options.length === 0) continue;

      return {
        success: true,
        suggestion: {
          options: options.slice(0, 5),
          type: 'discrete',
          source: 'alias_cache',
        },
        memoryKey: entry.memoryKey,
        reasoning: `Seed alias "${matchingPattern}" → memoryKey "${entry.memoryKey}" → ${options.length} value(s)`,
      };
    }
    return null;
  }

  private _learningLock = new Map<string, number>();

  /**
   * When user confirms a suggestion, sync the learned value to memory (profile sync).
   * Also updates local caches immediately so the value is available on the next trigger
   * without waiting for the sync roundtrip.
   */
  async persistAlias(label: string, value: string, skipSync = false) {
    const settings = this.sdk.adapters?.settings
      ? await (this.sdk.adapters.settings as any).getSettings()
      : {};
    const useProfileContext = settings.copilotSuggestions?.useProfileContext !== false;
    if (!useProfileContext) return false;

    const auth = this.sdk.adapters?.auth;
    const authenticated = auth ? await auth.isAuthenticated() : false;
    if (!authenticated) skipSync = true;

    const aliasKey = this.normalizeAliasKey(LabelUtil.normalizeText(label));
    if (!aliasKey) return false;

    const trimmedValue = String(value).trim();
    if (!trimmedValue) return false;

    const lockKey = `${aliasKey}:${trimmedValue.toLowerCase()}`;
    const now = Date.now();
    const lastLearn = this._learningLock.get(lockKey);
    if (lastLearn && now - lastLearn < 2000) return false;
    this._learningLock.set(lockKey, now);

    const storage = this.sdk.adapters?.storage;
    if (!storage) return false;

    // ── 1. Update local profile_cache immediately ────────────────────────
    try {
      const profileResult = await storage.get('Cognilot_profile_cache');
      const profileCache =
        (profileResult?.Cognilot_profile_cache as Record<string, unknown>) || profileResult || {};
      const existing = Array.isArray(profileCache[aliasKey])
        ? (profileCache[aliasKey] as string[])
        : [];
      if (!existing.includes(trimmedValue)) {
        profileCache[aliasKey] = [...existing, trimmedValue].slice(0, 20);
        await storage.set({ Cognilot_profile_cache: profileCache });
      }
    } catch (e) {
      console.warn('[AliasResolver] Failed to update local profile cache:', e);
    }

    // ── 2. Auto-create self-referencing alias locally (label → label) ────
    try {
      const aliasResult = await storage.get('Cognilot_alias_cache');
      const aliasCache =
        (aliasResult?.Cognilot_alias_cache as Record<string, { memoryKey: string }>) || {};
      if (!aliasCache[aliasKey]) {
        aliasCache[aliasKey] = { memoryKey: aliasKey };
        await storage.set({ Cognilot_alias_cache: aliasCache });
      }
    } catch (e) {
      console.warn('[AliasResolver] Failed to update local alias cache:', e);
    }

    // ── 3. Enqueue for backend sync (background) ────────────────────────
    const result = await storage.get('Cognilot_sync_queue');
    let syncQueue = result?.Cognilot_sync_queue || [];

    const alreadyInQueue = syncQueue.some(
      (item: any) =>
        item.label === aliasKey &&
        String(item.value).trim().toLowerCase() === trimmedValue.toLowerCase()
    );

    if (!alreadyInQueue) {
      syncQueue.push({ label: aliasKey, value: trimmedValue, timestamp: now });
      if (syncQueue.length > 20) syncQueue = syncQueue.slice(-20);
      await storage.set({ Cognilot_sync_queue: syncQueue });
      this.scheduleIdleSync();
    }

    return true;
  }

  /**
   * Updates the local alias cache from API data.
   * Called by the extension after fetching aliases from the backend.
   * Cache structure: { label: { memoryKey: string } }
   */
  async updateAliasCache(aliases: Array<{ label: string; memoryKey: string }>) {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return;

    const cache: Record<string, { memoryKey: string }> = {};
    for (const a of aliases) {
      const key = this.normalizeAliasKey(LabelUtil.normalizeText(a.label));
      if (key && a.memoryKey) {
        cache[key] = { memoryKey: a.memoryKey };
      }
    }

    await storage.set({ Cognilot_alias_cache: cache });
  }

  private scheduleIdleSync() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      this.flushQueue();
    }, 5000);
  }

  async flushQueue(keepalive = false) {
    const settings = this.sdk.adapters?.settings
      ? await (this.sdk.adapters.settings as any).getSettings()
      : {};
    const useProfileContext = settings.copilotSuggestions?.useProfileContext !== false;
    if (!useProfileContext) return;

    const queue = await this.getSyncQueue();
    if (queue.length === 0) return;

    console.log(
      `[AliasResolver] Flushing sync queue (${queue.length} items, keepalive=${keepalive})...`
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
        { sync_queue: formattedQueue },
        'AliasResolver',
        { keepalive }
      );

      if (response) {
        // ── Update profile_cache with canonical dataLearned ──────────────
        if (response.profile?.dataLearned && this.sdk.profile) {
          await this.sdk.profile.updateFromStandardizedData(response.profile.dataLearned);
        }

        // ── Merge server-created aliases into local alias_cache ─────────
        if (Array.isArray(response.newAliases) && response.newAliases.length > 0) {
          const storage = this.sdk.adapters?.storage;
          if (storage) {
            const aliasResult = await storage.get('Cognilot_alias_cache');
            const aliasCache =
              (aliasResult?.Cognilot_alias_cache as Record<string, { memoryKey: string }>) || {};

            for (const a of response.newAliases) {
              const key = this.normalizeAliasKey(LabelUtil.normalizeText(a.label));
              if (key && a.memoryKey) {
                aliasCache[key] = { memoryKey: a.memoryKey };
              }
            }

            await storage.set({ Cognilot_alias_cache: aliasCache });
            console.log(
              `[AliasResolver] Merged ${response.newAliases.length} new alias(es) from server.`
            );
          }
        }
      }

      await this.clearSyncQueue();
    } catch (e) {
      console.warn('[AliasResolver] Failed to flush queue:', e);
    }
  }

  async getSyncQueue() {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return [];
    const result = await storage.get('Cognilot_sync_queue');
    return result?.Cognilot_sync_queue || [];
  }

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
