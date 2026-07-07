/**
 * INDEX.TS
 * Central Module Orchestrator (Application Layer).
 * Initializes all controllers in the system.
 */

import { Logger } from './utils/logger';
import { AutocompleteController } from './controllers/autocomplete_controller';

let _settings: Record<string, unknown> = {};
let _initialized = false;

/**
 * Initializes all registered controllers.
 */
export function init(): void {
  if (_initialized) return;
  _initialized = true;

  Logger.info('🏗️ Cognilot Modules: Layered Architecture Initializing...');

  // 1. Load global settings from the SDK adapter or cache
  const settingsAdapter = window.Cognilot?.SDK?.Core?.Registry?.getAdapter('settings') as
    | { getSettings(): Promise<Record<string, unknown>> }
    | undefined;
  if (settingsAdapter) {
    settingsAdapter.getSettings().then((s) => {
      _settings = s || {};
    });
  } else {
    _settings = (window.Cognilot?.Settings as Record<string, unknown>) || {};
  }

  // 2. Initialize Autocomplete Controller
  AutocompleteController.init();

  // 3. Inspector Controller initializes on demand (enable/disable)

  Logger.info('✅ All modules initialized.');
}

export function dispose(): void {
  AutocompleteController.dispose();
  _initialized = false;
}

export function getSettings(): Record<string, unknown> {
  return _settings;
}

export const Modules = {
  init,
  dispose,
  getSettings,
  get settings(): Record<string, unknown> {
    return _settings;
  },
};
