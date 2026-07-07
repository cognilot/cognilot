import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

/**
 * Drizzle database client singleton.
 * Uses the DATABASE_URL environment variable for the Supabase Postgres connection.
 * In tests, set DATABASE_URL=mock or mock the module entirely.
 * In production, this runs inside Vercel Serverless Functions.
 */
const connectionString = process.env['DATABASE_URL'];

/**
 * Lazy-initialized Drizzle client.
 * Throws at query time (not import time) if DATABASE_URL is missing,
 * which allows test files to import the Hono app without a real DB.
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

const getDb = () => {
  if (_db) return _db;

  if (!connectionString) {
    // In tests without a real DB, queries will fail with a meaningful error
    // Use vi.mock('../db/client.js') in tests to mock the db object
    const mockDb = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
      get: () => {
        throw new Error('[Cognilot API] DATABASE_URL is not set. Mock the DB in tests.');
      },
    });
    return mockDb;
  }

  const queryClient = postgres(connectionString);
  _db = drizzle(queryClient, {
    schema,
    logger: process.env['COGNILOT_ENVIRONMENT'] === 'development',
  });
  return _db;
};

/** Drizzle typed client — use this for all database operations */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle<typeof schema>>];
  },
});

export type Database = typeof db;
