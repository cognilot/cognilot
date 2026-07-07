import type { InferenceProvider, CompletionOptions } from '../types.js';

/** Supported BYOK providers */
export type BYOKProviderType = 'openai' | 'anthropic' | 'groq';

/** BYOK API key configuration stored in user settings */
export interface BYOKConfig {
  provider: BYOKProviderType;
  apiKey: string;
  model?: string;
}

/**
 * BYOKProvider (Bring Your Own Key)
 *
 * Allows power users to use their own AI API keys.
 * Overrides both anonymous (Nano) and authenticated (Groq) routing.
 * The key is retrieved from the user's settings at inference time,
 * so no key is stored in the SDK class itself.
 *
 * Supported: OpenAI (gpt-4o-mini), Anthropic (claude-3-haiku), Groq (direct)
 */
export class BYOKProvider implements InferenceProvider {
  readonly name = 'byok';

  private getConfig: () => Promise<BYOKConfig | null>;

  constructor(getConfig: () => Promise<BYOKConfig | null>) {
    this.getConfig = getConfig;
  }

  /**
   * Returns true only if a valid BYOK configuration exists in user settings.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      return config !== null && config.apiKey.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Calls the user's chosen AI provider directly from the browser.
   * This is a client-side call — the key is sent directly to the AI provider.
   */
  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const config = await this.getConfig();

    if (!config || !config.apiKey) {
      throw new Error('[BYOKProvider] No API key configured.');
    }

    switch (config.provider) {
      case 'openai':
        return this.callOpenAI(prompt, config, options);
      case 'anthropic':
        return this.callAnthropic(prompt, config, options);
      case 'groq':
        return this.callGroqDirect(prompt, config, options);
      default:
        throw new Error(`[BYOKProvider] Unknown provider: ${(config as BYOKConfig).provider}`);
    }
  }

  private async callOpenAI(
    prompt: string,
    config: BYOKConfig,
    options: CompletionOptions
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model ?? 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              options.systemPrompt ??
              'You are a form autofill assistant. Return only the field value, no explanations.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: options.maxTokens ?? 256,
        temperature: options.temperature ?? 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`[BYOKProvider/OpenAI] ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content?.trim() ?? '';
  }

  private async callAnthropic(
    prompt: string,
    config: BYOKConfig,
    options: CompletionOptions
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model ?? 'claude-3-haiku-20240307',
        max_tokens: options.maxTokens ?? 256,
        system:
          options.systemPrompt ??
          'You are a form autofill assistant. Return only the field value, no explanations.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`[BYOKProvider/Anthropic] ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      content: Array<{ text: string }>;
    };
    return data.content[0]?.text?.trim() ?? '';
  }

  private async callGroqDirect(
    prompt: string,
    config: BYOKConfig,
    options: CompletionOptions
  ): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model ?? 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              options.systemPrompt ??
              'You are a form autofill assistant. Return only the field value, no explanations.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: options.maxTokens ?? 256,
        temperature: options.temperature ?? 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`[BYOKProvider/Groq] ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content?.trim() ?? '';
  }
}
