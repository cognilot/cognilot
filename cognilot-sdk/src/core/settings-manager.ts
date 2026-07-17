/**
 * SettingsManager
 * Legacy port for settings path navigation.
 */
export const SettingsManager = {
  DEFAULT_SETTINGS: {
    visual: { showBorders: true, showButtons: true },
    copilotSuggestions: {
      enabled: true,
      ghostText: true,
      showInPlaceholder: true,
      cacheSuggestions: true,
      learnCustomFields: true,
      useProfileContext: true,
    },
    aiModels: {
      suggestionsProvider: 'llama-3.3-70b-versatile',
      actionsProvider: 'llama-3.3-70b-versatile',
    },
    byok: {
      enabled: false,
      provider: 'openai',
      apiKey: '',
      model: '',
      providers: {
        openai: { apiKey: '', model: 'gpt-4o-mini' },
        anthropic: { apiKey: '', model: 'claude-3-5-sonnet-20241022' },
        groq: { apiKey: '', model: 'llama-3.3-70b-versatile' },
      },
    },
  },

  getValueByPath(obj: any, path: string, fallback: any) {
    if (!obj || !path) return fallback;
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return fallback;
      }
    }
    return value;
  },

  setValueByPath(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) current[key] = {};
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
  },

  deepMerge(target: any, source: any): any {
    const output = Object.assign({}, target);
    if (source && typeof source === 'object') {
      Object.keys(source).forEach((key) => {
        if (source[key] && typeof source[key] === 'object') {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  },
};
