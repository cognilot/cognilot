/**
 * InferenceProvider — Base interface for all AI inference providers.
 *
 * Implementations:
 * - GeminiNanoProvider: Uses window.ai (Chrome built-in, free, anonymous)
 * - GroqProvider: Uses Cognilot backend API (authenticated users only)
 * - BYOKProvider: Calls external AI APIs directly with user-supplied key
 */
export interface InferenceProvider {
  readonly name: string;

  /**
   * Returns true if this provider is currently available.
   * e.g., Nano checks window.ai availability; Groq checks auth token.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Generates a text completion for the given prompt.
   * @param prompt - The instruction + context string
   * @param options - Optional generation parameters
   */
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}

/** Options for controlling inference generation */
export interface CompletionOptions {
  /** Max number of tokens to generate */
  maxTokens?: number;
  /** Sampling temperature (0 = deterministic, 1 = creative) */
  temperature?: number;
  /** Override the system prompt */
  systemPrompt?: string;
}

/** Reason why a provider was selected */
export type ProviderSelectionReason =
  | 'local_alias_match' // Resolved from user alias cache — no LLM needed
  | 'gemini_nano_anonymous' // Unauthenticated user, Nano available
  | 'groq_authenticated' // Authenticated user routed to Cognilot backend
  | 'byok_override' // User configured their own API key
  | 'fallback_nano' // Groq failed, fell back to Nano
  | 'no_provider_available'; // All providers failed

/** Result from the InferenceRouter */
export interface InferenceResult {
  value: string;
  provider: string;
  reason: ProviderSelectionReason;
  latencyMs: number;
  fromCache?: boolean;
}
