import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/client.js';
import { userProfiles, aliases } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { standardizeKeys } from '../services/standardizer.js';
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
 * Standardizes raw labels into canonical keys via LLM.
 * Auto-creates aliases for raw → canonical key mappings.
 */
profileRouter.post('/sync', zValidator('json', syncProfileSchema), async (c) => {
  const userId = c.get('userId');
  const { learnedData, sync_queue } = c.req.valid('json');

  // ── 1. Get current dataLearned ───────────────────────────────────────────
  const [current] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  const existingDataLearned: Record<string, string[]> =
    typeof current?.dataLearned === 'object' && current.dataLearned !== null
      ? (current.dataLearned as Record<string, string[]>)
      : {};
  const existingCanonicalKeys = Object.keys(existingDataLearned);

  // ── 2. Collect raw labels from sync_queue + learnedData ──────────────────
  const rawLabels: string[] = [];
  if (sync_queue && Array.isArray(sync_queue)) {
    for (const item of sync_queue) {
      if (item.key) rawLabels.push(item.key);
    }
  }
  if (learnedData && typeof learnedData === 'object') {
    for (const key of Object.keys(learnedData)) {
      rawLabels.push(key);
    }
  }
  const uniqueRawLabels = [...new Set(rawLabels)];

  // ── 3. Standardize raw labels → canonical keys ───────────────────────────
  let mappings: Record<string, string> = {};
  if (uniqueRawLabels.length > 0) {
    try {
      console.log(`[Profile/Sync] Standardizing ${uniqueRawLabels.length} raw label(s)...`);
      const result = await standardizeKeys(uniqueRawLabels, existingCanonicalKeys);
      mappings = result.mappings;
      console.log('[Profile/Sync] Standardizer mappings:', mappings);
    } catch (err) {
      console.warn('[Profile/Sync] Standardizer failed, using raw labels:', err);
      // Fallback: use raw labels as canonical keys
      for (const label of uniqueRawLabels) {
        mappings[label] = label;
      }
    }
  } else {
    console.log('[Profile/Sync] No raw labels to standardize.');
  }

  // ── 4. Merge values under canonical keys ──────────────────────────────────
  const mergedData: Record<string, string[]> = { ...existingDataLearned };

  // Process sync_queue items
  if (sync_queue && Array.isArray(sync_queue)) {
    for (const item of sync_queue) {
      if (!item.key || !item.value) continue;
      const canonicalKey = mappings[item.key] || item.key;
      if (!mergedData[canonicalKey]) mergedData[canonicalKey] = [];
      if (!mergedData[canonicalKey].includes(item.value)) {
        mergedData[canonicalKey].push(item.value);
      }
    }
  }

  // Process learnedData (direct payload)
  if (learnedData && typeof learnedData === 'object') {
    for (const [rawKey, value] of Object.entries(learnedData)) {
      const canonicalKey = mappings[rawKey] || rawKey;
      if (!mergedData[canonicalKey]) mergedData[canonicalKey] = [];
      const valueStr = String(value);
      if (!mergedData[canonicalKey].includes(valueStr)) {
        mergedData[canonicalKey].push(valueStr);
      }
    }
  }

  // Trim each key to max 20 values
  for (const key of Object.keys(mergedData)) {
    const values = mergedData[key];
    if (values) mergedData[key] = values.slice(0, 20);
  }

  // ── 5. Persist dataLearned ────────────────────────────────────────────────
  await db
    .insert(userProfiles)
    .values({ userId, dataLearned: mergedData })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { dataLearned: mergedData, updatedAt: new Date() },
    });

  // ── 6. Auto-create aliases for raw → canonical mappings ───────────────────
  const newAliases: Array<{ label: string; memoryKey: string }> = [];
  const labelsToCheck = Object.keys(mappings);

  if (labelsToCheck.length > 0) {
    // Fetch existing aliases for these labels
    const existingAliases = await db
      .select({ label: aliases.label })
      .from(aliases)
      .where(and(eq(aliases.userId, userId), inArray(aliases.label, labelsToCheck)));
    const existingLabels = new Set(existingAliases.map((a) => a.label));

    // Insert only new ones
    const aliasesToInsert = labelsToCheck
      .filter((rawLabel) => {
        const canonicalKey = mappings[rawLabel]!;
        // Skip if label == canonical key (self-mapping, not useful)
        if (rawLabel === canonicalKey) return false;
        // Skip if alias already exists
        if (existingLabels.has(rawLabel)) return false;
        return true;
      })
      .map((rawLabel) => ({
        userId,
        label: rawLabel,
        memoryKey: mappings[rawLabel]!,
        category: 'auto',
      }));

    if (aliasesToInsert.length > 0) {
      await db.insert(aliases).values(aliasesToInsert);
      newAliases.push(...aliasesToInsert.map((a) => ({ label: a.label, memoryKey: a.memoryKey })));
    }
  }

  return c.json({
    message: 'Profile synced successfully.',
    fieldsLearned: Object.keys(mergedData).length,
    profile: { dataLearned: mergedData },
    mappings,
    newAliases,
  });
});
