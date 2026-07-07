import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InferenceRouter, InferenceUnavailableError } from '../src/inference/InferenceRouter';
import type { InferenceProvider } from '../src/inference/types';

// ── Test Helpers ─────────────────────────────────────────────────────────────

/**
 * Creates a mock InferenceProvider with controllable isAvailable / complete behavior.
 */
function makeProvider(
  name: string,
  available = false,
  result = `${name} result`
): InferenceProvider {
  return {
    name,
    isAvailable: vi.fn().mockResolvedValue(available),
    complete: vi.fn().mockResolvedValue(result),
  };
}

/**
 * Creates an InferenceRouter and injects the three mock providers directly.
 * Bypasses the constructor to avoid touching window.ai or fetch.
 */
function makeRouter(
  opts: {
    nano?: InferenceProvider;
    groq?: InferenceProvider;
    byok?: InferenceProvider;
  } = {}
) {
  const router = new InferenceRouter({
    apiBaseUrl: 'https://api.cognilot.app',
    getAuthToken: vi.fn().mockResolvedValue(null),
    getByokConfig: vi.fn().mockResolvedValue(null),
  });

  // Inject mock providers — overrides real instances created in constructor
  if (opts.nano) (router as any).nano = opts.nano;
  if (opts.groq) (router as any).groq = opts.groq;
  if (opts.byok) (router as any).byok = opts.byok;

  return router;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('InferenceRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildPrompt()', () => {
    it('builds a structured prompt with all fields', () => {
      const router = makeRouter();

      const prompt = router.buildPrompt({
        label: 'Email',
        type: 'email',
        placeholder: 'Enter your email',
        pageUrl: 'https://example.com',
        pageTitle: 'Sign Up',
      });

      expect(prompt).toContain('Field: Email');
      expect(prompt).toContain('Type: email');
      expect(prompt).toContain('Placeholder: Enter your email');
      expect(prompt).toContain('URL: https://example.com');
      expect(prompt).toContain('Page: Sign Up');
    });

    it('omits optional fields that are not provided', () => {
      const router = makeRouter();

      const prompt = router.buildPrompt({ label: 'Name' });

      expect(prompt).toContain('Field: Name');
      expect(prompt).toContain('Type: text'); // default type
      expect(prompt).not.toContain('Placeholder:');
      expect(prompt).not.toContain('Current Value:');
    });

    it('includes form context when provided', () => {
      const router = makeRouter();

      const prompt = router.buildPrompt({
        label: 'Phone',
        formContext: 'Contact Form',
      });

      expect(prompt).toContain('Form Context: Contact Form');
    });
  });

  describe('route() — provider selection', () => {
    it('routes to BYOK when it is available (highest priority)', async () => {
      const byok = makeProvider('byok', true, 'BYOK result');
      const groq = makeProvider('groq-llama3', true, 'Groq result');
      const nano = makeProvider('gemini-nano', true, 'Nano result');

      const router = makeRouter({ byok, groq, nano });
      const result = await router.route({ label: 'Email' });

      expect(result.provider).toBe('byok');
      expect(result.reason).toBe('byok_override');
      expect(result.value).toBe('BYOK result');
      expect(byok.complete).toHaveBeenCalledOnce();
      expect(groq.complete).not.toHaveBeenCalled();
    });

    it('routes to Groq when authenticated and BYOK is not available', async () => {
      const byok = makeProvider('byok', false);
      const groq = makeProvider('groq-llama3', true, 'Groq result');
      const nano = makeProvider('gemini-nano', true, 'Nano result');

      const router = makeRouter({ byok, groq, nano });
      const result = await router.route({ label: 'Email' });

      expect(result.provider).toBe('groq-llama3');
      expect(result.reason).toBe('groq_authenticated');
      expect(result.value).toBe('Groq result');
      expect(groq.complete).toHaveBeenCalledOnce();
      expect(nano.complete).not.toHaveBeenCalled();
    });

    it('routes to Gemini Nano for anonymous users (no Groq, no BYOK)', async () => {
      const byok = makeProvider('byok', false);
      const groq = makeProvider('groq-llama3', false);
      const nano = makeProvider('gemini-nano', true, 'Nano result');

      const router = makeRouter({ byok, groq, nano });
      const result = await router.route({ label: 'Email' });

      expect(result.provider).toBe('gemini-nano');
      expect(result.reason).toBe('gemini_nano_anonymous');
      expect(result.value).toBe('Nano result');
    });

    it('throws InferenceUnavailableError when no provider is available', async () => {
      const byok = makeProvider('byok', false);
      const groq = makeProvider('groq-llama3', false);
      const nano = makeProvider('gemini-nano', false);

      const router = makeRouter({ byok, groq, nano });

      await expect(router.route({ label: 'Email' })).rejects.toThrow(InferenceUnavailableError);
      await expect(router.route({ label: 'Email' })).rejects.toThrow('No AI provider is available');
    });
  });

  describe('route() — Groq fallback to Nano', () => {
    it('falls back to Nano if Groq throws', async () => {
      const byok = makeProvider('byok', false);
      const groq = makeProvider('groq-llama3', true);
      const nano = makeProvider('gemini-nano', true, 'Nano fallback result');

      vi.mocked(groq.complete).mockRejectedValue(new Error('Groq API 503'));

      const router = makeRouter({ byok, groq, nano });
      const result = await router.route({ label: 'Email' });

      expect(result.provider).toBe('gemini-nano');
      expect(result.reason).toBe('fallback_nano');
      expect(result.value).toBe('Nano fallback result');
    });

    it('re-throws the Groq error if Nano is also unavailable', async () => {
      const byok = makeProvider('byok', false);
      const groq = makeProvider('groq-llama3', true);
      const nano = makeProvider('gemini-nano', false);

      vi.mocked(groq.complete).mockRejectedValue(new Error('Groq down'));

      const router = makeRouter({ byok, groq, nano });

      await expect(router.route({ label: 'Email' })).rejects.toThrow('Groq down');
    });
  });

  describe('route() — result shape', () => {
    it('returns a valid InferenceResult with latencyMs', async () => {
      const nano = makeProvider('gemini-nano', true, 'test value');
      const router = makeRouter({
        byok: makeProvider('byok', false),
        groq: makeProvider('groq-llama3', false),
        nano,
      });

      const result = await router.route({ label: 'Name' });

      expect(result).toMatchObject({
        value: 'test value',
        provider: 'gemini-nano',
        reason: 'gemini_nano_anonymous',
      });
      expect(result.latencyMs).toBeTypeOf('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSelectedProviderName()', () => {
    it('returns "byok" when BYOK is configured', async () => {
      const byok = makeProvider('byok', true);
      const router = makeRouter({ byok });
      expect(await router.getSelectedProviderName()).toBe('byok');
    });

    it('returns "groq-llama3" when authenticated and no BYOK', async () => {
      const byok = makeProvider('byok', false);
      const groq = makeProvider('groq-llama3', true);
      const router = makeRouter({ byok, groq });
      expect(await router.getSelectedProviderName()).toBe('groq-llama3');
    });

    it('returns "gemini-nano" when anonymous and Nano is available', async () => {
      const byok = makeProvider('byok', false);
      const groq = makeProvider('groq-llama3', false);
      const nano = makeProvider('gemini-nano', true);
      const router = makeRouter({ byok, groq, nano });
      expect(await router.getSelectedProviderName()).toBe('gemini-nano');
    });

    it('returns "none" when no provider is available', async () => {
      const router = makeRouter({
        byok: makeProvider('byok', false),
        groq: makeProvider('groq-llama3', false),
        nano: makeProvider('gemini-nano', false),
      });
      expect(await router.getSelectedProviderName()).toBe('none');
    });
  });
});
