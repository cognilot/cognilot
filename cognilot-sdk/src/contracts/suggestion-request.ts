import { FieldDetectionResponse } from './field-detection-response';
import { PageContext } from './page-context';

export interface SuggestionRequest {
  questions: {
    key: string;
    field: FieldDetectionResponse;
  }[];
  provider?: string;
  page_context: PageContext;
}
