import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/db/client.js', () => ({
  db: new Proxy(
    {},
    {
      get: () => {
        throw new Error('DB not available in tests');
      },
    }
  ),
}));

describe('Serverless Handler & Auth Resilience', () => {
  it('allows importing auth module without throwing when SUPABASE_URL is missing', async () => {
    const originalUrl = process.env['SUPABASE_URL'];
    delete process.env['SUPABASE_URL'];

    const { getSupabaseAdmin } = await import('../src/middleware/auth.js');
    expect(typeof getSupabaseAdmin).toBe('function');
    const admin = getSupabaseAdmin();
    expect(admin).toBeDefined();

    if (originalUrl) {
      process.env['SUPABASE_URL'] = originalUrl;
    }
  });

  it('universal serverless handler responds to health check and normalizes paths', async () => {
    const { default: handler } = await import('../src/index.js');
    expect(typeof handler).toBe('function');

    // Simulate Web Standard Request
    const webReq = new Request('http://localhost:8000/api/health');
    const webRes = await (handler as any)(webReq);
    expect(webRes.status).toBe(200);

    const body = await webRes.json();
    expect(body.status).toBe('ok');
  });

  it('universal serverless handler automatically prefixes /api when missing from path', async () => {
    const { default: handler } = await import('../src/index.js');

    // Request without /api prefix
    const webReq = new Request('http://localhost:8000/health');
    const webRes = await (handler as any)(webReq);
    expect(webRes.status).toBe(200);

    const body = await webRes.json();
    expect(body.status).toBe('ok');
  });
});
