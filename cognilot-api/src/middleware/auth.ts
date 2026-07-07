import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AuthEnv } from '../types/hono.js';

/**
 * Supabase Admin client for JWT verification.
 * Uses service_role key to bypass RLS when verifying tokens.
 */
const supabaseAdmin = createClient(
  process.env['SUPABASE_URL'] ?? '',
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * JWT Authentication Middleware.
 * Validates the Bearer token from the Authorization header using Supabase Auth.
 * Injects the authenticated `user` into the Hono context.
 *
 * Usage:
 * ```ts
 * router.use('*', authMiddleware);
 * ```
 */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authorization = c.req.header('Authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return c.json(
      { error: 'Unauthorized', message: 'Missing or malformed Authorization header.' },
      401
    );
  }

  const token = authorization.slice(7);

  // Verify token with Supabase Auth
  const {
    data: { user: supabaseUser },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !supabaseUser) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token.' }, 401);
  }

  // Upsert user into our public.users table (sync with Supabase Auth)
  const [user] = await db
    .insert(users)
    .values({
      id: supabaseUser.id,
      email: supabaseUser.email ?? '',
      plan: 'free',
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: supabaseUser.email ?? '' },
    })
    .returning();

  if (!user) {
    return c.json({ error: 'Internal Server Error', message: 'Could not sync user.' }, 500);
  }

  c.set('user', user);
  c.set('userId', user.id);

  return next();
});
