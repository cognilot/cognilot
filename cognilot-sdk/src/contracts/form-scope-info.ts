import { CognilotNode } from '../platforms/interface';

/**
 * FormScopeInfo
 * Represents a detected form boundary (either a native <form> or a virtual container)
 * identified during a full-page scan. Used by the FieldRegistry to group fields
 * that belong to the same logical form.
 */
export interface FormScopeInfo {
  /** Stable unique identifier for this scope (derived from DOM id or generated). */
  id: string;

  /** The DOM node acting as the form container. */
  container: CognilotNode;

  /**
   * How the scope was identified:
   * - 'native'   → explicit <form> tag or role="form"
   * - 'virtual'  → framework class (.form-container, .gform_wrapper, etc.)
   * - 'radial'   → inferred via radial expansion algorithm
   * - 'pattern'  → detected via repeating structural pattern
   */
  strategy: 'native' | 'virtual' | 'radial' | 'pattern';

  /** CSS selector for this container (for debugging / sidebar display). */
  selector: string;

  /** Score assigned by the FormScopeResolver (higher = more confident). */
  score: number;
}
