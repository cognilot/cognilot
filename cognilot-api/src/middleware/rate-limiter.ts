import { createMiddleware } from 'hono/factory';
import { db } from '../db/client.js';
import { usageCredits } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import type { AuthEnv } from '../types/hono.js';

const FREE_CREDITS_PER_DAY = Number(process.env['COGNILOT_FREE_CREDITS_PER_DAY'] ?? 50);

/**
 * Rate Limiter Middleware — Credit-based.
 * Free plan: 50 credits/day. Pro plan: unlimited.
 *
 * Must be used AFTER authMiddleware so `userId` and `user` are in context.
 */
export const rateLimiterMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const userId = c.get('userId');
  const user = c.get('user');

  // Pro plan: bypass rate limiting entirely
  if (user.plan === 'pro') {
    await next();
    return;
  }

  const today = new Date().toISOString().split('T')[0] as string;

  // Upsert today's usage record
  const [record] = await db
    .insert(usageCredits)
    .values({ userId, creditsUsed: 0, date: today })
    .onConflictDoUpdate({
      target: [usageCredits.userId, usageCredits.date],
      set: { creditsUsed: usageCredits.creditsUsed },
    })
    .returning();

  if (!record) {
    return c.json(
      { error: 'Internal Server Error', message: 'Could not check usage credits.' },
      500
    );
  }

  // Enforce daily credit limit
  if (record.creditsUsed >= FREE_CREDITS_PER_DAY) {
    return c.json(
      {
        error: 'Rate Limit Exceeded',
        message: `You have used all ${FREE_CREDITS_PER_DAY} free credits for today. Upgrade to Pro for unlimited access.`,
        creditsUsed: record.creditsUsed,
        limit: FREE_CREDITS_PER_DAY,
        resetsAt: `${today}T23:59:59Z`,
      },
      429
    );
  }

  // Increment credit count after consuming
  await db
    .update(usageCredits)
    .set({ creditsUsed: record.creditsUsed + 1 })
    .where(and(eq(usageCredits.userId, userId), eq(usageCredits.date, today)));

  return next();
});
