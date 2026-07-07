import { FieldDetectionResponse } from './field-detection-response';
import { PageContext } from './page-context';

export interface DecisionRequest {
  questions: {
    key: string;
    field: FieldDetectionResponse;
  }[];
  provider?: string;
  page_context: PageContext;
}
