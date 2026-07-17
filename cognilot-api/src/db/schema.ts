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
 * User Profiles — stores learned AI data and onboarding info per user.
 * One profile per user (1:1 relation).
 * `dataLearned` is a JSONB column that stores structured learned context
 * (job title, company, writing style, etc.) collected by the extension.
 */
export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  dataLearned: jsonb('data_learned').default({}).notNull(),
  cvRawText: text('cv_raw_text'),
  onboardingCompleted: timestamp('onboarding_completed', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Aliases — user-defined named references to memory fields.
 * e.g. "correo" → memoryKey: "email" (resolves to all values from data_learned.email)
 * The extension resolves aliases by reading the memoryKey from profile_cache.
 */
export const aliases = pgTable('aliases', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(), // The trigger text (e.g. "correo")
  memoryKey: text('memory_key').notNull(), // Reference to data_learned key (e.g. "email")
  category: text('category').default('general'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
export type UserProfile = typeof userProfiles.$inferSelect;
export type UserProfileInsert = typeof userProfiles.$inferInsert;
export type Alias = typeof aliases.$inferSelect;
export type AliasInsert = typeof aliases.$inferInsert;
export type UsageCredit = typeof usageCredits.$inferSelect;
