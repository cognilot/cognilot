/**
 * CONSTANTS.TS - Cognilot Extension Static Constants
 * Static values that don't change by environment.
 * Exported as ES module.
 */

export interface SelectorsConfig {
  PRIORITY_ORDER: readonly string[];
  TEXT_INPUTS: readonly string[];
  RADIO_OPTIONS: readonly string[];
}

export interface CSSClassesConfig {
  HIGHLIGHT: string;
  HIGHLIGHT_STYLE_ID: string;
}

export interface PlatformTypesConfig {
  MICROSOFT_FORMS: string;
  COURSERA: string;
  GOOGLE_FORMS: string;
  MOODLE: string;
  GENERIC: string;
}

export interface QuestionTypesConfig {
  RADIO: string;
  CHECKBOX: string;
  TEXT: string;
  CODE: string;
}

export interface MessagesConfig {
  ALREADY_ACTIVE: string;
  INITIALIZING: string;
  BUTTON_TITLE: string;
  PROCESSING: string;
  COMPLETED: string;
  ERROR_RETRY: string;
  NO_QUESTIONS: string;
  INSPECTOR_ACTIVE: string;
}

export interface ZIndexesConfig {
  OVERLAY: number;
  FLOATING_BUTTON: number;
}

export interface ColorsConfig {
  SUCCESS: string;
  ERROR: string;
  PROCESSING: string;
  HIGHLIGHT: string;
}

export const Constants = {
  BACKEND_URL: 'http://localhost:8000',
  ENDPOINTS: {
    JSON_SOLVE: '/json-solve',
  },

  SELECTORS: {
    PRIORITY_ORDER: [
      '[data-testid*="Question"]',
      '[data-automation-id="questionItem"]',
      '[jscontroller="sWGJ4b"]',
      '.question',
      '.que',
      '.quiz-question',
    ],

    TEXT_INPUTS: [
      'textarea',
      'input[type="text"]',
      'input[type="email"]',
      'input[type="password"]',
      'textarea.inputarea',
      'input[placeholder*="Enter answer"]',
      'textarea[placeholder*="Enter answer"]',
    ],

    RADIO_OPTIONS: [
      'label',
      '[role="radio"]',
      'input[type="radio"]',
      '[data-automation-id="choiceItem"] label',
    ],
  } as SelectorsConfig,

  CSS_CLASSES: {
    HIGHLIGHT: 'aiden-highlight',
    HIGHLIGHT_STYLE_ID: 'aiden-highlight-style',
  } as CSSClassesConfig,

  PLATFORM_TYPES: {
    MICROSOFT_FORMS: 'Microsoft Forms',
    COURSERA: 'Coursera',
    GOOGLE_FORMS: 'Google Forms',
    MOODLE: 'Moodle',
    GENERIC: 'Generic Form',
  } as PlatformTypesConfig,

  QUESTION_TYPES: {
    RADIO: 'radio',
    CHECKBOX: 'checkbox',
    TEXT: 'text',
    CODE: 'code',
  } as QuestionTypesConfig,

  MESSAGES: {
    ALREADY_ACTIVE: '⚠️ Inspector Aiden ya está activo, omitiendo nueva inicialización',
    INITIALIZING: '🚀 Inspector Aiden inicializándose...',
    BUTTON_TITLE: 'Cognilot - Resolver esta pregunta',
    PROCESSING: 'Procesando...',
    COMPLETED: 'Pregunta resuelta ✓',
    ERROR_RETRY: 'Error - Click para reintentar',
    NO_QUESTIONS: 'No se encontraron preguntas en esta página.',
    INSPECTOR_ACTIVE:
      '🔍 Inspector Aiden activado - Haz clic en cualquier elemento para analizarlo',
  } as MessagesConfig,

  Z_INDEXES: {
    OVERLAY: 999999,
    FLOATING_BUTTON: 999998,
  } as ZIndexesConfig,

  COLORS: {
    SUCCESS: '#4CAF50',
    ERROR: '#f44336',
    PROCESSING: '#ff9800',
    HIGHLIGHT: 'limegreen',
  } as ColorsConfig,
} as const;

Object.freeze(Constants);

/**
 * Registers constants on the global object for backward compatibility.
 */
export function registerGlobals(): void {
  const g =
    typeof window !== 'undefined'
      ? window
      : (self as unknown as typeof globalThis as unknown as Window);
  g.Cognilot = g.Cognilot || ({} as Window['Cognilot']);
  (g.Cognilot as Record<string, unknown>).Constants = Constants;
}
