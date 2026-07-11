import type { InferenceProvider, CompletionOptions } from '../types.js';
import { PromptTemplateManager } from '../PromptTemplateManager.js';

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
  private getProfile?: () => Promise<any>;
  private templateManager?: PromptTemplateManager;

  constructor(
    getConfig: () => Promise<BYOKConfig | null>,
    getProfile?: () => Promise<any>,
    templateManager?: PromptTemplateManager
  ) {
    this.getConfig = getConfig;
    this.getProfile = getProfile;
    this.templateManager = templateManager;
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

  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const config = await this.getConfig();

    if (!config || !config.apiKey) {
      throw new Error('[BYOKProvider] No API key configured.');
    }

    // 1. Parse prompt variables
    const label = this.extractFromPrompt(prompt, 'Field') ?? 'unknown';
    const type = this.extractFromPrompt(prompt, 'Type') ?? 'text';
    const placeholder = this.extractFromPrompt(prompt, 'Placeholder') ?? '';
    const value = this.extractFromPrompt(prompt, 'Current Value') ?? '';
    const formContext = this.extractFromPrompt(prompt, 'Form Context') ?? '';
    const pageUrl = this.extractFromPrompt(prompt, 'URL') ?? '';
    const pageTitle = this.extractFromPrompt(prompt, 'Page') ?? '';

    // 2. Fetch template
    let template = '';
    if (this.templateManager) {
      template = await this.templateManager.getTemplate();
    } else {
      template = `You are an intelligent form autofill assistant.
Your job is to suggest the most appropriate value for a web form field based on the user's profile data and the page context.

## User Profile Data:
{{PROFILE_CONTEXT}}

## Instructions:
- Return ONLY the value to fill in the field. No explanations, no quotes, no markdown.
- Respond in {{LANGUAGE}}.
- If you cannot confidently determine the value, return an empty string.

Fill in this form field:
Field Label: {{FIELD_LABEL}}
Field Type: {{FIELD_TYPE}}
Placeholder: {{FIELD_PLACEHOLDER}}
Current Value: {{FIELD_VALUE}}
Form Context: {{FIELD_CONTEXT}}
Page: {{PAGE_TITLE}} ({{PAGE_URL}})`;
    }

    // 3. Load profile
    const profile = this.getProfile ? await this.getProfile() : {};
    const profileData = profile.data_learned || profile || {};

    // 4. Interpolate template
    let finalPrompt = template;
    finalPrompt = finalPrompt.replace('{{PROFILE_CONTEXT}}', JSON.stringify(profileData, null, 2));
    finalPrompt = finalPrompt.replace('{{LANGUAGE}}', options.language || 'English');
    finalPrompt = finalPrompt.replace('{{FIELD_LABEL}}', label);
    finalPrompt = finalPrompt.replace('{{FIELD_TYPE}}', type);
    finalPrompt = finalPrompt.replace('{{FIELD_PLACEHOLDER}}', placeholder);
    finalPrompt = finalPrompt.replace('{{FIELD_VALUE}}', value);
    finalPrompt = finalPrompt.replace('{{FIELD_CONTEXT}}', formContext);
    finalPrompt = finalPrompt.replace('{{PAGE_TITLE}}', pageTitle);
    finalPrompt = finalPrompt.replace('{{PAGE_URL}}', pageUrl);

    switch (config.provider) {
      case 'openai':
        return this.callOpenAI(finalPrompt, config, options);
      case 'anthropic':
        return this.callAnthropic(finalPrompt, config, options);
      case 'groq':
        return this.callGroqDirect(finalPrompt, config, options);
      default:
        throw new Error(`[BYOKProvider] Unknown provider: ${(config as BYOKConfig).provider}`);
    }
  }

  private extractFromPrompt(prompt: string, key: string): string | undefined {
    const match = prompt.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return match?.[1]?.trim();
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
