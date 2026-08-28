import { type MemoryDTO, type PreferencesDTO, type UserMemoryResponse } from '../models/memory.dto';

// Variables for caching the memory to avoid redundant calls
let cachedMemory: UserMemoryResponse | null = null;
let memoryFetchPromise: Promise<UserMemoryResponse> | null = null;

const FETCH_TIMEOUT = 1000; // 1s timeout for extension response

export const memoryService = {
  async getActiveMemory(forceRefresh = false): Promise<UserMemoryResponse> {
    if (!forceRefresh && cachedMemory) {
      return cachedMemory;
    }

    if (!forceRefresh && memoryFetchPromise) {
      return memoryFetchPromise;
    }

    memoryFetchPromise = (async () => {
      // 1. Try to fetch from Extension (Local-First)
      const [extensionMemory, extensionPrefs] = await Promise.all([
        this.getMemoryFromExtension(),
        this.getPreferencesFromExtension(),
      ]);

      cachedMemory = {
        data: extensionMemory || {},
        data_learned: extensionMemory || {},
        preferences: extensionPrefs || {},
      };

      memoryFetchPromise = null;
      return cachedMemory;
    })();

    return memoryFetchPromise;
  },

  /** Backwards compatibility alias */
  async getActiveProfile(forceRefresh = false): Promise<UserMemoryResponse> {
    return this.getActiveMemory(forceRefresh);
  },

  /**
   * Helper to bridge with the extension's local cache
   */
  async getMemoryFromExtension(): Promise<MemoryDTO | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        resolve(null);
      }, FETCH_TIMEOUT);

      const handleMessage = (event: MessageEvent) => {
        if (
          event.data.type === 'Cognilot_MEMORY_RESPONSE' ||
          event.data.type === 'Cognilot_PROFILE_RESPONSE'
        ) {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          resolve(event.data.payload);
        }
      };

      window.addEventListener('message', handleMessage);
      window.postMessage({ type: 'Cognilot_GET_MEMORY' }, '*');
      window.postMessage({ type: 'Cognilot_GET_PROFILE' }, '*');
    });
  },

  async getPreferencesFromExtension(): Promise<PreferencesDTO | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        resolve(null);
      }, FETCH_TIMEOUT);

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'Cognilot_PREFERENCES_RESPONSE') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          resolve(event.data.payload);
        }
      };

      window.addEventListener('message', handleMessage);
      window.postMessage({ type: 'Cognilot_GET_PREFERENCES' }, '*');
    });
  },

  async updateMemory(data: UserMemoryResponse): Promise<UserMemoryResponse> {
    // Local-First: We ONLY save to the extension.
    const memoryData = data.data || data.data_learned;
    if (memoryData) {
      window.postMessage({ type: 'Cognilot_SAVE_MEMORY', payload: memoryData }, '*');
      window.postMessage({ type: 'Cognilot_SAVE_PROFILE', payload: memoryData }, '*');
    }

    if (data.preferences) {
      window.postMessage({ type: 'Cognilot_SAVE_PREFERENCES', payload: data.preferences }, '*');
    }

    cachedMemory = data;
    return data;
  },

  async updateProfile(data: UserMemoryResponse): Promise<UserMemoryResponse> {
    return this.updateMemory(data);
  },

  async createProfile(data: UserMemoryResponse): Promise<UserMemoryResponse> {
    return this.updateMemory(data);
  },

  clearCache(): void {
    cachedMemory = null;
    memoryFetchPromise = null;
  },
};

export const profileService = memoryService;
