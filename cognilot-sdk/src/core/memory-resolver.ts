import { CognilotSDK } from '../index';
import { FieldDetectionResponse } from '../contracts/field-detection-response';
import { LabelUtil } from './label-util';

/**
 * MemoryResolver
 * Unifies local memory resolution, multilingual seed matching, and sync queue persistence.
 * Resolution flow: field label / identifier → seed dictionary / exact key → values from memory cache.
 */
export class MemoryResolver {
  private sdk: CognilotSDK;
  private _idleTimer: any = null;
  private _learningLock = new Map<string, number>();

  /**
   * Multilingual seed dictionary — bootstraps label→memoryKey mapping without
   * needing learned memory keys. Each entry defines pattern words in multiple languages.
   */
  private static readonly SEED_DICTIONARY: Array<{
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
    {
      memoryKey: 'social_profile',
      patterns: [
        'social profile',
        'social account',
        'perfil social',
        'redes sociales',
        'social link',
        'red social',
      ],
    },
    {
      memoryKey: 'linkedin',
      patterns: ['linkedin', 'linked in'],
    },
    {
      memoryKey: 'github',
      patterns: ['github', 'git hub'],
    },
    {
      memoryKey: 'twitter',
      patterns: ['twitter', 'x.com', 'cuenta de x'],
    },
    {
      memoryKey: 'portfolio',
      patterns: ['portfolio', 'portafolio', 'website', 'sitio web', 'blog', 'personal site'],
    },
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

  /**
   * Resolves a detected field against local memory cache using:
   * 1. Multilingual seed dictionary.
   * 2. Direct exact memory key matching.
   */
  async resolve(field: FieldDetectionResponse) {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return null;

    const result = await storage.get(['Cognilot_memory_cache', 'Cognilot_profile_cache']);
    const memCache =
      result?.Cognilot_memory_cache || result?.Cognilot_profile_cache || result || {};
    const flatMemory = memCache.data || memCache.data_learned || memCache || {};

    const normalizedLabel = LabelUtil.normalizeText(field.text);
    const normalizedName = LabelUtil.normalizeText(field.name || '');
    const normalizedPlaceholder = LabelUtil.normalizeText(field.placeholder || '');
    const normalizedId = LabelUtil.normalizeText(field.id || '');

    const textToMatch = [normalizedLabel, normalizedName, normalizedPlaceholder, normalizedId]
      .join(' ')
      .trim();

    // Security Gate: Never resolve passwords or sensitive fields from global memory
    const isSensitive = /(password|contrase|clave|secret|pin|cvv|cvc|token)/i.test(
      `${textToMatch} ${field.type || ''}`
    );
    if (isSensitive || field.type === 'password') {
      return null;
    }

    // 1. Match seed dictionary
    const seedResult = this._matchSeedDictionary(textToMatch, flatMemory);
    if (seedResult) return seedResult;

    // 2. Fallback to learned memory keys
    const directResult = this._matchDirectMemoryKeys(textToMatch, flatMemory);
    if (directResult) return directResult;

    return null;
  }

  private _normalizeOptions(value: unknown): string[] {
    if (Array.isArray(value)) {
      return [...new Set(value.map((v) => String(v || '').trim()).filter(Boolean))];
    }
    const single = String(value || '').trim();
    return single ? [single] : [];
  }

  private _matchSeedDictionary(textToMatch: string, flatMemory: Record<string, unknown>) {
    for (const entry of MemoryResolver.SEED_DICTIONARY) {
      const matchingPattern = entry.patterns.find((pattern) => {
        const normPattern = LabelUtil.normalizeText(pattern);
        return normPattern.length >= 3 && textToMatch.includes(normPattern);
      });
      if (!matchingPattern) continue;

      const raw = flatMemory[entry.memoryKey];
      const options = this._normalizeOptions(raw);
      if (options.length === 0) continue;

      return {
        success: true,
        suggestion: {
          options: options.slice(0, 5),
          type: 'discrete',
          source: 'memory',
        },
        memoryKey: entry.memoryKey,
        reasoning: `Seed "${matchingPattern}" → key "${entry.memoryKey}" → ${options.length} value(s)`,
      };
    }
    return null;
  }

  private _matchDirectMemoryKeys(textToMatch: string, flatMemory: Record<string, unknown>) {
    const dataKeys = Object.keys(flatMemory).sort((a, b) => b.length - a.length);
    const matchedValues: string[] = [];
    let firstMatchedKey: string | undefined;

    for (const key of dataKeys) {
      if (
        ['data', 'data_learned'].includes(key) ||
        /(password|contrase|clave|secret|pin|cvv|cvc|token)/i.test(key)
      )
        continue;

      const normalizedKey = LabelUtil.normalizeText(key).trim();
      const baseKey = normalizedKey.replace(/_\d+$/, '');

      if (
        (textToMatch.includes(normalizedKey) || textToMatch.includes(baseKey)) &&
        normalizedKey.length >= 3
      ) {
        if (!firstMatchedKey) firstMatchedKey = key;
        const value = flatMemory[key];
        const options = this._normalizeOptions(value);
        for (const option of options) {
          if (!matchedValues.includes(option)) {
            matchedValues.push(option);
          }
        }
      }
    }

    if (matchedValues.length > 0) {
      return {
        success: true,
        suggestion: {
          options: matchedValues.slice(0, 5),
          type: 'discrete',
          source: 'memory',
        },
        memoryKey: firstMatchedKey,
        reasoning: `Direct Memory Key Match`,
      };
    }

    return null;
  }

  /**
   * When user confirms a suggestion, enqueue the raw label and value directly
   * into Cognilot_sync_queue for background LLM standardization.
   */
  async enqueueLearning(label: string, value: string, skipSync = false) {
    const settings = this.sdk.adapters?.settings
      ? await (this.sdk.adapters.settings as any).getSettings()
      : {};
    const useProfileContext = settings.copilotSuggestions?.useProfileContext !== false;
    if (!useProfileContext) return false;

    const auth = this.sdk.adapters?.auth;
    const authenticated = auth ? await auth.isAuthenticated() : false;
    if (!authenticated) skipSync = true;

    const memoryKey = this.normalizeKey(LabelUtil.normalizeText(label));
    if (!memoryKey) return false;

    // Security Gate: Never persist passwords, PINs, secrets, or CVVs
    if (
      /(password|contrase|clave|secret|pin|cvv|cvc|token|auth_token)/i.test(`${memoryKey} ${label}`)
    ) {
      console.warn(
        `[MemoryResolver] Blocked persistence of sensitive/password key: "${memoryKey}"`
      );
      return false;
    }

    const trimmedValue = String(value).trim();
    if (!trimmedValue) return false;

    const lockKey = `${memoryKey}:${trimmedValue.toLowerCase()}`;
    const now = Date.now();
    const lastLearn = this._learningLock.get(lockKey);
    if (lastLearn && now - lastLearn < 2000) return false;
    this._learningLock.set(lockKey, now);

    const storage = this.sdk.adapters?.storage;
    if (!storage) return false;

    const result = await storage.get('Cognilot_sync_queue');
    let syncQueue = result?.Cognilot_sync_queue || [];

    const alreadyInQueue = syncQueue.some(
      (item: any) =>
        item.label === memoryKey &&
        String(item.value).trim().toLowerCase() === trimmedValue.toLowerCase()
    );

    if (!alreadyInQueue) {
      syncQueue.push({ label: memoryKey, value: trimmedValue, timestamp: now });
      if (syncQueue.length > 20) syncQueue = syncQueue.slice(-20);
      await storage.set({ Cognilot_sync_queue: syncQueue });
      if (!skipSync) {
        this.scheduleIdleSync();
      }
    }

    return true;
  }

  /** Backwards compatibility alias for enqueueLearning */
  async persistAlias(label: string, value: string, skipSync = false) {
    return this.enqueueLearning(label, value, skipSync);
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

    const snapshot = [...queue];

    console.log(
      `[MemoryResolver] Flushing sync queue (${snapshot.length} items, keepalive=${keepalive})...`
    );

    try {
      const globalContext = this.sdk.platform.getGlobalContext();
      const formattedQueue = snapshot.map((item: any) => ({
        key: item.label,
        value: item.value,
        domain: globalContext.location.hostname || 'unknown',
        confirmedAt: new Date(item.timestamp || Date.now()).toISOString(),
      }));

      const response = await this.sdk.apiClient.request(
        '/api/memory/sync',
        { sync_queue: formattedQueue },
        'MemoryResolver',
        { keepalive }
      );

      if (response) {
        const standardizedData =
          response.memory?.data || response.profile?.dataLearned || response.data;
        if (standardizedData) {
          await this.updateFromStandardizedData(standardizedData);
        }
        await this.clearSyncQueue(snapshot);
      }
    } catch (e) {
      console.warn('[MemoryResolver] Failed to flush queue:', e);
    }
  }

  async updateFromStandardizedData(standardizedData: Record<string, any>) {
    const storage = this.sdk.adapters?.storage;
    if (!storage || !standardizedData) return;

    const result = await storage.get(['Cognilot_memory_cache', 'Cognilot_profile_cache']);
    const mem = result?.Cognilot_memory_cache || result?.Cognilot_profile_cache || {};

    for (const key in standardizedData) {
      if (/(password|contrase|clave|secret|pin|cvv|cvc|token)/i.test(key)) continue;
      const newValue = String(standardizedData[key]).trim();
      if (!newValue) continue;

      const oldValues = this._normalizeOptions(mem[key]);
      const merged = [...new Set([newValue, ...oldValues])].slice(0, 5);
      mem[key] = merged;
    }

    try {
      await storage.set({
        Cognilot_memory_cache: mem,
        Cognilot_profile_cache: mem, // compatibility
      });
      console.log(`[MemoryResolver] ✅ Memory cache updated locally.`);
    } catch (e) {
      console.error(`[MemoryResolver] ❌ Failed to save updated memory:`, e);
    }
  }

  async getMemory(): Promise<Record<string, any>> {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return {};
    const result = await storage.get(['Cognilot_memory_cache', 'Cognilot_profile_cache']);
    return result?.Cognilot_memory_cache || result?.Cognilot_profile_cache || result || {};
  }

  /** Backwards compatibility alias */
  async getProfile(): Promise<Record<string, any>> {
    return this.getMemory();
  }

  async getSyncQueue() {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return [];
    const result = await storage.get('Cognilot_sync_queue');
    return result?.Cognilot_sync_queue || [];
  }

  async clearSyncQueue(flushedItems?: any[]) {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return;

    if (!flushedItems || flushedItems.length === 0) {
      await storage.set({ Cognilot_sync_queue: [] });
      return;
    }

    const currentQueue = await this.getSyncQueue();
    const remaining = currentQueue.filter(
      (item: any) =>
        !flushedItems.some(
          (flushed: any) =>
            flushed.label === item.label &&
            flushed.value === item.value &&
            flushed.timestamp === item.timestamp
        )
    );

    await storage.set({ Cognilot_sync_queue: remaining });
  }

  private normalizeKey(label: string): string {
    if (!label) return '';
    let k = label.trim().toLowerCase();
    k = k.replace(/[\n\r]+/g, ' ');
    k = k.replace(/\s+/g, ' ');
    if (k.length > 80) k = k.substring(0, 80);
    return k.trim();
  }
}
