import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { serve } from '@hono/node-server';

import { aliasesRouter } from './routers/aliases.js';
import { profileRouter } from './routers/profile.js';
import { suggestionsRouter } from './routers/suggestions.js';
import { onboardingRouter } from './routers/onboarding.js';
import { decisionRouter } from './routers/decision.js';
import { promptsRouter } from './routers/prompts.js';

/**
 * Cognilot API — Hono Serverless Application
 * Deployed as Vercel Serverless Functions
 */
const app = new Hono().basePath('/api');

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(
  '*',
  cors({
    origin: process.env['COGNILOT_CORS_ORIGIN'] ?? 'http://localhost:3000',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

app.use('*', logger());
app.use('*', prettyJSON());

// ── Routes ────────────────────────────────────────────────────────────────────

app.route('/aliases', aliasesRouter);
app.route('/profile', profileRouter);
app.route('/suggestions', suggestionsRouter);
app.route('/onboarding', onboardingRouter);
app.route('/decision', decisionRouter);
app.route('/prompts', promptsRouter);

// ── Health Check ──────────────────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: process.env['COGNILOT_API_VERSION'] ?? 'v2',
    environment: process.env['COGNILOT_ENVIRONMENT'] ?? 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// ── Error Handler ─────────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error(`[Cognilot API Error]`, err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

if (
  (process.env['COGNILOT_ENVIRONMENT'] === 'development' || !process.env['VERCEL']) &&
  !process.env['VITEST']
) {
  const port = 8000;
  console.log(`[Cognilot API] Server is running on port ${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}

export default app;
