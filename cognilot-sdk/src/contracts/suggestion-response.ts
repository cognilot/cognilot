export interface SuggestionResponse {
  questionId: string;
  options: string[];
  type: 'discrete' | 'narrative' | 'example' | 'enhance_text' | 'refine';
  source: 'llm' | 'profile' | 'alias' | 'cache' | 'local';
  status?: 'pending' | 'success' | 'error';
  timestamp?: number;
}
