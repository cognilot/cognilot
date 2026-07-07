import { CognilotNode } from '../platforms/interface';

export interface FieldContext {
  key: string;
  label: string;
  type: string;
  value: string;
  required: boolean;
  options: any[]; // Choice options
  // Structural context (internal SDK use)
  container?: CognilotNode;
  groupNodes?: CognilotNode[];
  isInsideIframe: boolean;
}
