/**
 * BaseStorageAdapter
 * Default stub for storage operations.
 * Host should extend this or implement the Interface directly.
 */
export abstract class BaseStorageAdapter {
  abstract get(key: string | string[]): Promise<any>;
  abstract set(key: string, value: any): Promise<void>;
  abstract remove(key: string | string[]): Promise<void>;
}

/**
 * BaseMessagingAdapter
 * Handles internal and external message passing.
 */
export abstract class BaseMessagingAdapter {
  abstract sendMessage(payload: any): Promise<any>;
  abstract onMessage(handler: (msg: any) => void): void;
}

/**
 * BasePageContextAdapter
 * Provides environment-specific DOM or View tree access.
 */
export abstract class BasePageContextAdapter {
  abstract findElement(selector: string, type: 'css' | 'xpath'): any;
  abstract getUrl(): string;
  abstract getTitle(): string;
}

/**
 * BaseDOMAdapter
 * Stub for direct DOM interactions.
 */
export abstract class BaseDOMAdapter {
  abstract click(element: any): Promise<void>;
  abstract type(element: any, text: string): Promise<void>;
  abstract select(element: any, value: string): Promise<void>;
  abstract check(element: any, state: boolean): Promise<void>;
  abstract dispatchEvent(element: any, eventName: string): Promise<void>;
}

/**
 * BaseSettingsAdapter
 * Stub for settings retrieval and persistence.
 */
export abstract class BaseSettingsAdapter {
  abstract getSettings(): Promise<any>;
  abstract getSetting(path: string, fallback: any): Promise<any>;
  abstract updateSetting(path: string, value: any): Promise<void>;
}

/**
 * BaseAuthAdapter
 * Stub for auth-related operations.
 */
export abstract class BaseAuthAdapter {
  abstract getToken(): Promise<string | null>;
  abstract isAuthenticated(): Promise<boolean>;
  abstract getActiveProfile(): Promise<any>;
  abstract getUser(): Promise<any>;
  abstract logout(): Promise<void>;
  abstract fetchMe(): Promise<any>;
}
