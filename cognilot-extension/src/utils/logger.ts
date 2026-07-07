/**
 * LOGGER.TS - Cognilot Logging Utilities
 * Centralized logging with levels and production safety.
 * Exported as ES module — no longer attached directly to window.
 */

export interface LoggerInterface {
  LEVELS: Record<string, number>;
  currentLevel: number;
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  success(message: string, ...args: unknown[]): void;
  processing(message: string, ...args: unknown[]): void;
  setLevel(level: number): void;
  enableProductionMode(): void;
  enableDevelopmentMode(): void;
}

const LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

function getCurrentLevel(): number {
  const Cognilot = (typeof window !== 'undefined'
    ? window
    : (self as unknown as typeof globalThis)) as unknown as {
    Cognilot?: { Environment?: { isProduction(): boolean } };
  };
  if (Cognilot.Cognilot?.Environment?.isProduction()) {
    return LEVELS.WARN;
  }
  return LEVELS.DEBUG;
}

let _overriddenLevel: number | null = null;

export const Logger: LoggerInterface = {
  LEVELS,

  get currentLevel(): number {
    if (_overriddenLevel !== null) return _overriddenLevel;
    return getCurrentLevel();
  },

  set currentLevel(level: number) {
    _overriddenLevel = level;
  },

  error(message: string, ...args: unknown[]): void {
    if (this.currentLevel >= this.LEVELS.ERROR) {
      console.error('❌ [Cognilot]', message, ...args);
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (this.currentLevel >= this.LEVELS.WARN) {
      console.warn('⚠️ [Cognilot]', message, ...args);
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (this.currentLevel >= this.LEVELS.INFO) {
      console.log('ℹ️ [Cognilot]', message, ...args);
    }
  },

  debug(message: string, ...args: unknown[]): void {
    if (this.currentLevel >= this.LEVELS.DEBUG) {
      console.log('🔧 [Cognilot]', message, ...args);
    }
  },

  success(message: string, ...args: unknown[]): void {
    if (this.currentLevel >= this.LEVELS.INFO) {
      console.log('✅ [Cognilot]', message, ...args);
    }
  },

  processing(message: string, ...args: unknown[]): void {
    if (this.currentLevel >= this.LEVELS.INFO) {
      console.log('🔄 [Cognilot]', message, ...args);
    }
  },

  setLevel(level: number): void {
    _overriddenLevel = level;
    this.info(`Log level set to: ${Object.keys(this.LEVELS)[level]}`);
  },

  enableProductionMode(): void {
    this.setLevel(this.LEVELS.WARN);
  },

  enableDevelopmentMode(): void {
    this.setLevel(this.LEVELS.DEBUG);
  },
};

/**
 * Registers Logger on the global object for backward compatibility.
 */
export function registerGlobals(): void {
  const g =
    typeof window !== 'undefined'
      ? window
      : (self as unknown as typeof globalThis as unknown as Window);
  g.Cognilot = g.Cognilot || ({} as Window['Cognilot']);
  (g.Cognilot as Record<string, unknown>).Logger = Logger;
}
