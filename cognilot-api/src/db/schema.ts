import { pgTable, uuid, text, timestamp, jsonb, integer, unique } from 'drizzle-orm/pg-core';

/**
 * Users table — synced automatically from Supabase Auth.
 * This mirrors auth.users but lives in public schema for
 * join operations with app-level tables.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Matches auth.users.id
  email: text('email').notNull().unique(),
  plan: text('plan', { enum: ['free', 'pro'] })
    .notNull()
    .default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Memories — stores learned AI facts and memory data per user.
 * One record per user (1:1 relation).
 * `data` is a JSONB column that stores structured memory facts
 * (job title, company, full name, phone, etc.) collected by the extension and SDK.
 */
export const memories = pgTable('memories', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  data: jsonb('data').default({}).notNull(),
  cvRawText: text('cv_raw_text'),
  onboardingCompleted: timestamp('onboarding_completed', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Usage Credits — tracks daily API usage per user.
 * Free plan: 50 credits/day. Pro plan: unlimited (not tracked).
 */
export const usageCredits = pgTable(
  'usage_credits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    creditsUsed: integer('credits_used').notNull().default(0),
    date: text('date').notNull(), // ISO date string: "2026-06-25"
  },
  (t) => [unique().on(t.userId, t.date)]
);

// ── Type Exports ───────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type Memory = typeof memories.$inferSelect;
export type MemoryInsert = typeof memories.$inferInsert;
export type UsageCredit = typeof usageCredits.$inferSelect;
