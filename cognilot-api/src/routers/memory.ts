import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/client.js';
import { memories, users, usageCredits } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { standardizeKeys } from '../services/standardizer.js';
import type { AuthEnv } from '../types/hono.js';

export const memoryRouter = new Hono<AuthEnv>();
memoryRouter.use('*', authMiddleware);

// ── Schemas ───────────────────────────────────────────────────────────────────

const patchPlanSchema = z.object({
  plan: z.enum(['free', 'pro']),
});

const patchMemorySchema = z.object({
  data: z.record(z.unknown()).optional(),
  dataLearned: z.record(z.unknown()).optional(), // compatibility
  cvRawText: z.string().optional(),
});

const syncMemorySchema = z.object({
  /** Partial memory data from client */
  data: z.record(z.unknown()).optional(),
  /** Legacy alias for data */
  learnedData: z.record(z.unknown()).optional(),
  /** Sync queue of learned entries from extension/SDK */
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
 * GET /api/memory
 * Returns the full memory and user state for the authenticated user:
 * - User metadata (plan, email)
 * - Daily usage credits info
 * - Learned memory data (data JSONB)
 */
memoryRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const user = c.get('user');

  // Get or create user memory record
  const [mem] = await db
    .insert(memories)
    .values({ userId, data: {} })
    .onConflictDoUpdate({
      target: memories.userId,
      set: { updatedAt: new Date() },
    })
    .returning();

  const today = new Date().toISOString().split('T')[0] as string;
  const [usage] = await db
    .select()
    .from(usageCredits)
    .where(and(eq(usageCredits.userId, userId), eq(usageCredits.date, today)));

  const FREE_CREDITS_PER_DAY = Number(process.env['COGNILOT_FREE_CREDITS_PER_DAY'] ?? 50);

  const memoryData = (mem?.data as Record<string, unknown>) || {};
  if (mem?.cvFileName && !memoryData['cv_file_name']) {
    memoryData['cv_file_name'] = [mem.cvFileName];
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
    },
    usage: {
      creditsUsed: usage?.creditsUsed ?? 0,
      creditsLimit: FREE_CREDITS_PER_DAY,
      resetsAt: `${today}T23:59:59Z`,
    },
    memory: {
      data: memoryData,
      cvFileName: mem?.cvFileName ?? null,
      onboardingCompleted: mem?.onboardingCompleted ?? null,
    },
    // Backward compatibility payload
    profile: {
      dataLearned: memoryData,
      cvFileName: mem?.cvFileName ?? null,
      onboardingCompleted: mem?.onboardingCompleted ?? null,
    },
  });
});

/**
 * PATCH /api/memory/plan
 * Switches user plan between 'free' and 'pro' (Dev / Testing mode).
 */
memoryRouter.patch('/plan', zValidator('json', patchPlanSchema), async (c) => {
  const userId = c.get('userId');
  const { plan } = c.req.valid('json');

  const [updatedUser] = await db
    .update(users)
    .set({ plan, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  if (!updatedUser) {
    return c.json({ error: 'Not Found', message: 'User record not found.' }, 404);
  }

  return c.json({
    success: true,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      plan: updatedUser.plan,
    },
  });
});

/**
 * PATCH /api/memory
 * Updates the user's memory data (data, cvRawText).
 */
memoryRouter.patch('/', zValidator('json', patchMemorySchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.data) updatePayload.data = body.data;
  else if (body.dataLearned) updatePayload.data = body.dataLearned;

  if (body.cvRawText !== undefined) updatePayload.cvRawText = body.cvRawText;

  const [updated] = await db
    .insert(memories)
    .values({
      userId,
      data: (updatePayload.data as Record<string, unknown>) || {},
      cvRawText: updatePayload.cvRawText as string,
    })
    .onConflictDoUpdate({
      target: memories.userId,
      set: updatePayload,
    })
    .returning();

  return c.json({ memory: updated, profile: updated });
});

/**
 * POST /api/memory/sync
 * Endpoint used by the browser extension / SDK to push locally-learned data
 * to the backend. Merges incoming data with existing memory JSONB.
 * Standardizes raw labels into canonical keys via LLM.
 */
