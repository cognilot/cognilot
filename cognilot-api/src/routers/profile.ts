import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/client.js';
import { userProfiles, aliases } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthEnv } from '../types/hono.js';

export const profileRouter = new Hono<AuthEnv>();
profileRouter.use('*', authMiddleware);

// ── Schemas ───────────────────────────────────────────────────────────────────

const patchProfileSchema = z.object({
  dataLearned: z.record(z.unknown()).optional(),
  cvRawText: z.string().optional(),
});

const syncProfileSchema = z.object({
  /** Partial learned data from the extension's local cache */
  learnedData: z.record(z.unknown()).optional(),
  /** Sync queue of learned entries from extension */
  sync_queue: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
        domain: z.string().optional(),
        confirmedAt: z.string().optional(),
      })
    )
    .optional(),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * GET /api/profile
 * Returns the full profile for the authenticated user:
 * - User metadata (plan, email)
 * - Learned AI data (dataLearned JSONB)
 * - All aliases
 */
profileRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const user = c.get('user');

  // Get or create user profile
  const [profile] = await db
    .insert(userProfiles)
    .values({ userId, dataLearned: {} })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { updatedAt: new Date() },
    })
    .returning();

  const userAliases = await db.select().from(aliases).where(eq(aliases.userId, userId));

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
    },
    profile: {
      dataLearned: profile?.dataLearned ?? {},
      onboardingCompleted: profile?.onboardingCompleted ?? null,
    },
    aliases: userAliases,
  });
});

/**
 * PATCH /api/profile
 * Updates the user's profile data (dataLearned, cvRawText).
 */
profileRouter.patch('/', zValidator('json', patchProfileSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const [updated] = await db
    .insert(userProfiles)
    .values({ userId, ...body })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { ...body, updatedAt: new Date() },
    })
    .returning();

  return c.json({ profile: updated });
});

/**
 * POST /api/profile/sync
 * Endpoint used by the browser extension to push locally-learned data
 * to the backend. Merges incoming data with existing dataLearned JSONB.
 * Only available to authenticated users.
 */
profileRouter.post('/sync', zValidator('json', syncProfileSchema), async (c) => {
  const userId = c.get('userId');
  const { learnedData, sync_queue } = c.req.valid('json');

  // Map sync_queue into incoming learned data
  const incomingLearnedData: Record<string, any> = { ...(learnedData || {}) };
  if (sync_queue && Array.isArray(sync_queue)) {
    for (const item of sync_queue) {
      if (item.key && item.value) {
        incomingLearnedData[item.key] = item.value;
      }
    }
  }

  // Fetch current profile
  const [current] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

  // Merge strategy: new data takes precedence over old
  const mergedData = {
    ...(typeof current?.dataLearned === 'object' && current.dataLearned !== null
      ? (current.dataLearned as Record<string, unknown>)
      : {}),
    ...incomingLearnedData,
  };

  const [updated] = await db
    .insert(userProfiles)
    .values({ userId, dataLearned: mergedData })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { dataLearned: mergedData, updatedAt: new Date() },
    })
    .returning();

  return c.json({
    message: 'Profile synced successfully.',
    fieldsLearned: Object.keys(incomingLearnedData).length,
    profile: { dataLearned: updated?.dataLearned },
  });
});
