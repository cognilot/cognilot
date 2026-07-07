export interface DecisionResponse {
  questionId?: string;
  decision?: string; // Legacy/Mapped
  selected_indices?: number[];
  selected_values?: string[];
  ghost_indices?: number[]; // Suggested choices in the UI
  is_example?: boolean; // For AI-proposals
  text_content?: string;
  source: 'llm' | 'profile' | 'alias' | 'cache' | 'local';
  timestamp?: number;
  confidence?: number;
}
