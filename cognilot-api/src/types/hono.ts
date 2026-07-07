import type { User } from '../db/schema.js';

/**
 * Shared Hono environment type for authenticated routes.
 * Injected by `authMiddleware` — must be passed as the generic to Hono<AuthEnv>.
 */
export type AuthEnv = {
  Variables: {
    user: User;
    userId: string;
  };
};
