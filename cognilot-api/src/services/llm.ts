import { ChatGroq } from '@langchain/groq';

/**
 * Shared Groq LLM client factory.
 * Used by suggestions, decision, and standardizer services.
 */
export function createGroqClient(modelName?: string, isVision = false) {
  let model = isVision ? 'qwen/qwen3.6-27b' : modelName || 'openai/gpt-oss-120b';
  if (!isVision && model === 'llama-3.3-70b-versatile') {
    model = 'openai/gpt-oss-120b';
  }
  return new ChatGroq({
    apiKey: process.env['GROQ_API_KEY']!,
    model: model,
    temperature: 0.3,
    maxTokens: 512,
  });
}

/**
 * Extracts and parses the first JSON object from an LLM text response.
 * Returns `fallback` if parsing fails.
 */
export function parseLLMJsonResponse<T>(content: unknown, fallback: T): T {
  const text = typeof content === 'string' ? content.trim() : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      /* fall through to fallback */
    }
  }
  return fallback;
}
