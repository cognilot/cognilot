import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AuthEnv } from '../types/hono.js';

/**
 * Lazy-initialized Supabase Admin client for JWT verification.
 * Uses service_role key to bypass RLS when verifying tokens.
 * Throws only when authentication is attempted without configured keys,
 * allowing health check and server boot to succeed.
 */
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

export const getSupabaseAdmin = () => {
  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl =
    process.env['SUPABASE_URL'] ||
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ||
    'https://placeholder.supabase.co';
  const supabaseKey =
    process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['SUPABASE_ANON_KEY'] || 'placeholder';

  _supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabaseAdmin;
};

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

  const supabaseUrl = process.env['SUPABASE_URL'] || process.env['NEXT_PUBLIC_SUPABASE_URL'];
  if (!supabaseUrl) {
    return c.json(
      { error: 'Configuration Error', message: 'SUPABASE_URL is not configured on the server.' },
      500
    );
  }

  // Verify token with Supabase Auth
  const admin = getSupabaseAdmin();
  const {
    data: { user: supabaseUser },
    error,
  } = await admin.auth.getUser(token);

  if (error || !supabaseUser) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token.' }, 401);
  }

  // Sync user with our public.users table if not present or changed
  let [user] = await db.select().from(users).where(eq(users.id, supabaseUser.id));

  if (!user || user.email !== (supabaseUser.email ?? '')) {
    [user] = await db
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
  }

  if (!user) {
    return c.json({ error: 'Internal Server Error', message: 'Could not sync user.' }, 500);
  }

  c.set('user', user);
  c.set('userId', user.id);

  return next();
});
