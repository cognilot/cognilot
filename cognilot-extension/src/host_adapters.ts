/**
 * HOST_ADAPTERS.TS
 * Implementing SDK Adapter Interfaces for the Chrome Extension Host.
 *
 * NOTE: These classes extend from window.Cognilot.SDK.Adapters.* which is set
 * by the minified SDK. They cannot be imported directly as ES modules since
 * the SDK uses a global namespace pattern. The `getBaseClass()` factory
 * pattern retrieves the base class at runtime.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type StorageAreaName = 'local' | 'sync' | 'session';

function getBaseClass(path: string): new (...args: any[]) => any {
  const global =
    typeof window !== 'undefined'
      ? window
      : (self as unknown as typeof globalThis as unknown as Window);
  const parts = path.split('.');
  let obj: any = global;
  for (const part of parts) {
    obj = obj?.[part];
  }
  return obj || class {};
}

// ─── Storage Adapter ─────────────────────────────────────────
export class ExtensionStorageAdapter extends (getBaseClass(
  'Cognilot.SDK.Adapters.StorageAdapter'
) as new () => Record<string, any>) {
  async get(
    keys: string | string[],
    type: StorageAreaName = 'local'
  ): Promise<Record<string, unknown>> {
    const storage =
      (chrome.storage as unknown as Record<string, chrome.storage.StorageArea>)[type] ||
      chrome.storage.local;
    return new Promise((resolve) => {
      storage.get(keys, resolve);
    });
  }

  async set(
    keyOrItems: string | Record<string, unknown>,
    valueOrType: unknown = false,
    type: StorageAreaName = 'local'
  ): Promise<void> {
    let items: Record<string, unknown> = {};
    let storageType: StorageAreaName = 'local';

    if (typeof keyOrItems === 'string') {
      items = { [keyOrItems]: valueOrType };
      storageType = type;
    } else {
      items = keyOrItems;
      storageType = typeof valueOrType === 'string' ? (valueOrType as StorageAreaName) : 'local';
    }

    const storage =
      (chrome.storage as unknown as Record<string, chrome.storage.StorageArea>)[storageType] ||
      chrome.storage.local;
    return new Promise((resolve) => {
      storage.set(items, resolve);
    });
  }

  async remove(keys: string | string[], type: StorageAreaName = 'local'): Promise<void> {
    const storage =
      (chrome.storage as unknown as Record<string, chrome.storage.StorageArea>)[type] ||
      chrome.storage.local;
    return new Promise((resolve) => {
      storage.remove(keys, resolve);
    });
  }
}

// ─── Messaging Adapter ──────────────────────────────────────
export class ExtensionMessagingAdapter extends (getBaseClass(
  'Cognilot.SDK.Adapters.MessagingAdapter'
) as new () => Record<string, any>) {
  async sendMessage(message: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, {}, (response) => {
        const runtime = chrome.runtime as any;
        if (runtime.lastError) {
          reject(new Error(runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  addListener(
    callback: (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => boolean | undefined
  ): void {
    chrome.runtime.onMessage.addListener(callback);
  }

  removeListener(
    callback: (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => boolean | undefined
  ): void {
    chrome.runtime.onMessage.removeListener(callback);
  }
}

// ─── DOM Adapter ────────────────────────────────────────────
export class ExtensionDOMAdapter extends (getBaseClass(
  'Cognilot.SDK.Adapters.DOMAdapter'
) as new () => Record<string, any>) {
  async click(element: HTMLElement): Promise<void> {
    if (element) {
      element.click();
      const inputEl = element as HTMLInputElement;
      if (
        element.tagName === 'INPUT' &&
        (inputEl.type === 'radio' || inputEl.type === 'checkbox')
      ) {
        inputEl.checked = true;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  async type(element: HTMLElement, text: string): Promise<void> {
    if (element) {
      let target = element;
      if (
        element.tagName !== 'INPUT' &&
        element.tagName !== 'TEXTAREA' &&
        !(element as HTMLElement).isContentEditable
      ) {
        const innerInput = element.querySelector(
          'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea, [contenteditable="true"]'
        ) as HTMLElement | null;
        if (innerInput) {
          target = innerInput;
        }
      }

      target.focus();

      if ((target as HTMLElement).isContentEditable) {
        target.innerText = text;
      } else {
        let proto: object | null = HTMLInputElement.prototype;
        if (target.tagName === 'TEXTAREA') proto = HTMLTextAreaElement.prototype;

        const descriptor = proto ? Object.getOwnPropertyDescriptor(proto, 'value') : null;

        if (descriptor?.set) {
          descriptor.set.call(target, text);
        } else {
          (target as HTMLInputElement).value = text;
        }
      }

      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      (target as HTMLElement).blur();
    }
  }

  async select(selectElement: HTMLSelectElement, value: string): Promise<void> {
    if (selectElement) {
      selectElement.value = value;
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async check(element: HTMLInputElement, state: boolean): Promise<void> {
    if (element) {
      element.checked = state;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async dispatchEvent(element: HTMLElement, eventName: string): Promise<void> {
    if (element) {
      element.dispatchEvent(new Event(eventName, { bubbles: true }));
    }
  }
}

// ─── Settings Adapter ───────────────────────────────────────
export class ExtensionSettingsAdapter extends (getBaseClass(
  'Cognilot.SDK.Adapters.SettingsAdapter'
) as new () => Record<string, any>) {
  cache: Record<string, unknown> | null = null;

  async getSettings(): Promise<Record<string, unknown>> {
    if (this.cache) return this.cache;
    const result = await new Promise<Record<string, unknown>>((resolve) =>
      chrome.storage.local.get('Cognilot_preference_cache', resolve)
    );
    this.cache = (result.Cognilot_preference_cache as Record<string, unknown>) || {};
    return this.cache;
  }

  async getSetting(path: string, fallback: unknown): Promise<unknown> {
    const settings = await this.getSettings();
    const manager = window.Cognilot?.SDK?.Core?.SettingsManager;
    return manager ? manager.getValueByPath(settings, path, fallback) : fallback;
  }

  async updateSetting(path: string, value: unknown): Promise<void> {
    const settings = await this.getSettings();
    const manager = window.Cognilot?.SDK?.Core?.SettingsManager;
    if (manager) {
      manager.setValueByPath(settings, path, value);
      await new Promise<void>((resolve) =>
        chrome.storage.local.set({ Cognilot_preference_cache: settings }, resolve)
      );
      this.cache = settings;

      if (typeof document !== 'undefined') {
        document.dispatchEvent(
          new CustomEvent('Cognilot-settings-changed', {
            detail: { path, value },
          })
        );
      }
    }
  }
}

// ─── Auth Adapter ───────────────────────────────────────────
export class ExtensionAuthAdapter extends (getBaseClass(
  'Cognilot.SDK.Adapters.AuthAdapter'
) as new () => Record<string, any>) {
  async getToken(): Promise<string | null> {
    const res = await new Promise<Record<string, unknown>>((resolve) =>
      chrome.storage.local.get('Cognilot_auth_token', resolve)
    );
    return (res.Cognilot_auth_token as string) || null;
  }

  async isAuthenticated(): Promise<boolean> {
    return !!(await this.getToken());
  }

  async getActiveProfile(): Promise<Record<string, unknown> | null> {
    const res = await new Promise<Record<string, unknown>>((resolve) =>
      chrome.storage.local.get('Cognilot_profile_cache', resolve)
    );
    return (res.Cognilot_profile_cache as Record<string, unknown>) || null;
  }

  async getUser(): Promise<Record<string, unknown> | null> {
    const res = await new Promise<Record<string, unknown>>((resolve) =>
      chrome.storage.local.get('Cognilot_user', resolve)
    );
    return (res.Cognilot_user as Record<string, unknown>) || null;
  }

  async logout(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(
        ['Cognilot_auth_token', 'Cognilot_refresh_token', 'Cognilot_user'],
        resolve
      );
    });
  }

  async fetchMe(): Promise<Record<string, unknown> | null> {
    const token = await this.getToken();
    if (!token) return null;

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: 'proxyRequest',
          route: '/api/users/profiles/active',
          method: 'GET',
          source: 'Auth',
        },
        {},
        (response: { success?: boolean; data?: Record<string, unknown> } | undefined) => {
          resolve(response?.success ? response.data! : null);
        }
      );
    });
  }
}

// ─── Cache Adapter ──────────────────────────────────────────
export class ExtensionCacheAdapter {
  cacheKey: string;
  ttl: number;
  isDecisions: boolean;

  constructor(cacheKey: string, options: { ttl?: number; isDecisions?: boolean } = {}) {
    this.cacheKey = cacheKey;
    this.ttl = options.ttl || 600000;
    this.isDecisions = options.isDecisions || false;
  }

  _getStore(): Record<string, Record<string, Record<string, unknown>>> {
    if (typeof sessionStorage === 'undefined') return {};
    try {
      return JSON.parse(sessionStorage.getItem(this.cacheKey) || '{}') || {};
    } catch (_e) {
      return {};
    }
  }

  _saveStore(store: Record<string, unknown>): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.cacheKey, JSON.stringify(store));
    }
  }

  get(label: string, id?: string): Record<string, unknown> | null {
    const hash = this._getHash(label, id);
    const path =
      typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : 'background';
    const store = this._getStore();
    const entry = store[path]?.[hash];
    if (!entry || Date.now() - (entry.timestamp as number) > this.ttl) return null;
    return entry;
  }

  set(label: string, payload: Record<string, unknown>, id?: string): void {
    const hash = this._getHash(label, (id as string) || (payload.id as string));
    const path =
      typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : 'background';
    const store = this._getStore();
    if (!store[path]) store[path] = {};
    store[path][hash] = { ...payload, timestamp: Date.now() };
    this._saveStore(store);
  }

  _updateBadge(): void {
    const store = this._getStore();
    const path =
      typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : 'background';
    const count = store[path] ? Object.keys(store[path]).length : 0;
    chrome.runtime.sendMessage({ action: 'updateBadge', count: count }, {});
  }

  _getHash(label: string, id = ''): string {
    const clean = (label || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const source = `${clean}|${id}`;
    if (typeof btoa !== 'undefined') {
      return btoa(encodeURIComponent(source)).substring(0, 32);
    }
    return source.substring(0, 32);
  }
}

// ─── Page Context Adapter ───────────────────────────────────
export class ExtensionPageContextAdapter extends (getBaseClass(
  'Cognilot.SDK.Adapters.PageContextAdapter'
) as new () => Record<string, any>) {
  async extractPageContext(): Promise<string> {
    const extractor = window.Cognilot?.SDK?.Core?.DOMExtractor;
    return extractor && typeof extractor.extractPageAsMarkdown === 'function'
      ? extractor.extractPageAsMarkdown()
      : '';
  }

  async extractFields(): Promise<unknown[]> {
    return [];
  }

  findElement(selector: string, type = 'css'): Element | Node | null {
    if (typeof document === 'undefined') return null;
    if (type === 'css') {
      return document.querySelector(selector);
    } else if (type === 'xpath') {
      return document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue;
    }
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────
export const HostAdapters = {
  Storage: ExtensionStorageAdapter,
  Messaging: ExtensionMessagingAdapter,
  DOM: ExtensionDOMAdapter,
  Settings: ExtensionSettingsAdapter,
  Auth: ExtensionAuthAdapter,
  PageContext: ExtensionPageContextAdapter,
  Cache: ExtensionCacheAdapter,
  SuggestionsCache: null as ExtensionCacheAdapter | null,
  DecisionsCache: null as ExtensionCacheAdapter | null,
};

/**
 * Creates the singleton cache instances and registers on the global object.
 */
export function initHostAdapters(): void {
  HostAdapters.SuggestionsCache = new ExtensionCacheAdapter('Cognilot_suggestions_cache');
  HostAdapters.DecisionsCache = new ExtensionCacheAdapter('Cognilot_decisions_cache', {
    isDecisions: true,
  });

  const g =
    typeof window !== 'undefined'
      ? window
      : (self as unknown as typeof globalThis as unknown as Window);
  g.Cognilot = g.Cognilot || ({} as Window['Cognilot']);
  (g.Cognilot as Record<string, unknown>).HostAdapters = HostAdapters;
}
