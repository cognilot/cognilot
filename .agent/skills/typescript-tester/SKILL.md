---
name: TypeScript Testing Skill
description: Guidelines and patterns for creating high-quality, maintainable Vitest tests for the Cognilot TypeScript projects (SDK, Web, Extensions, and API).
---

# TypeScript Testing with Vitest (Cognilot Patterns)

This skill provides the standard approach for testing TypeScript code across the Cognilot monorepo. We use **Vitest** as our primary testing framework due to its speed, Vite compatibility, and native support for ESM and TypeScript.

---

## 1. Core Stack

- **Framework**: [Vitest](https://vitest.dev/)
- **Workspace Packages**:
  - `@cognilot/sdk` (Node/Browser agnostic)
  - `@cognilot/extension` (Browser APIs/DOM environment)
  - `@cognilot/api` (Hono Server environment)
  - `@cognilot/web` (Next.js 15 App Router environment)
- **Environments**: `node` (for SDK and API logic) or `jsdom` (for DOM-dependent Extension and Frontend components).

---

## 2. File Organization

- Tests should be located inside a `tests/` directory at the root of each package, or adjacent to the target file being tested (using `[component].test.ts` or `[component].test.tsx` extensions).
- **Naming Convention**: `[feature-name].test.ts` (e.g. `InferenceRouter.test.ts`, `api.test.ts`).

---

## 3. Basic Test Structure

Always use the AAA pattern: **Arrange** (setup), **Act** (execute), **Assert** (verify).

```typescript
import { describe, it, expect } from 'vitest';
import { TargetClass } from '../src/target-path';

describe('TargetClass', () => {
  it('should perform a specific action correctly', () => {
    // 1. Arrange
    const instance = new TargetClass();
    const input = 'test-data';

    // 2. Act
    const result = instance.process(input);

    // 3. Assert
    expect(result).toBe('expected-output');
  });
});
```

---

## 4. Specific Package Guidelines

### 4.1 Testing `@cognilot/api` (Hono Backend Routes)

Hono provides a native `app.request()` helper that allows simulating requests directly through the router pipeline without opening an actual HTTP socket listener.

> **Decision:** Always mock the database client (`db`) and authentication middleware (`authMiddleware`) at the top of the test file using `vi.mock()` before importing the server entrypoint to ensure tests run in isolation and do not require a live database.

```typescript
import { describe, it, expect, vi } from 'vitest';

// 1. Register mocks before importing the app
vi.mock('../src/db/client.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockResolvedValue([{ id: 'mock-id' }]),
  },
}));

vi.mock('../src/middleware/auth.js', () => ({
  authMiddleware: vi.fn(async (c, next) => {
    c.set('userId', 'mock-user-123');
    await next();
  }),
}));

// 2. Import app
const { default: app } = await import('../src/index.js');

describe('GET /api/profile', () => {
  it('returns profile details with 200 OK', async () => {
    const res = await app.request('/api/profile', {
      method: 'GET',
      headers: { Authorization: 'Bearer mock-token' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBeDefined();
  });
});
```

### 4.2 Testing `@cognilot/sdk` (Inference & Routing)

SDK tests should focus on testing modular components (like `InferenceRouter`, `PageScanner`, `LabelExtractor`) in isolation using manual mocks for environment dependencies.

- Prefer writing clean **manual mocks** (implementing minimal interfaces like `PlatformAdapter` or `CognilotNode`) instead of writing brittle, deeply nested `vi.mock()` calls on browser globals.
- Ensure all mocks are reset between tests using `vi.restoreAllMocks()` or `vi.clearAllMocks()` in `afterEach()`.

### 4.3 Testing `@cognilot/web` (Next.js components)

- Web component tests are run inside a `jsdom` environment.
- Use `@testing-library/react` to render components and verify user interactions (e.g. mock API errors like 413 or 500 when uploading CV files).

---

## 5. Execution & Verification Commands

All script runs must use `pnpm` workspace filters rather than generic `npm` or `yarn` commands:

- **Run all tests in the monorepo:**
  ```bash
  pnpm -r test
  ```
- **Run tests for a specific workspace package:**
  ```bash
  pnpm --filter @cognilot/sdk test
  pnpm --filter @cognilot/api test
  pnpm --filter @cognilot/web test
  pnpm --filter @cognilot/extension test
  ```
- **Run tests in watch mode for active development:**
  ```bash
  pnpm --filter @cognilot/web test:watch
  ```

---

## 6. Testing Best Practices

1.  **Isolated State**: Never let state leak between tests. Use `beforeEach` or `afterEach` hooks to clear database mocks and reset counters.
2.  **No Real Network/DB**: All outbound calls, database operations, and external API requests (e.g. Groq, Supabase, OpenAI) must be mocked.
3.  **Deterministic Tests**: If the test checks times, dates, or random IDs, mock `Date.now()`, `Math.random()`, or inject static values.
4.  **Semantic Assertions**: Use descriptive error testing, e.g. `expect(promise).rejects.toThrowError('API server unavailable')` rather than checking generic booleans.
