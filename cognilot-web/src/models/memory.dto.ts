/**
 * MemoryDTO represents the flat map of learned facts and user data.
 */
export type MemoryDTO = Record<string, string[]>;

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
 * UserMemoryResponse represents the memory state and preferences.
 */
export interface UserMemoryResponse {
  data: MemoryDTO;
  preferences: PreferencesDTO;
  // Compatibility field
  data_learned?: MemoryDTO;
}

// Backward compatibility types
export type ProfileDTO = MemoryDTO;
export type UserProfileResponse = UserMemoryResponse;
