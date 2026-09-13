import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { serve, getRequestListener } from '@hono/node-server';

import { memoryRouter } from './routers/memory.js';
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
    origin: (origin) => {
      if (!origin) return 'https://cognilot.com';
      const allowed = [
        'https://cognilot.com',
        'https://www.cognilot.com',
        'https://cognilot-web.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
      ];
      if (
        allowed.includes(origin) ||
        origin.endsWith('.cognilot.com') ||
        origin.endsWith('.vercel.app') ||
        (process.env['COGNILOT_CORS_ORIGIN'] && origin === process.env['COGNILOT_CORS_ORIGIN'])
      ) {
        return origin;
      }
      return process.env['COGNILOT_CORS_ORIGIN'] || 'https://cognilot.com';
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

app.use('*', logger());
app.use('*', prettyJSON());

// ── Routes ────────────────────────────────────────────────────────────────────

app.route('/memory', memoryRouter);
app.route('/profile', memoryRouter); // Backward compatibility
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

if (!process.env['VERCEL'] && !process.env['VITEST']) {
  const port = Number(process.env['PORT'] ?? 8000);
  console.log(`[Cognilot API] Server is running on port ${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}

const nodeHandler = getRequestListener(app.fetch);

/**
 * Universal Serverless Handler for Vercel
 * Supports both Node.js IncomingMessage/ServerResponse (@vercel/node)
 * and Web Standard Request/Response fetch signatures.
 */
const handler = async (req: any, res?: any) => {
  // If invoked as Node.js HTTP listener: (incoming: IncomingMessage, outgoing: ServerResponse)
  if (res && typeof res.writeHead === 'function') {
    if (typeof req.url === 'string') {
      // 1. Ensure leading slash to prevent RequestError in @hono/node-server
      if (!req.url.startsWith('/')) {
        req.url = '/' + req.url;
      }
      // 2. Restore original URI if rewritten to /src/index.ts
      const forwardedUri = req.headers?.['x-forwarded-uri'] || req.headers?.['x-matched-path'];
      if (req.url.startsWith('/src/index') && typeof forwardedUri === 'string') {
        req.url = forwardedUri;
      }
      // 3. Ensure path matches Hono basePath('/api')
      if (!req.url.startsWith('/api')) {
        req.url = `/api${req.url}`;
      }
    }
    return nodeHandler(req, res);
  }

  // If invoked with Web Standard Request (Edge or Web runtime)
  if (req && typeof req.url === 'string') {
    try {
      const urlObj = new URL(req.url);
      if (!urlObj.pathname.startsWith('/api')) {
        urlObj.pathname = `/api${urlObj.pathname}`;
        req = new Request(urlObj.toString(), req);
      }
    } catch (_) {
      // Fallback if URL parsing fails
    }
  }

  return app.fetch(req);
};

Object.assign(handler, {
  app,
  fetch: app.fetch.bind(app),
  request: app.request.bind(app),
});

export { app };
export default handler;
