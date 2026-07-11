import type {
  InferenceProvider,
  CompletionOptions,
  InferenceResult,
  ProviderSelectionReason,
} from './types.js';
import { GeminiNanoProvider } from './providers/GeminiNanoProvider.js';
import { GroqProvider, type GroqProviderConfig } from './providers/GroqProvider.js';
import { BYOKProvider, type BYOKConfig } from './providers/BYOKProvider.js';
import { PromptTemplateManager } from './PromptTemplateManager.js';

/** Configuration for the InferenceRouter */
export interface InferenceRouterConfig {
  /** Base URL of the Cognilot API */
  apiBaseUrl: string;
  /** Returns the current JWT, or null if the user is not logged in */
  getAuthToken: () => Promise<string | null>;
  /** Returns BYOK config if the user has configured their own key, or null otherwise */
  getByokConfig: () => Promise<BYOKConfig | null>;
  /** Returns the local profile cache */
  getProfile?: () => Promise<any>;
  /** The prompt template manager */
  templateManager?: PromptTemplateManager;
}

/** Field context shape used to build the prompt */
export interface FieldPromptContext {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  formContext?: string;
  pageUrl?: string;
  pageTitle?: string;
}

/**
 * InferenceRouter
 *
 * The central intelligence routing layer of the Cognilot SDK.
 * Decides which AI provider to use based on:
 *
 * 1. **BYOK override** — If the user has their own API key configured,
 *    always route there regardless of auth state.
 * 2. **Authenticated** — Route to Cognilot backend (Groq/Llama 3.3 70B)
 *    for personalized suggestions using the user's stored profile.
 * 3. **Anonymous + Nano available** — Route to Gemini Nano (local, free).
 * 4. **Fallback** — If Groq fails, attempt Nano. If Nano also fails, throw.
 *
 * This class should be used instead of calling providers directly.
 * It handles availability checks, fallback logic, and telemetry.
 */
export class InferenceRouter {
  private nano: GeminiNanoProvider;
  private groq: GroqProvider;
  private byok: BYOKProvider;

  constructor(config: InferenceRouterConfig) {
    this.nano = new GeminiNanoProvider();
    this.groq = new GroqProvider({
      apiBaseUrl: config.apiBaseUrl,
      getAuthToken: config.getAuthToken,
    });
    this.byok = new BYOKProvider(config.getByokConfig, config.getProfile, config.templateManager);
  }

  /**
   * Builds a structured prompt string from a field context object.
   * The GroqProvider uses this format to extract structured data server-side.
   */
  buildPrompt(context: FieldPromptContext): string {
    const lines = [`Field: ${context.label}`, `Type: ${context.type ?? 'text'}`];

    if (context.placeholder) lines.push(`Placeholder: ${context.placeholder}`);
    if (context.value) lines.push(`Current Value: ${context.value}`);
    if (context.formContext) lines.push(`Form Context: ${context.formContext}`);

    const url = context.pageUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
    const title = context.pageTitle ?? (typeof document !== 'undefined' ? document.title : '');
    if (url) lines.push(`URL: ${url}`);
    if (title) lines.push(`Page: ${title}`);

    lines.push('');
    lines.push('Return only the value to fill in this field. No explanations or quotes.');

    return lines.join('\n');
  }

  /**
   * Routes a field prompt to the appropriate AI provider and returns a result.
   *
   * Priority (checked in order):
   * 1. BYOK (if configured) → always wins
   * 2. Groq backend (if authenticated)
   * 3. Gemini Nano (if available)
   * 4. Throws InferenceUnavailableError
   *
   * If Groq fails, automatically falls back to Nano before giving up.
   */
  async route(
    context: FieldPromptContext,
    options: CompletionOptions = {}
  ): Promise<InferenceResult> {
    const startMs = Date.now();
    const prompt = this.buildPrompt(context);

    // ── 1. BYOK override ────────────────────────────────────────────────────
    if (await this.byok.isAvailable()) {
      return this.executeProvider(this.byok, prompt, options, 'byok_override', startMs);
    }

    // ── 2. Authenticated → Groq backend ─────────────────────────────────────
    if (await this.groq.isAvailable()) {
      try {
        return await this.executeProvider(
          this.groq,
          prompt,
          options,
          'groq_authenticated',
          startMs
        );
      } catch (err) {
        console.warn(
          '[InferenceRouter] Groq failed, attempting Nano fallback:',
          (err as Error).message
        );

        // ── Groq fallback → Nano ────────────────────────────────────────────
        if (await this.nano.isAvailable()) {
          return this.executeProvider(this.nano, prompt, options, 'fallback_nano', startMs);
        }

        throw err; // Both Groq and Nano unavailable
      }
    }

    // ── 3. Anonymous → Gemini Nano ───────────────────────────────────────────
    if (await this.nano.isAvailable()) {
      return this.executeProvider(this.nano, prompt, options, 'gemini_nano_anonymous', startMs);
    }

    // ── 4. No provider available ─────────────────────────────────────────────
    throw new InferenceUnavailableError(
      'No AI provider is available. Please sign in or enable Gemini Nano in your browser.'
    );
  }

  /**
   * Returns the name of the provider that would be selected for the current
   * auth/config state, without actually running inference.
   * Useful for UI hints ("Powered by Gemini Nano" etc.)
   */
  async getSelectedProviderName(): Promise<string> {
    if (await this.byok.isAvailable()) return 'byok';
    if (await this.groq.isAvailable()) return 'groq-llama3';
    if (await this.nano.isAvailable()) return 'gemini-nano';
    return 'none';
  }

  /**
   * Executes inference on a given provider and wraps the result.
   */
  private async executeProvider(
    provider: InferenceProvider,
    prompt: string,
    options: CompletionOptions,
    reason: ProviderSelectionReason,
    startMs: number
  ): Promise<InferenceResult> {
    const value = await provider.complete(prompt, options);

    return {
      value,
      provider: provider.name,
      reason,
      latencyMs: Date.now() - startMs,
    };
  }
}

/**
 * Thrown when no AI provider is available (user is anonymous, Nano is not
 * installed, and no BYOK key is configured).
 */
export class InferenceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InferenceUnavailableError';
  }
}
