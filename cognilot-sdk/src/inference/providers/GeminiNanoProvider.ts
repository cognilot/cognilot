import type { InferenceProvider, CompletionOptions } from '../types.js';

/**
 * GeminiNanoProvider
 *
 * Uses the Chrome Built-in AI API (`window.ai.languageModel`) for local inference.
 * No network calls, no cost, no authentication required.
 * Only available in Chrome 127+ with the Prompt API flag enabled.
 *
 * @see https://developer.chrome.com/docs/extensions/ai/prompt-api
 */
export class GeminiNanoProvider implements InferenceProvider {
  readonly name = 'gemini-nano';

  /**
   * Checks whether the Chrome Prompt API is available in this browser session.
   * Returns false gracefully instead of throwing.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const ai = (window as any).ai;
      if (!ai?.languageModel) return false;

      // Chrome 127+ exposes a capabilities() check
      const capabilities = await ai.languageModel.capabilities?.();
      if (capabilities) {
        return capabilities.available === 'readily' || capabilities.available === 'after-download';
      }

      // Older API shape — assume available if the namespace exists
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Runs a prompt locally using Gemini Nano.
   * Creates a fresh session per call to avoid stale context.
   */
  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const ai = (window as any).ai;

    if (!ai?.languageModel) {
      throw new Error('[GeminiNanoProvider] window.ai.languageModel is not available.');
    }

    const session = await ai.languageModel.create({
      systemPrompt:
        options.systemPrompt ??
        'You are a helpful assistant that fills in web form fields accurately and concisely. ' +
          'Return only the value for the field, no explanations or formatting.',
      temperature: options.temperature ?? 0.2,
      topK: 5,
    });

    try {
      const result = await session.prompt(prompt);
      return typeof result === 'string' ? result.trim() : '';
    } finally {
      // Always destroy the session to free GPU memory
      session.destroy();
    }
  }
}
