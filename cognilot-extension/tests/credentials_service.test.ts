import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CredentialsService,
  normalizeDomain,
  saveCredential,
  getCredentialsForDomain,
  getCredentialForEmail,
  deleteCredential,
} from '../src/services/credentials_service';

describe('CredentialsService', () => {
  let mockStorage: Record<string, any> = {};

  beforeEach(() => {
    mockStorage = {};
    (global as any).chrome = {
      storage: {
        local: {
          get: vi.fn((keys: string[], cb: (res: any) => void) => {
            const res: Record<string, any> = {};
            keys.forEach((k) => {
              res[k] = mockStorage[k];
            });
            cb(res);
          }),
          set: vi.fn((data: Record<string, any>, cb: () => void) => {
            Object.assign(mockStorage, data);
            if (cb) cb();
          }),
        },
      },
    };
  });

  it('normalizes domain correctly', () => {
    expect(normalizeDomain('https://www.falabella.airavirtual.com/login')).toBe(
      'https://www.falabella.airavirtual.com/login'
    );
    expect(normalizeDomain('www.google.com')).toBe('google.com');
  });

  it('saves and retrieves credentials for a domain', async () => {
    await saveCredential('test@gmail.com', 'secret123', 'falabella.com');
    const creds = await getCredentialsForDomain('falabella.com');

    expect(creds.length).toBe(1);
    expect(creds[0].email).toBe('test@gmail.com');
    expect(creds[0].password).toBe('secret123');
  });

  it('retrieves credential by email and domain', async () => {
    await saveCredential('user@domain.com', 'pass123', 'example.com');
    const found = await getCredentialForEmail('user@domain.com', 'example.com');

    expect(found).not.toBeNull();
    expect(found?.password).toBe('pass123');
  });

  it('updates password if saving credential for existing email and domain', async () => {
    await saveCredential('user@domain.com', 'oldpass', 'example.com');
    await saveCredential('user@domain.com', 'newpass', 'example.com');

    const creds = await getCredentialsForDomain('example.com');
    expect(creds.length).toBe(1);
    expect(creds[0].password).toBe('newpass');
  });

  it('deletes credential by id', async () => {
    const entry = await saveCredential('delete@me.com', 'pass', 'example.com');
    await deleteCredential(entry.id);

    const creds = await getCredentialsForDomain('example.com');
    expect(creds.length).toBe(0);
  });
});
