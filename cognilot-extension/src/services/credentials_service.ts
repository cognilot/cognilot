/**
 * SERVICES/CREDENTIALS_SERVICE.TS
 * Service for local credential management (Email + Password) stored in chrome.storage.local.
 * Features:
 * - Robust eTLD+1 domain extraction and normalization (handling URLs, subdomains, ports)
 * - Local AES-GCM 256-bit encryption for stored passwords
 * - Strict domain-scoped credential resolution
 */

export interface CredentialEntry {
  id: string;
  domain: string;
  email: string;
  password: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'Cognilot_credentials';
const ENC_PREFIX = 'enc:v1:';
const MASTER_SECRET = 'cognilot_vault_salt_8f93e1';
const TWO_PART_TLD_REGEX = /\.(com|co|org|net|edu|gov|gob|nom|mil)\.([a-z]{2})$/i;
const IP_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/**
 * Normalizes any URL, host, or domain string into a clean base domain (eTLD+1).
 * Handles subdomains (login.falabella.com -> falabella.com), ports, protocols, and multi-part TLDs.
 */
export function normalizeDomain(urlOrHost?: string): string {
  let raw = (
    urlOrHost ||
    (typeof window !== 'undefined' ? window.location?.hostname : '') ||
    ''
  ).trim();
  if (!raw) return '';

  // Extract hostname if raw contains protocol or path
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.includes('://') ||
    raw.includes('/')
  ) {
    try {
      const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
      raw = url.hostname;
    } catch {
      raw = raw.replace(/^https?:\/\//i, '').split('/')[0];
    }
  }

  // Strip port and lowercase
  const host = raw
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/^www\./i, '')
    .trim();

  // Return directly if localhost or IP address
  if (host === 'localhost' || IP_REGEX.test(host)) {
    return host;
  }

  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) {
    return host;
  }

  // Check for two-part TLD (e.g. .com.ar, .co.uk, .gob.pe)
  if (TWO_PART_TLD_REGEX.test(host)) {
    if (parts.length >= 3) {
      return parts.slice(-3).join('.');
    }
    return host;
  }

  // Standard TLD (e.g. .com, .org, .net, .io, .app)
  return parts.slice(-2).join('.');
}

/**
 * Derives an AES-GCM 256-bit CryptoKey using PBKDF2 from a master secret.
 */
async function getEncryptionKey(): Promise<CryptoKey | null> {
  const subtle = typeof crypto !== 'undefined' ? crypto.subtle : undefined;
  if (!subtle) return null;

  try {
    const enc = new TextEncoder();
    const rawKey = enc.encode(MASTER_SECRET);
    const keyMaterial = await subtle.importKey('raw', rawKey, 'PBKDF2', false, ['deriveKey']);
    return await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('cognilot_salt_static'),
        iterations: 10000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (err) {
    console.warn('[CredentialsService] Failed to derive encryption key:', err);
    return null;
  }
}

/**
 * Encrypts a plaintext password using AES-GCM.
 */
export async function encryptPassword(plainText: string): Promise<string> {
  if (!plainText) return '';
  if (plainText.startsWith(ENC_PREFIX)) return plainText;

  try {
    const subtle = typeof crypto !== 'undefined' ? crypto.subtle : undefined;
    if (!subtle) return plainText;

    const key = await getEncryptionKey();
    if (!key) return plainText;

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    const cipherBuffer = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    const ivB64 = btoa(String.fromCharCode(...iv));
    const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));
    return `${ENC_PREFIX}${ivB64}:${cipherB64}`;
  } catch (err) {
    console.warn('[CredentialsService] Encryption fallback to plaintext:', err);
    return plainText;
  }
}

/**
 * Decrypts an encrypted password string. Transparently handles legacy plaintext.
 */
export async function decryptPassword(cipherText: string): Promise<string> {
  if (!cipherText || !cipherText.startsWith(ENC_PREFIX)) return cipherText;

  try {
    const subtle = typeof crypto !== 'undefined' ? crypto.subtle : undefined;
    if (!subtle) return cipherText;

    const key = await getEncryptionKey();
    if (!key) return cipherText;

    const payload = cipherText.slice(ENC_PREFIX.length);
    const [ivB64, cipherB64] = payload.split(':');
    if (!ivB64 || !cipherB64) return cipherText;

    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));

    const decryptedBuffer = await subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.warn('[CredentialsService] Decryption failed, returning raw:', err);
    return cipherText;
  }
}

