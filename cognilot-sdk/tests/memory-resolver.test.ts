import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryResolver } from '../src/core/memory-resolver';
import { MockSDK } from './mocks';

class InMemoryStorage {
  private store: Record<string, any> = {};

  async get(keys: string | string[]) {
    if (Array.isArray(keys)) {
      const res: Record<string, any> = {};
      for (const k of keys) {
        if (this.store[k] !== undefined) res[k] = this.store[k];
      }
      return res;
    }
    return { [keys]: this.store[keys] };
  }

  async set(items: Record<string, any>) {
    Object.assign(this.store, items);
  }
}

describe('MemoryResolver', () => {
  let sdk: any;
  let memoryResolver: MemoryResolver;
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
    sdk = new MockSDK({} as any);
    sdk.adapters = {
      storage,
      auth: { isAuthenticated: vi.fn().mockResolvedValue(true) },
      settings: { getSettings: vi.fn().mockResolvedValue({}) },
    };
    memoryResolver = new MemoryResolver(sdk);
  });

  it('should match seed dictionary patterns against local memory cache', async () => {
    await storage.set({
      Cognilot_memory_cache: {
        email: ['user@example.com'],
        full_name: ['John Doe'],
      },
    });

    const field = {
      text: 'Correo Electrónico',
      name: 'email_input',
      type: 'email',
    } as any;

    const result = await memoryResolver.resolve(field);
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
    expect(result?.suggestion.options).toContain('user@example.com');
    expect(result?.suggestion.source).toBe('memory');
    expect(result?.memoryKey).toBe('email');
  });

  it('should match social profile and linkedin seed patterns', async () => {
    await storage.set({
      Cognilot_memory_cache: {
        social_profile: ['https://github.com/jackaranaram'],
        linkedin: ['https://linkedin.com/in/jackarana'],
      },
    });

    const field1 = {
      text: 'Link to social profile 1',
      name: 'user[profile_social_accounts][][url]',
      type: 'text',
    } as any;

    const result1 = await memoryResolver.resolve(field1);
    expect(result1).not.toBeNull();
    expect(result1?.success).toBe(true);
    expect(result1?.suggestion.options).toContain('https://github.com/jackaranaram');
    expect(result1?.memoryKey).toBe('social_profile');

    const field2 = {
      text: 'LinkedIn Profile URL',
      name: 'linkedin_url',
      type: 'text',
    } as any;

    const result2 = await memoryResolver.resolve(field2);
    expect(result2).not.toBeNull();
    expect(result2?.success).toBe(true);
    expect(result2?.suggestion.options).toContain('https://linkedin.com/in/jackarana');
    expect(result2?.memoryKey).toBe('linkedin');
  });

  it('should match direct memory keys', async () => {
    await storage.set({
      Cognilot_memory_cache: {
        portfolio_url: ['https://johndoe.dev'],
      },
    });

    const field = {
      text: 'portfolio_url',
      name: 'portfolio',
      type: 'text',
    } as any;

    const result = await memoryResolver.resolve(field);
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
    expect(result?.suggestion.options).toContain('https://johndoe.dev');
    expect(result?.suggestion.source).toBe('memory');
  });

  it('should never resolve password or sensitive fields', async () => {
    await storage.set({
      Cognilot_memory_cache: {
        password: ['secret123'],
      },
    });

    const field = {
      text: 'password',
      type: 'password',
    } as any;

    const result = await memoryResolver.resolve(field);
    expect(result).toBeNull();
  });

  it('should enqueue learned fields into Cognilot_sync_queue', async () => {
    const success = await memoryResolver.enqueueLearning('User City', 'Madrid', true);
    expect(success).toBe(true);

    const queue = await memoryResolver.getSyncQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].label).toBe('user city');
    expect(queue[0].value).toBe('Madrid');
  });
});
