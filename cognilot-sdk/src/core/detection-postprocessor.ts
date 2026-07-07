import { FieldDetectionResponse } from '../contracts/field-detection-response';

/**
 * DetectionPostprocessor
 * Handles refinement and filtering of detected fields.
 */
export class DetectionPostprocessor {
  /**
   * Post-processes the list of detected questions.
   */
  process(questions: FieldDetectionResponse[]) {
    // 1. Filter out duplicates
    // 2. Resolve conflicts
    // 3. Mark certain fields as higher priority
    return questions.filter((q) => !!q.text);
  }
}
