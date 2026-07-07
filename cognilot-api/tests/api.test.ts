import { describe, it, expect, vi, beforeAll } from 'vitest';

/**
 * Mock the auth middleware and DB client before any modules are imported.
 * This allows testing the Hono routing layer without a real DB or Supabase.
 */
vi.mock('../src/db/client.js', () => ({
  db: new Proxy(
    {},
    {
      get: () => {
        throw new Error('DB not available in tests — mock individual routes');
      },
    }
  ),
}));

vi.mock('../src/middleware/auth.js', () => ({
  authMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) => {
    await next();
  }),
}));

vi.mock('../src/middleware/rate-limiter.js', () => ({
  rateLimiterMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) => {
    await next();
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}));

// Import app AFTER mocks are registered
const { default: app } = await import('../src/index.js');

/**
 * Health Check Tests
 * Validates the API is reachable and returns expected metadata.
 */
describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.request('/api/health');

    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; version: string };
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
  });
});

/**
 * 404 Handler Tests
 */
describe('404 Handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await app.request('/api/unknown-route');

    expect(res.status).toBe(404);

    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Not Found');
  });
});

/**
 * Auth Guard Tests
 * With authMiddleware mocked to pass-through, routes should return non-401 responses.
 * The actual 401 behavior is tested via integration tests with a real Supabase instance.
 */
describe('Route Registration', () => {
  it('aliases route is registered and reachable', async () => {
    const res = await app.request('/api/aliases', { method: 'GET' });
    // Auth is mocked, DB is not — should fail at DB level (500) not route level (404)
    expect(res.status).not.toBe(404);
  });

  it('profile route is registered and reachable', async () => {
    const res = await app.request('/api/profile', { method: 'GET' });
    expect(res.status).not.toBe(404);
  });

  it('suggestions route is registered', async () => {
    const res = await app.request('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldContext: {
          label: 'email',
          type: 'email',
          url: 'http://test.com',
          title: 'Test',
          domain: 'test.com',
        },
        pageContext: { url: 'http://test.com', title: 'Test', domain: 'test.com' },
      }),
    });
    expect(res.status).not.toBe(404);
  });

  it('suggestions/refine route is registered', async () => {
    const res = await app.request('/api/suggestions/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field: {
          label: 'bio',
          type: 'text',
          tagName: 'TEXTAREA',
        },
        page_context: {
          domain: 'test.com',
          path: '/settings',
          title: 'Settings',
        },
        raw_text: 'hello',
      }),
    });
    expect(res.status).not.toBe(404);
  });

  it('onboarding/parse-cv route is registered', async () => {
    const res = await app.request('/api/onboarding/parse-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cvText: 'This is a test CV with some professional data...' }),
    });
    expect(res.status).not.toBe(404);
  });

  it('suggestions/batch route is registered', async () => {
    const res = await app.request('/api/suggestions/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: [
          {
            key: 'name-key',
            field: {
              label: 'name',
              type: 'text',
              tagName: 'INPUT',
              required: false,
            },
          },
        ],
      }),
    });
    expect(res.status).not.toBe(404);
  });

  it('decision/batch route is registered', async () => {
    const res = await app.request('/api/decision/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: [
          {
            id: 'option-key',
            label: 'Gender',
            type: 'select',
            options: ['Male', 'Female'],
          },
        ],
      }),
    });
    expect(res.status).not.toBe(404);
  });
});
