import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createGroqClient, parseLLMJsonResponse } from './llm.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StandardizationResult {
  /** raw_label → canonical_key (only for labels that needed mapping) */
  mappings: Record<string, string>;
}

// ── Standardizer ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a key standardization system for user profile data.

Your task: given a list of raw field labels from HTML forms and a set of existing canonical keys
in the user's profile, map each raw label to the best matching canonical key — or create a new one.

## Rules

1. Use snake_case, lowercase for all canonical keys.
2. If a raw label is semantically equivalent to an existing canonical key, map to that key.
3. If no existing key fits, create a concise generic key in English.
4. Preserve existing canonical keys exactly — never rename them.
5. Group semantically equivalent labels under the same canonical key.
6. For person fields: use first_name, last_name, full_name.
7. For contact fields: use email, phone, address, city, country, zip_code.
8. For demographics: use age, weight, height, gender, nationality, dob, blood_type.
9. For professional: use company, job_title, degree, university.
10. Use the shortest, most generic label as the canonical key.
11. For Spanish labels, map to the English equivalent.

## Output

Respond ONLY with a JSON object. No markdown, no explanations.

Format:
{
  "mappings": {
    "raw_label_1": "canonical_key_1",
    "raw_label_2": "canonical_key_1"
  }
}

If ALL raw labels already ARE canonical keys (no mapping needed), return:
{
  "mappings": {}
}`;

/**
 * Given raw labels from the sync queue and existing canonical keys,
 * returns a mapping of raw labels → canonical keys.
 *
 * Labels that already ARE canonical keys are skipped (not included in the result).
 */
export async function standardizeKeys(
  rawLabels: string[],
  existingCanonicalKeys: string[]
): Promise<StandardizationResult> {
  // Deduplicate
  const uniqueLabels = [...new Set(rawLabels)];

  // Filter out labels that already ARE canonical keys
  const toMap = uniqueLabels.filter((l) => !existingCanonicalKeys.includes(l));

  if (toMap.length === 0) {
    console.log('[Standardizer] All labels already canonical, no LLM call needed.');
    return { mappings: {} };
  }

  console.log(`[Standardizer] Mapping ${toMap.length} raw label(s) to canonical keys...`, toMap);

  const llm = createGroqClient();

  const systemMessage = new SystemMessage(SYSTEM_PROMPT);
  const humanMessage = new HumanMessage(
    `Existing canonical keys: [${existingCanonicalKeys.join(', ')}]\n\nRaw labels to map:\n${toMap.map((l, i) => `${i + 1}. "${l}"`).join('\n')}`
  );

  const response = await llm.invoke([systemMessage, humanMessage]);

  const parsed = parseLLMJsonResponse(response.content, { mappings: {} as Record<string, string> });

  // Validate: ensure all mapped values are reasonable strings
  const validated: Record<string, string> = {};
  for (const [raw, canonical] of Object.entries(parsed.mappings)) {
    if (
      typeof raw === 'string' &&
      typeof canonical === 'string' &&
      raw.length > 0 &&
      canonical.length > 0 &&
      canonical.length <= 80
    ) {
      validated[raw] = canonical.trim().toLowerCase().replace(/\s+/g, '_');
    }
  }

  console.log('[Standardizer] Mappings:', validated);
  return { mappings: validated };
}