memoryRouter.post('/sync', zValidator('json', syncMemorySchema), async (c) => {
  const userId = c.get('userId');
  const { data: clientData, learnedData, sync_queue } = c.req.valid('json');

  // ── 1. Get current memories ──────────────────────────────────────────────
  const [current] = await db.select().from(memories).where(eq(memories.userId, userId));
  const existingMemoryData: Record<string, string[]> =
    typeof current?.data === 'object' && current.data !== null
      ? (current.data as Record<string, string[]>)
      : {};
  const existingCanonicalKeys = Object.keys(existingMemoryData);

  // ── 2. Collect raw labels from sync_queue + direct data ───────────────────
  const rawLabels: string[] = [];
  if (sync_queue && Array.isArray(sync_queue)) {
    for (const item of sync_queue) {
      if (item.key) rawLabels.push(item.key);
    }
  }
  const directObj = clientData || learnedData;
  if (directObj && typeof directObj === 'object') {
    for (const key of Object.keys(directObj)) {
      rawLabels.push(key);
    }
  }
  const uniqueRawLabels = [...new Set(rawLabels)];

  // ── 3. Standardize raw labels → canonical keys ───────────────────────────
  let mappings: Record<string, string> = {};
  if (uniqueRawLabels.length > 0) {
    try {
      console.log(`[Memory/Sync] Standardizing ${uniqueRawLabels.length} raw label(s)...`);
      const result = await standardizeKeys(uniqueRawLabels, existingCanonicalKeys);
      mappings = result.mappings;
      console.log('[Memory/Sync] Standardizer mappings:', mappings);
    } catch (err) {
      console.warn('[Memory/Sync] Standardizer failed, using raw labels:', err);
      for (const label of uniqueRawLabels) {
        mappings[label] = label;
      }
    }
  }

  // ── 4. Merge values under canonical keys with semantic validation ─────────
  const mergedData: Record<string, string[]> = { ...existingMemoryData };

  const sanitizeAndValidate = (key: string, rawVal: string): string | null => {
    const val = String(rawVal || '').trim();
    if (!val) return null;

    if (/(password|contrase|clave|secret|pin|cvv|cvc|token|auth_token)/i.test(key)) {
      console.warn(`[Memory/Sync] Discarding sensitive/password key:`, key);
      return null;
    }

    if (['full_name', 'first_name', 'last_name', 'username'].includes(key) && val.includes('@')) {
      console.warn(`[Memory/Sync] Discarding email value for name field ${key}:`, val);
      return null;
    }

    if (key === 'email' && (!val.includes('@') || !val.includes('.'))) {
      console.warn(`[Memory/Sync] Discarding invalid email format for email field:`, val);
      return null;
    }

    return val;
  };

  // Process sync_queue items
  if (sync_queue && Array.isArray(sync_queue)) {
    for (const item of sync_queue) {
      if (!item.key || !item.value) continue;
      const canonicalKey = mappings[item.key] || item.key;
      const validVal = sanitizeAndValidate(canonicalKey, item.value);
      if (!validVal) continue;

      if (!mergedData[canonicalKey]) mergedData[canonicalKey] = [];
      if (!mergedData[canonicalKey].includes(validVal)) {
        mergedData[canonicalKey].push(validVal);
      }
    }
  }

  // Process direct payload
  if (directObj && typeof directObj === 'object') {
    for (const [rawKey, value] of Object.entries(directObj)) {
      const canonicalKey = mappings[rawKey] || rawKey;
      const validVal = sanitizeAndValidate(canonicalKey, String(value));
      if (!validVal) continue;

      if (!mergedData[canonicalKey]) mergedData[canonicalKey] = [];
      if (!mergedData[canonicalKey].includes(validVal)) {
        mergedData[canonicalKey].push(validVal);
      }
    }
  }

  // Trim each key to max 20 values
  for (const key of Object.keys(mergedData)) {
    const values = mergedData[key];
    if (values) mergedData[key] = values.slice(0, 20);
  }

  // ── 5. Persist to memories table ──────────────────────────────────────────
  await db
    .insert(memories)
    .values({ userId, data: mergedData })
    .onConflictDoUpdate({
      target: memories.userId,
      set: { data: mergedData, updatedAt: new Date() },
    });

  return c.json({
    message: 'Memory synced successfully.',
    fieldsLearned: Object.keys(mergedData).length,
    memory: { data: mergedData },
    profile: { dataLearned: mergedData },
    mappings,
  });
});
