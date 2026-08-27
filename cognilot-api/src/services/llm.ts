import { ChatGroq } from '@langchain/groq';

/**
 * Shared Groq LLM client factory.
 * Used by suggestions, decision, and standardizer services.
 */
export function createGroqClient(modelName?: string, isVision = false, maxTokens = 2048) {
  let model = isVision ? 'qwen/qwen3.6-27b' : modelName || 'openai/gpt-oss-120b';
  if (!isVision && model === 'llama-3.3-70b-versatile') {
    model = 'openai/gpt-oss-120b';
  }
  return new ChatGroq({
    apiKey: process.env['GROQ_API_KEY']!,
    model: model,
    temperature: 0.3,
    maxTokens: maxTokens,
  });
}

/**
 * Extracts and parses the first JSON object from an LLM text response.
 * Resilient to trailing commas, markdown fences, and minor syntax anomalies.
 */
export function parseLLMJsonResponse<T>(content: unknown, fallback: T): T {
  let text = typeof content === 'string' ? content.trim() : '';
  if (!text) return fallback;

  // Strip markdown code fences if present
  text = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (_) {
    // Continue to extraction & sanitization
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    let rawJson = jsonMatch[0];
    try {
      return JSON.parse(rawJson);
    } catch (_) {
      try {
        // Sanitize trailing commas: ",}" -> "}", ",]" -> "]"
        rawJson = rawJson.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(rawJson);
      } catch (_) {
        try {
          // Attempt to fix unbalanced quotes and braces if response was cut off
          let repaired = rawJson;
          if ((repaired.match(/"/g) || []).length % 2 !== 0) {
            repaired += '"';
          }
          const openBraces = (repaired.match(/\{/g) || []).length;
          const closeBraces = (repaired.match(/\}/g) || []).length;
          if (openBraces > closeBraces) {
            repaired += '}'.repeat(openBraces - closeBraces);
          }
          return JSON.parse(repaired);
        } catch (_) {
          /* fall through to fallback */
        }
      }
    }
  }

  return fallback;
}
