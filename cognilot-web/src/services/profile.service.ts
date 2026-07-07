import {
  type ProfileDTO,
  type PreferencesDTO,
  type UserProfileResponse,
} from '../models/profile.dto';

// Variables for caching the profile to avoid redundant API calls
let cachedProfile: UserProfileResponse | null = null;
let profileFetchPromise: Promise<UserProfileResponse> | null = null;

const FETCH_TIMEOUT = 1000; // 1s timeout for extension response

export const profileService = {
  async getActiveProfile(forceRefresh = false): Promise<UserProfileResponse> {
    if (!forceRefresh && cachedProfile) {
      return cachedProfile;
    }

    if (!forceRefresh && profileFetchPromise) {
      return profileFetchPromise;
    }

    profileFetchPromise = (async () => {
      // 1. Try to fetch from Extension (Local-First is now mandatory)
      const [extensionProfile, extensionPrefs] = await Promise.all([
        this.getProfileFromExtension(),
        this.getPreferencesFromExtension(),
      ]);

      cachedProfile = {
        data_learned: extensionProfile || {},
        preferences: extensionPrefs || {},
      };

      profileFetchPromise = null;
      return cachedProfile;
    })();

    return profileFetchPromise;
  },

  /**
   * Helper to bridge with the extension's local cache
   */
  async getProfileFromExtension(): Promise<ProfileDTO | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        resolve(null);
      }, FETCH_TIMEOUT);

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'Cognilot_PROFILE_RESPONSE') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          resolve(event.data.payload);
        }
      };

      window.addEventListener('message', handleMessage);
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

  async updateProfile(data: UserProfileResponse): Promise<UserProfileResponse> {
    // Local-First: We ONLY save to the extension.
    if (data.data_learned) {
      window.postMessage({ type: 'Cognilot_SAVE_PROFILE', payload: data.data_learned }, '*');
    }

    if (data.preferences) {
      window.postMessage({ type: 'Cognilot_SAVE_PREFERENCES', payload: data.preferences }, '*');
    }

    cachedProfile = data;
    return data;
  },

  async createProfile(data: UserProfileResponse): Promise<UserProfileResponse> {
    // Same as update in Local-First
    return this.updateProfile(data);
  },

  clearCache(): void {
    cachedProfile = null;
    profileFetchPromise = null;
  },
};
