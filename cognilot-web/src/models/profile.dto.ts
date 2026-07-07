/**
 * ProfileDTO represents the flat map of learned data (PII / Aliases).
 */
export type ProfileDTO = Record<string, string[]>;

/**
 * PreferencesDTO represents the user's application configuration.
 */
export interface PreferencesDTO {
  copilotSuggestions?: {
    enabled?: boolean;
    learnCustomFields?: boolean;
    ghostText?: boolean;
  };
  aiModels?: {
    suggestionsProvider?: string;
    actionsProvider?: string;
  };
  visual?: {
    showBorders?: boolean;
    showButtons?: boolean;
  };
  [key: string]: any;
}

/**
 * Combined structure for API communication or Full State
 */
export interface UserProfileResponse {
  data_learned: ProfileDTO;
  preferences: PreferencesDTO;
}
