import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/client.js';
import { aliases } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthEnv } from '../types/hono.js';

export const aliasesRouter = new Hono<AuthEnv>();

// Apply auth to all alias routes
aliasesRouter.use('*', authMiddleware);

// ── Schemas ───────────────────────────────────────────────────────────────────

const createAliasSchema = z.object({
  label: z.string().min(1).max(50),
  value: z.string().min(1).max(1000),
  category: z.string().optional().default('general'),
});

const updateAliasSchema = createAliasSchema.partial();

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * GET /api/aliases
 * Returns all aliases for the authenticated user.
 */
aliasesRouter.get('/', async (c) => {
  const userId = c.get('userId');

  const userAliases = await db
    .select()
    .from(aliases)
    .where(eq(aliases.userId, userId))
    .orderBy(aliases.createdAt);

  return c.json({ aliases: userAliases });
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
