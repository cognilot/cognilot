/**
 * CONFIG.TS - Cognilot Extension Configuration
 * Environment-specific configuration separated from constants.
 * Exported as proper ES module.
 */

// ─── Environment Detection ──────────────────────────────────
export const Environment = {
  isProduction: (): boolean => import.meta.env.PROD,
  isDevelopment: (): boolean => import.meta.env.DEV,
  getBackendURL: (): string => {
    return Environment.isProduction()
      ? 'https://vague-felita-Cognilot-7f5d4232.koyeb.app'
      : import.meta.env.VITE_API_BASE_URL_LOCAL || 'http://localhost:8000';
  },
  getWebAppURL: (): string => {
    return Environment.isProduction()
      ? 'https://Cognilot-web.vercel.app'
      : import.meta.env.VITE_WEB_APP_URL_LOCAL || 'http://localhost:5173';
  },
} as const;

// ─── Feature Flags ──────────────────────────────────────────
export const FeatureFlags = {
  COPILOT_SUGGESTIONS: true,
  LOCAL_AUTOFILL: true,
  ACTIVE_CURSOR: true,
  AGENT_BUTTON: true,
  FLOATING_BUTTONS: true,
  SOLVE_ALL: true,
  RADIO_CHECKBOX_FILL: true,
} as const;

// ─── Configuration ──────────────────────────────────────────
export interface EndpointsConfig {
  AUTH_GOOGLE: string;
  AUTH_REFRESH: string;
  AUTH_ME: string;
  PROFILES: string;
  PROFILES_ACTIVE: string;
}

export interface DelaysConfig {
  BETWEEN_QUESTIONS: number;
  QUESTION_OBSERVER: number;
  DOM_READY: number;
  EDITOR_PROCESSING: number;
  DETECTION_CACHE: number;
}

export interface PerformanceConfig {
  MAX_QUESTIONS_PER_BATCH: number;
  RETRY_ATTEMPTS: number;
  TIMEOUT: number;
}

export interface LoggingConfig {
  ENABLED: boolean;
  LEVEL: string;
  CONSOLE_LOGS: boolean;
}

export interface CopilotSuggestionsConfig {
  ENABLED_BY_DEFAULT: boolean;
  CACHE_SIZE_LIMIT: number;
  SUGGESTION_TIMEOUT: number;
  LOADING_DELAY: number;
  FOCUS_DELAY: number;
}

export interface AppConfig {
  readonly BACKEND_URL: string;
  readonly WEB_APP_URL: string;
  ENDPOINTS: EndpointsConfig;
  DELAYS: DelaysConfig;
  PERFORMANCE: PerformanceConfig;
  LOGGING: LoggingConfig;
  COPILOT_SUGGESTIONS: CopilotSuggestionsConfig;
}

export const Config: AppConfig = {
  get BACKEND_URL(): string {
    return Environment.getBackendURL();
  },

  get WEB_APP_URL(): string {
    return Environment.getWebAppURL();
  },

  ENDPOINTS: {
    AUTH_GOOGLE: '/api/auth/google',
    AUTH_REFRESH: '/api/auth/refresh',
    AUTH_ME: '/api/auth/me',
    PROFILES: '/api/users/profiles',
    PROFILES_ACTIVE: '/api/users/profiles/active',
  },

  DELAYS: {
    BETWEEN_QUESTIONS: Environment.isProduction() ? 2000 : 1500,
    QUESTION_OBSERVER: 500,
    DOM_READY: 2000,
    EDITOR_PROCESSING: 300,
    DETECTION_CACHE: 2000,
  },

  PERFORMANCE: {
    MAX_QUESTIONS_PER_BATCH: 10,
    RETRY_ATTEMPTS: 3,
    TIMEOUT: 30000,
  },

  LOGGING: {
    ENABLED: Environment.isDevelopment(),
    LEVEL: Environment.isProduction() ? 'WARN' : 'DEBUG',
    CONSOLE_LOGS: Environment.isDevelopment(),
  },

  COPILOT_SUGGESTIONS: {
    ENABLED_BY_DEFAULT: true,
    CACHE_SIZE_LIMIT: 100,
    SUGGESTION_TIMEOUT: 10000,
    LOADING_DELAY: 500,
    FOCUS_DELAY: 300,
  },
};

// Freeze to prevent modification
Object.freeze(FeatureFlags);
Object.freeze(Environment);
Object.freeze(Config);

/**
 * Registers config on the global object for backward compatibility.
 * Called by the entry point (content.ts, background.ts, sidebar.ts).
 */
export function registerGlobals(): void {
  const g =
    typeof window !== 'undefined'
      ? window
      : (self as unknown as typeof globalThis as unknown as Window);
  g.Cognilot = g.Cognilot || ({} as Window['Cognilot']);
  (g.Cognilot as Record<string, unknown>).Environment = Environment;
  (g.Cognilot as Record<string, unknown>).FeatureFlags = FeatureFlags;
  (g.Cognilot as Record<string, unknown>).Config = Config;
  (g as unknown as Record<string, unknown>).CONFIG = Config;
}
