import { CognilotNode } from '../platforms/interface';
import { LabelMetadata } from '../engines/detection/label-extractor';

export interface FieldDetectionResponse {
  id: string;
  type: string;
  tagName: string;
  name: string;
  text: string;
  placeholder: string;
  required: boolean;
  options: any[]; // For select/radio data
  ref_id: string;
  section_ref_id: string;
  metadata: LabelMetadata;
  selector: string;
  node: CognilotNode;
}
