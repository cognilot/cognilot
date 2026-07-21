import { CognilotSDK } from '../index';
import { FieldDetectionResponse } from '../contracts/field-detection-response';
import { LabelUtil } from './label-util';

/**
 * ProfileResolver
 * Resolves form fields against stored profile values.
 *
 * Resolution strategy (delegated to AliasResolver for label→memoryKey mapping):
 * This class now only handles learned-key fallback (fields whose labels match
 * a key in the profile verbatim). The heuristic regex patterns have been
 * moved to AliasResolver's seed aliases for cleaner multilingual coverage.
 */
export class ProfileResolver {
  private sdk: CognilotSDK;

  constructor(sdk: CognilotSDK) {
    this.sdk = sdk;
  }

  private normalizeOptions(value: any): string[] {
    if (Array.isArray(value)) {
      return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
    }
    const single = String(value || '').trim();
    return single ? [single] : [];
  }

  async resolve(field: FieldDetectionResponse) {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return null;

    const result = await storage.get('Cognilot_profile_cache');
    const profile = result?.Cognilot_profile_cache || result || {};
    const flatProfile = profile.data_learned || profile || {};

    if (Object.keys(flatProfile).length === 0) return null;

    const label = LabelUtil.normalizeText(field.text);
    const name = LabelUtil.normalizeText(field.name || '');
    const id = LabelUtil.normalizeText(field.id || '');
    const placeholder = LabelUtil.normalizeText(field.placeholder || '');

    const allParts = [label, name, placeholder, id];
    const textToMatch = allParts.join(' ').trim();

    // Fallback to learned keys (exact match or include)
    const dataKeys = Object.keys(flatProfile).sort((a, b) => b.length - a.length);
    const matchedValues: string[] = [];
    let firstMatchedKey: string | undefined;

    for (const key of dataKeys) {
      if (['data_learned'].includes(key)) continue;

      const normalizedKey = LabelUtil.normalizeText(key).trim();
      const baseKey = normalizedKey.replace(/_\d+$/, '');

      if (
        (textToMatch.includes(normalizedKey) || textToMatch.includes(baseKey)) &&
        normalizedKey.length >= 3
      ) {
        if (!firstMatchedKey) firstMatchedKey = key;
        const value = flatProfile[key];
        const options = this.normalizeOptions(value);
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
          options: matchedValues,
          type: 'discrete',
          source: 'profile_cache',
        },
        memoryKey: firstMatchedKey,
        reasoning: `Learned Data Match`,
      };
    }

    return null;
  }

  /**
   * Merges standardized refinement data from the backend into the local profile cache.
   */
  async updateFromStandardizedData(standardizedProfile: Record<string, any>) {
    const settings = this.sdk.adapters?.settings
      ? await (this.sdk.adapters.settings as any).getSettings()
      : {};
    const useProfileContext = settings.copilotSuggestions?.useProfileContext !== false;
    if (!useProfileContext) return;

    const storage = this.sdk.adapters?.storage;
    if (!storage || !standardizedProfile) return;

    console.log(
      `[ProfileResolver] Merging standardized records:`,
      Object.keys(standardizedProfile)
    );

    console.log(`[ProfileResolver] Attempting to retrieve 'Cognilot_profile_cache' for update.`);
    const result = await storage.get('Cognilot_profile_cache');
    const profile = result?.Cognilot_profile_cache || result || {};
    console.log(`[ProfileResolver] Current profile cache before merge:`, profile);

    // We update the data directly at the root (Local-First pattern)
    for (const key in standardizedProfile) {
      const newValue = String(standardizedProfile[key]).trim();
      if (!newValue) continue;

      const oldValues = this.normalizeOptions(profile[key]);

      // Strategy: New value comes first, de-duplicate using Set, keep top 5
      const merged = [...new Set([newValue, ...oldValues])].slice(0, 5);
      profile[key] = merged;
    }

    try {
      await storage.set({ Cognilot_profile_cache: profile });
      console.log(`[ProfileResolver] ✅ Profile cache updated locally.`, profile);
    } catch (e) {
      console.error(`[ProfileResolver] ❌ Failed to save updated profile:`, e);
    }
  }

  /**
   * Public helper to retrieve the full profile cache.
   */
  async getProfile(): Promise<Record<string, any>> {
    const storage = this.sdk.adapters?.storage;
    if (!storage) return {};
    const result = await storage.get('Cognilot_profile_cache');
    return result?.Cognilot_profile_cache || result || {};
  }
}
