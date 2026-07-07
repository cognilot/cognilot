import { CognilotSDK } from '../index';
import { FieldDetectionResponse } from '../contracts/field-detection-response';
import { LabelUtil } from './label-util';

/**
 * ProfileResolver
 * Responsible for matching profile data (from chrome.storage.local.Cognilot_profile_cache)
 * with form fields based on heuristic regex and historical patterns.
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

    // Get the profile cache from storage (this comes from chrome.storage.local)
    const result = await storage.get('Cognilot_profile_cache');
    const profile = result?.Cognilot_profile_cache || result || {};

    // Support both flattened and nested (legacy) data_learned structures
    const flatProfile = profile.data_learned || profile || {};

    if (Object.keys(flatProfile).length === 0) return null;

    const label = LabelUtil.normalizeText(field.text);
    const name = LabelUtil.normalizeText(field.name || '');
    const id = LabelUtil.normalizeText(field.id || '');
    const placeholder = LabelUtil.normalizeText(field.placeholder || '');

    const allParts = [label, name, placeholder, id];
    const textToMatch = allParts.join(' ').trim();
    const exactParts = allParts.filter((p) => (p as string).length >= 2);

    const match = (patterns: RegExp[], value: any) => {
      if (!value) return null;
      for (const p of patterns) {
        // Check if pattern is anchored
        if (p.source.startsWith('^') || p.source.endsWith('$')) {
          if (exactParts.some((part) => p.test(part as string))) {
            const options = this.normalizeOptions(value);
            if (options.length > 0)
              return {
                success: true,
                suggestion: {
                  options,
                  type: 'discrete',
                  source: 'profile_cache',
                },
                reasoning: `Profile Match: ${p.source}`,
              };
          }
        } else {
          if (p.test(textToMatch)) {
            const options = this.normalizeOptions(value);
            if (options.length > 0)
              return {
                success: true,
                suggestion: {
                  options,
                  type: 'discrete',
                  source: 'profile_cache',
                },
                reasoning: `Profile Match: ${p.source}`,
              };
          }
        }
      }
      return null;
    };

    // 1. Core Heuristics (Regex)
    let res = match(
      [/^(name|nombre|nombres)$/i, /full\s?name|nombre\s?completo/i],
      flatProfile.full_name || flatProfile.names
    );
    if (res) return res;

    res = match(
      [/^(first\s?name|given\s?name|nombre|nombres)$/i, /first_name|given_name/i],
      flatProfile.first_name || flatProfile.names
    );
    if (res) return res;

    res = match(
      [
        /^(last\s?name|family\s?name|apellido|apellidos|surnames)$/i,
        /last_name|family_name/i,
        /surname/i,
      ],
      flatProfile.last_name || flatProfile.surnames
    );
    if (res) return res;

    res = match([/e-?mail|correo|email/i], flatProfile.email);
    if (res) return res;

    res = match([/phone|telefono|celular|movil/i], flatProfile.phone_number || flatProfile.phone);
    if (res) return res;

    res = match([/dni|cedula|national\s?id|documento/i], flatProfile.national_id);
    if (res) return res;

    res = match([/address|direccion|calle/i], flatProfile.address);
    if (res) return res;

    res = match([/city|ciudad/i], flatProfile.city);
    if (res) return res;

    res = match([/zip|postal|codigo\s?postal/i], flatProfile.postal_code || flatProfile.zip);
    if (res) return res;

    res = match([/country|pais/i], flatProfile.country);
    if (res) return res;

    res = match([/company|empresa/i], flatProfile.company);
    if (res) return res;

    res = match(
      [/job|cargo|puesto|posicion|position/i],
      flatProfile.job_title || flatProfile.position
    );
    if (res) return res;

    res = match([/birth|nacimiento|fecha|dob/i], flatProfile.birth_date);
    if (res) return res;

    res = match([/university|universidad/i], flatProfile.university || flatProfile.institution);
    if (res) return res;

    res = match([/degree|carrera|titulo/i], flatProfile.degree);
    if (res) return res;

    // 2. Fallback to learned keys (exact match or include)
    const dataKeys = Object.keys(flatProfile).sort((a, b) => b.length - a.length);
    const matchedValues: string[] = [];

    for (const key of dataKeys) {
      if (['data_learned'].includes(key)) continue;

      const normalizedKey = LabelUtil.normalizeText(key).trim();
      const baseKey = normalizedKey.replace(/_\d+$/, '');

      if (
        (textToMatch.includes(normalizedKey) || textToMatch.includes(baseKey)) &&
        normalizedKey.length >= 3
      ) {
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
        reasoning: `Learned Data Match`,
      };
    }

    return null;
  }

  /**
   * Merges standardized refinement data from the backend into the local profile cache.
   */
  async updateFromStandardizedData(standardizedProfile: Record<string, any>) {
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
