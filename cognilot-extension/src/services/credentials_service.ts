/**
 * SERVICES/CREDENTIALS_SERVICE.TS
 * Service for local credential management (Email + Password) stored in chrome.storage.local.
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

export function normalizeDomain(urlOrHost?: string): string {
  const host = urlOrHost || (typeof window !== 'undefined' ? window.location.hostname : '');
  return host.toLowerCase().replace(/^www\./, '');
}

export async function getCredentials(): Promise<CredentialEntry[]> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve([]);
      return;
    }
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const list: CredentialEntry[] = result[STORAGE_KEY] || [];
      resolve(list);
    });
  });
}

export async function getCredentialsForDomain(domain?: string): Promise<CredentialEntry[]> {
  const targetDomain = normalizeDomain(domain);
  const all = await getCredentials();
  return all.filter((entry) => normalizeDomain(entry.domain) === targetDomain);
}

export async function getCredentialForEmail(
  email: string,
  domain?: string
): Promise<CredentialEntry | null> {
  const targetDomain = normalizeDomain(domain);
  const normalizedEmail = email.trim().toLowerCase();
  const domainCredentials = await getCredentialsForDomain(targetDomain);
  return (
    domainCredentials.find((entry) => entry.email.trim().toLowerCase() === normalizedEmail) || null
  );
}

export async function saveCredential(
  email: string,
  password: string,
  domain?: string
): Promise<CredentialEntry> {
  const targetDomain = normalizeDomain(domain);
  const all = await getCredentials();
  const normalizedEmail = email.trim().toLowerCase();
  const existingIdx = all.findIndex(
    (e) =>
      normalizeDomain(e.domain) === targetDomain && e.email.trim().toLowerCase() === normalizedEmail
  );

  const now = Date.now();
  let updatedEntry: CredentialEntry;

  if (existingIdx >= 0) {
    all[existingIdx] = {
      ...all[existingIdx],
      password,
      updatedAt: now,
    };
    updatedEntry = all[existingIdx];
  } else {
    updatedEntry = {
      id: `cred_${now}_${Math.random().toString(36).substring(2, 9)}`,
      domain: targetDomain,
      email: email.trim(),
      password,
      createdAt: now,
      updatedAt: now,
    };
    all.push(updatedEntry);
  }

  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve(updatedEntry);
      return;
    }
    chrome.storage.local.set({ [STORAGE_KEY]: all }, () => {
      resolve(updatedEntry);
    });
  });
}

export async function deleteCredential(id: string): Promise<void> {
  const all = await getCredentials();
  const filtered = all.filter((e) => e.id !== id);
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
  getCredentials,
  getCredentialsForDomain,
  getCredentialForEmail,
  saveCredential,
  deleteCredential,
};
