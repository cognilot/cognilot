import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration for schema management and migrations.
 * Run `pnpm drizzle-kit generate` to create migration SQL files.
 * Run `pnpm drizzle-kit migrate` to apply them to Supabase.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? '',
  },
  verbose: true,
  strict: true,
});
