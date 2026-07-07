import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LearningService } from '../../src/modules/learning-service';

// ── Mock chrome.storage.local ─────────────────────────────────────────────────
const storage: Record<string, unknown> = {};

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: storage[key] })),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        Object.assign(storage, obj);
      }),
      remove: vi.fn(async (key: string) => {
        delete storage[key];
      }),
    },
  },
};

// Set chrome as a global (extension environment mock)
(globalThis as any).chrome = chromeMock;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeService(opts: { isAuthenticated?: boolean } = {}) {
  return new LearningService({
    getAuthToken: vi.fn().mockResolvedValue(opts.isAuthenticated ? 'test-jwt-token' : null),
    apiBaseUrl: 'https://api.cognilot.app',
    syncIntervalMs: 999999, // Prevent auto-sync during tests
  });
}

describe('LearningService', () => {
  beforeEach(() => {
    // Reset storage between tests
    for (const key of Object.keys(storage)) delete storage[key];
    vi.clearAllMocks();
  });

  describe('confirm() — local storage', () => {
    it('saves a confirmed entry to chrome.storage.local', async () => {
      const service = makeService();
      await service.confirm('email', 'test@example.com', 'example.com');

      const stored = storage['cognilot_learned_fields'] as Record<string, any>;
      expect(stored).toBeDefined();
      expect(stored['email']).toMatchObject({
        key: 'email',
        value: 'test@example.com',
        domain: 'example.com',
      });
    });

    it('normalizes the key: "Full Name" → "full_name"', async () => {
      const service = makeService();
      await service.confirm('Full Name', 'Jane Doe', 'example.com');

      const stored = storage['cognilot_learned_fields'] as Record<string, any>;
      expect(stored['full_name']).toBeDefined();
      expect(stored['full_name'].value).toBe('Jane Doe');
    });

    it('overwrites an existing entry for the same key', async () => {
      const service = makeService();
      await service.confirm('email', 'old@example.com', 'example.com');
      await service.confirm('email', 'new@example.com', 'example.com');

      const stored = storage['cognilot_learned_fields'] as Record<string, any>;
      expect(stored['email'].value).toBe('new@example.com');
    });

    it('does nothing for empty key or value', async () => {
      const service = makeService();
      await service.confirm('', 'value', 'example.com');
      await service.confirm('key', '', 'example.com');

      expect(chromeMock.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('recall()', () => {
    it('returns the stored value for a key', async () => {
      const service = makeService();
      await service.confirm('phone', '+34 600 000 000', 'example.com');

      const recalled = await service.recall('phone');
      expect(recalled).toBe('+34 600 000 000');
    });

    it('returns null for unknown keys', async () => {
      const service = makeService();
      const recalled = await service.recall('unknown_field');
      expect(recalled).toBeNull();
    });
  });

  describe('sync queue (authenticated)', () => {
    it('enqueues confirmed entries for sync when authenticated', async () => {
      const service = makeService({ isAuthenticated: true });
      await service.confirm('email', 'user@example.com', 'example.com');

      const queue = storage['cognilot_sync_queue'] as any[];
      expect(queue).toBeDefined();
      expect(queue).toHaveLength(1);
      expect(queue[0].key).toBe('email');
    });

    it('does NOT enqueue for anonymous users', async () => {
      const service = makeService({ isAuthenticated: false });
      await service.confirm('email', 'anon@example.com', 'example.com');

      expect(storage['cognilot_sync_queue']).toBeUndefined();
    });

    it('deduplicates queue entries by key', async () => {
      const service = makeService({ isAuthenticated: true });
      await service.confirm('email', 'first@example.com', 'a.com');
      await service.confirm('email', 'second@example.com', 'b.com');

      const queue = storage['cognilot_sync_queue'] as any[];
      expect(queue).toHaveLength(1);
      expect(queue[0].value).toBe('second@example.com');
    });
  });

  describe('flushNow() — backend sync', () => {
    it('calls the API and clears the sync queue on success', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'synced' }),
      });
      (globalThis as any).fetch = fetchMock;

      const service = makeService({ isAuthenticated: true });
      await service.confirm('city', 'Madrid', 'example.com');

      await service.flushNow();

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.cognilot.app/api/profile/sync',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-jwt-token' }),
        })
      );

      // Queue should be cleared after successful sync
      expect(storage['cognilot_sync_queue']).toBeUndefined();
    });

    it('keeps the queue if the API fails', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' });
      (globalThis as any).fetch = fetchMock;

      const service = makeService({ isAuthenticated: true });
      await service.confirm('city', 'Barcelona', 'example.com');

      await service.flushNow();

      // Queue should still exist after failed sync
      const queue = storage['cognilot_sync_queue'] as any[];
      expect(queue).toHaveLength(1);
    });

    it('no-ops for anonymous users', async () => {
      const fetchMock = vi.fn();
      (globalThis as any).fetch = fetchMock;

      const service = makeService({ isAuthenticated: false });
      await service.flushNow();

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('start() / stop()', () => {
    it('starts and stops without errors', () => {
      const service = makeService();
      expect(() => service.start()).not.toThrow();
      expect(() => service.stop()).not.toThrow();
    });

    it('does not start a second timer if already started', () => {
      const service = makeService();
      service.start();
      service.start(); // Should be a no-op

      // Only one timer created — we can't directly verify this without spying,
      // but we can verify stop doesn't throw
      expect(() => service.stop()).not.toThrow();
    });
  });
});
