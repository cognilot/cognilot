import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/client.js';
import { aliases, userProfiles } from '../db/schema.js';
import { and, eq, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthEnv } from '../types/hono.js';

export const aliasesRouter = new Hono<AuthEnv>();

// Apply auth to all alias routes
aliasesRouter.use('*', authMiddleware);

// ── Schemas ───────────────────────────────────────────────────────────────────

const createAliasSchema = z.object({
  label: z.string().min(1).max(50),
  memoryKey: z.string().min(1).max(100),
  category: z.string().optional().default('general'),
});

const updateAliasSchema = createAliasSchema.partial();

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * GET /api/aliases
 * Returns paginated aliases for the authenticated user.
 * Query params: offset (default 0), limit (default 50, max 200)
 */
aliasesRouter.get('/', async (c) => {
  const userId = c.get('userId');

  const query = c.req.query();
  const offset = Math.max(0, parseInt(query['offset'] || '0', 10));
  const limit = Math.min(Math.max(1, parseInt(query['limit'] || '50', 10)), 200);

  const [userAliases, total] = await Promise.all([
    db
      .select()
      .from(aliases)
      .where(eq(aliases.userId, userId))
      .orderBy(aliases.createdAt)
      .limit(limit)
      .offset(offset),
    db.$count(aliases, eq(aliases.userId, userId)),
  ]);

  return c.json({ aliases: userAliases, total, offset, limit });
});

/**
 * GET /api/aliases/resolve
 * Returns aliases with their resolved values from data_learned.
 * This is what the extension uses to populate the local alias cache.
 */
aliasesRouter.get('/resolve', async (c) => {
  const userId = c.get('userId');

  const userAliases = await db
    .select()
    .from(aliases)
    .where(eq(aliases.userId, userId))
    .orderBy(aliases.createdAt);

  // Fetch user profile to resolve memoryKey references
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

  const dataLearned = (profile?.dataLearned as Record<string, unknown>) || {};

  // Resolve each alias: alias → memoryKey → values from data_learned
  const resolved = userAliases
    .map((a) => {
      const key = a.memoryKey;
      const rawValue = dataLearned[key];
      const values = Array.isArray(rawValue)
        ? rawValue.map(String)
        : rawValue != null
          ? [String(rawValue)]
          : [];

      return {
        id: a.id,
        label: a.label,
        memoryKey: a.memoryKey,
        category: a.category,
        values,
        createdAt: a.createdAt,
      };
    })
    .filter((a) => a.values.length > 0);

  return c.json({ aliases: resolved, total: resolved.length });
});

/**
 * POST /api/aliases
 * Creates a new alias for the authenticated user.
 */
aliasesRouter.post('/', zValidator('json', createAliasSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const [alias] = await db
    .insert(aliases)
    .values({ ...body, userId })
    .returning();

  return c.json({ alias }, 201);
});

/**
 * PUT /api/aliases/:id
 * Updates a specific alias (must belong to the authenticated user).
 */
aliasesRouter.put('/:id', zValidator('json', updateAliasSchema), async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();
  const body = c.req.valid('json');

  const [updated] = await db
    .update(aliases)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(aliases.id, id), eq(aliases.userId, userId)))
    .returning();

  if (!updated) {
    return c.json(
      { error: 'Not Found', message: 'Alias not found or does not belong to you.' },
      404
    );
  }

  return c.json({ alias: updated });
});

const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(1000),
});

/**
 * DELETE /api/aliases/batch
 * Deletes multiple aliases in a single query for the authenticated user.
 * Must be registered BEFORE /:id to avoid route conflict.
 */
aliasesRouter.delete('/batch', zValidator('json', batchDeleteSchema), async (c) => {
  const userId = c.get('userId');
  const { ids } = c.req.valid('json');

  const deleted = await db
    .delete(aliases)
    .where(and(inArray(aliases.id, ids), eq(aliases.userId, userId)))
    .returning();

  return c.json({ deleted: deleted.length, ids: deleted.map((d) => d.id) });
});

/**
 * DELETE /api/aliases/:id
 * Deletes a specific alias (must belong to the authenticated user).
 */
aliasesRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();

  const [deleted] = await db
    .delete(aliases)
    .where(and(eq(aliases.id, id), eq(aliases.userId, userId)))
    .returning();

  if (!deleted) {
    return c.json(
      { error: 'Not Found', message: 'Alias not found or does not belong to you.' },
      404
    );
  }

  return c.json({ message: 'Alias deleted successfully.' });
});

const batchCreateSchema = z.object({
  aliases: z
    .array(
      z.object({
        label: z.string().min(1).max(50),
        memoryKey: z.string().min(1).max(100),
        category: z.string().optional().default('general'),
      })
    )
    .min(1)
    .max(100),
});

/**
 * POST /api/aliases/batch
 * Creates multiple aliases in a single batch insert for the authenticated user.
 */
aliasesRouter.post('/batch', zValidator('json', batchCreateSchema), async (c) => {
  const userId = c.get('userId');
  const { aliases: aliasList } = c.req.valid('json');

  const insertData = aliasList.map((a) => ({
    userId,
    label: a.label,
    memoryKey: a.memoryKey,
    category: a.category || 'general',
  }));

  const inserted = await db.insert(aliases).values(insertData).returning();

  return c.json({ aliases: inserted }, 201);
});
