import type { InferenceProvider, CompletionOptions } from '../types.js';

/** Configuration for the GroqProvider */
export interface GroqProviderConfig {
  /** Base URL of the Cognilot API (e.g. https://api.cognilot.app) */
  apiBaseUrl: string;
  /** A function that returns the current JWT, or null if not logged in */
  getAuthToken: () => Promise<string | null>;
}

/**
 * GroqProvider
 *
 * Routes inference to the Cognilot backend (`POST /api/suggestions/v2`).
 * Only active for authenticated users — sends the JWT in the Authorization header.
 * The backend uses Groq (Llama 3.3 70B) and personalizes results using the
 * user's stored profile data and aliases.
 */
export class GroqProvider implements InferenceProvider {
  readonly name = 'groq-llama3';

  private config: GroqProviderConfig;

  constructor(config: GroqProviderConfig) {
    this.config = config;
  }

  /**
   * Returns true only if a valid auth token is available.
   * Does NOT validate the token server-side — that happens at inference time.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const token = await this.config.getAuthToken();
      return token !== null && token.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Calls the Cognilot API to generate a field suggestion.
   * Packages the prompt into the `POST /api/suggestions/v2` shape.
   */
  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const token = await this.config.getAuthToken();

    if (!token) {
      throw new Error('[GroqProvider] No auth token available. User must be logged in.');
    }

    // Parse the prompt to extract field context embedded by InferenceRouter
    // Prompt format: "Field: <label>\nContext: <context>\nInstruction: <instruction>"
    const body = {
      fieldContext: {
        label: this.extractFromPrompt(prompt, 'Field') ?? 'unknown',
        type: this.extractFromPrompt(prompt, 'Type') ?? 'text',
        placeholder: this.extractFromPrompt(prompt, 'Placeholder'),
        value: this.extractFromPrompt(prompt, 'Current Value'),
        formContext: this.extractFromPrompt(prompt, 'Form Context'),
      },
      pageContext: {
        url: this.extractFromPrompt(prompt, 'URL') ?? window.location.href,
        title: this.extractFromPrompt(prompt, 'Page') ?? document.title,
        domain: window.location.hostname,
      },
      options: {
        tone: 'professional' as const,
        language: 'en',
        ...options,
      },
    };

    const response = await fetch(`${this.config.apiBaseUrl}/api/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`[GroqProvider] API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { suggestion: string };
    return data.suggestion ?? '';
  }

  /**
   * Extracts a named field from the structured prompt.
   * e.g. "Field: Email\n..." → "Email"
   */
  private extractFromPrompt(prompt: string, key: string): string | undefined {
    const match = prompt.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return match?.[1]?.trim();
  }
}
