import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CredentialsService,
  normalizeDomain,
  saveCredential,
  getCredentialsForDomain,
  getCredentialForEmail,
  deleteCredential,
  encryptPassword,
  decryptPassword,
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

  describe('normalizeDomain', () => {
    it('normalizes full URLs with paths and protocols', () => {
      expect(normalizeDomain('https://aira.falabella.com/login?ref=1')).toBe('falabella.com');
      expect(normalizeDomain('https://www.falabella.airavirtual.com/login')).toBe(
        'airavirtual.com'
      );
      expect(normalizeDomain('http://vetano.com/auth')).toBe('vetano.com');
    });

    it('strips www and standard subdomains to base domain', () => {
      expect(normalizeDomain('www.google.com')).toBe('google.com');
      expect(normalizeDomain('login.falabella.com')).toBe('falabella.com');
      expect(normalizeDomain('app.vetano.com')).toBe('vetano.com');
    });

    it('handles two-part ccTLDs correctly', () => {
      expect(normalizeDomain('auth.mercadolibre.com.ar')).toBe('mercadolibre.com.ar');
      expect(normalizeDomain('https://login.banco.gob.pe/portal')).toBe('banco.gob.pe');
      expect(normalizeDomain('sub.domain.co.uk')).toBe('domain.co.uk');
    });

    it('preserves localhost and IP addresses', () => {
      expect(normalizeDomain('http://localhost:3000/login')).toBe('localhost');
      expect(normalizeDomain('192.168.1.50:8080')).toBe('192.168.1.50');
    });
  });

  describe('Encryption & Storage', () => {
    it('encrypts and decrypts passwords transparently', async () => {
      const plain = 'super_secret_password_123';
      const encrypted = await encryptPassword(plain);
      expect(encrypted).toMatch(/^enc:v1:/);
      expect(encrypted).not.toContain(plain);

      const decrypted = await decryptPassword(encrypted);
      expect(decrypted).toBe(plain);
    });

    it('handles legacy unencrypted passwords without failing', async () => {
      const plain = 'legacy_unencrypted_pass';
      const decrypted = await decryptPassword(plain);
      expect(decrypted).toBe(plain);
    });
  });

  describe('Domain Isolation (Fixing Cross-Site Overwrite)', () => {
    it('stores distinct passwords for the same email on different domains', async () => {
      const email = 'user@gmail.com';
      const passFalabella = 'falabella_pass_99';
      const passVetano = 'vetano_pass_77';

      // 1. Save credential on Falabella
      await saveCredential(email, passFalabella, 'https://aira.falabella.com/login');

      // 2. Save credential on Vetano with the same email
      await saveCredential(email, passVetano, 'https://vetano.com/auth');

      // 3. Verify Falabella retrieves its own password
      const falabellaCred = await getCredentialForEmail(email, 'aira.falabella.com');
      expect(falabellaCred).not.toBeNull();
      expect(falabellaCred?.domain).toBe('falabella.com');
      expect(falabellaCred?.password).toBe(passFalabella);

      // 4. Verify Vetano retrieves its own password
      const vetanoCred = await getCredentialForEmail(email, 'vetano.com');
      expect(vetanoCred).not.toBeNull();
      expect(vetanoCred?.domain).toBe('vetano.com');
      expect(vetanoCred?.password).toBe(passVetano);

      // 5. Verify storage holds 2 distinct entries with encrypted passwords
      const stored = mockStorage['Cognilot_credentials'];
      expect(stored.length).toBe(2);
      expect(stored[0].password).toMatch(/^enc:v1:/);
      expect(stored[1].password).toMatch(/^enc:v1:/);
    });

    it('updates password for existing email on the SAME domain without touching other domains', async () => {
      const email = 'shared@company.com';
      await saveCredential(email, 'passA', 'siteA.com');
      await saveCredential(email, 'passB', 'siteB.com');

      // Update siteA password
      await saveCredential(email, 'passA_updated', 'siteA.com');

      const credA = await getCredentialForEmail(email, 'siteA.com');
      const credB = await getCredentialForEmail(email, 'siteB.com');

      expect(credA?.password).toBe('passA_updated');
      expect(credB?.password).toBe('passB');
    });

    it('retrieves all credentials for a specific domain', async () => {
      await saveCredential('admin@vetano.com', 'adminPass', 'vetano.com');
      await saveCredential('sales@vetano.com', 'salesPass', 'vetano.com');
      await saveCredential('other@other.com', 'otherPass', 'other.com');

      const vetanoCreds = await getCredentialsForDomain('app.vetano.com');
      expect(vetanoCreds.length).toBe(2);
      expect(vetanoCreds.map((c) => c.email)).toEqual(['admin@vetano.com', 'sales@vetano.com']);
    });

    it('deletes credential by id', async () => {
      const entry = await saveCredential('delete@me.com', 'pass', 'example.com');
      await deleteCredential(entry.id);

      const creds = await getCredentialsForDomain('example.com');
      expect(creds.length).toBe(0);
    });
  });
});