/**
 * Retrieves all stored credentials, decrypting passwords.
 */
export async function getCredentials(): Promise<CredentialEntry[]> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve([]);
      return;
    }
    chrome.storage.local.get([STORAGE_KEY], async (result) => {
      const rawList: CredentialEntry[] = result[STORAGE_KEY] || [];
      const decryptedList: CredentialEntry[] = await Promise.all(
        rawList.map(async (entry) => ({
          ...entry,
          domain: normalizeDomain(entry.domain),
          password: await decryptPassword(entry.password),
        }))
      );
      resolve(decryptedList);
    });
  });
}

/**
 * Retrieves credentials specifically matching the given domain (or current page domain).
 */
export async function getCredentialsForDomain(domain?: string): Promise<CredentialEntry[]> {
  const targetDomain = normalizeDomain(domain);
  if (!targetDomain) return [];
  const all = await getCredentials();
  const targetBase = targetDomain.split('.')[0];

  return all.filter((entry) => {
    const entryDomain = normalizeDomain(entry.domain);
    if (entryDomain === targetDomain) return true;
    const entryBase = entryDomain.split('.')[0];
    return entryBase.length >= 4 && entryBase === targetBase;
  });
}

/**
 * Retrieves a specific credential matching both email and domain.
 */
export async function getCredentialForEmail(
  email: string,
  domain?: string
): Promise<CredentialEntry | null> {
  const targetDomain = normalizeDomain(domain);
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !targetDomain) return null;

  const domainCredentials = await getCredentialsForDomain(targetDomain);
  return (
    domainCredentials.find((entry) => entry.email.trim().toLowerCase() === normalizedEmail) || null
  );
}

/**
 * Saves or updates credentials for a domain. Passwords are automatically encrypted.
 */
export async function saveCredential(
  email: string,
  password: string,
  domain?: string
): Promise<CredentialEntry> {
  const targetDomain = normalizeDomain(domain);
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!targetDomain || !normalizedEmail) {
    throw new Error('Valid domain and email are required to save credentials.');
  }

  const rawList: CredentialEntry[] = await new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve([]);
      return;
    }
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });

  const existingIdx = rawList.findIndex(
    (e) =>
      normalizeDomain(e.domain) === targetDomain && e.email.trim().toLowerCase() === normalizedEmail
  );

  const now = Date.now();
  const encryptedPassword = await encryptPassword(password);
  let updatedEntry: CredentialEntry;

  if (existingIdx >= 0) {
    rawList[existingIdx] = {
      ...rawList[existingIdx],
      domain: targetDomain,
      password: encryptedPassword,
      updatedAt: now,
    };
    updatedEntry = {
      ...rawList[existingIdx],
      password, // return decrypted representation
    };
  } else {
    const rawEntry = {
      id: `cred_${now}_${Math.random().toString(36).substring(2, 9)}`,
      domain: targetDomain,
      email: email.trim(),
      password: encryptedPassword,
      createdAt: now,
      updatedAt: now,
    };
    rawList.push(rawEntry);
    updatedEntry = {
      ...rawEntry,
      password, // return decrypted representation
    };
  }

  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve(updatedEntry);
      return;
    }
    chrome.storage.local.set({ [STORAGE_KEY]: rawList }, () => {
      resolve(updatedEntry);
    });
  });
}

/**
 * Deletes a credential entry by ID.
 */
export async function deleteCredential(id: string): Promise<void> {
  const rawList: CredentialEntry[] = await new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve([]);
      return;
    }
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });

  const filtered = rawList.filter((e) => e.id !== id);
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve();
      return;
    }
    chrome.storage.local.set({ [STORAGE_KEY]: filtered }, () => {
      resolve();
    });
  });
}

export const CredentialsService = {
  normalizeDomain,
  encryptPassword,
  decryptPassword,
  getCredentials,
  getCredentialsForDomain,
  getCredentialForEmail,
  saveCredential,
  deleteCredential,
};
