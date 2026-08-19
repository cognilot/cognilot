import { CognilotNode } from '../platforms/interface';
import { LabelMetadata } from '../engines/detection/label-extractor';

/**
 * FieldResolution
 * Unified resolution result for a registry entry.
 * The `source` field indicates where the value came from, eliminating the need
 * for separate localResolution / aiResolution objects.
 */
export interface FieldResolution {
  /** The resolved text value (top suggestion). */
  value: string | null;

  /**
   * All available options (for discrete fields like select, radio, etc.)
   * For free-text fields this typically contains a single item.
   */
  options: string[];

  /**
   * Where the resolution came from:
   * - 'alias_cache'    → matched from the user's learned alias cache
   * - 'profile_cache'  → matched from the user's profile data
   * - 'ai'             → returned by the Cognilot AI backend
   * - 'existing_value' → field already had a value when the page was scanned
   */
  source: 'alias_cache' | 'profile_cache' | 'ai' | 'existing_value';

  /**
   * The underlying memory profile key (e.g. 'country', 'degree', 'given_name')
   */
  memoryKey?: string | null;
}

/**
 * FieldRegistryEntry
 * The central data unit of the Universal Suggestion architecture.
 *
 * Each entry represents one text-input field detected during a full-page scan.
 * It extends the legacy FieldDetectionResponse shape with:
 *  - `belongsToForm`  → whether the field is part of a significant form container
 *  - `formScopeId`    → which form scope it belongs to (for batch prefetch grouping)
 *  - `resolution`     → the unified, source-agnostic resolution result
 *  - `status`         → simple lifecycle state: pending → resolved | failed
 *
 * STATUS SEMANTICS:
 *  - 'pending'  → No resolution found yet. This field WILL be included in an AI batch request.
 *  - 'resolved' → Has a value from any source (alias, profile, ai, or existing_value).
 *                 Ghost text can be shown immediately. AI request is NOT needed.
 *  - 'failed'   → Resolution was attempted but the AI returned no usable result.
 */
export interface FieldRegistryEntry {
  // ── Inherited from FieldDetectionResponse ─────────────────────────────────
  /** Stable field identifier (derived from DOM id or generated). */
  id: string;
  /** Input type (text, email, password, select, radio, checkbox, textarea…). */
  type: string;
  /** DOM tag name (INPUT, TEXTAREA, SELECT, DIV for contenteditable…). */
  tagName: string;
  /** The `name` attribute value. */
  name: string;
  /** Extracted human-readable label for this field. */
  text: string;
  /** Placeholder attribute value. */
  placeholder: string;
  /** Whether the field is marked as required. */
  required: boolean;
  /** Available options (for select / radio / checkbox fields). */
  options: any[];
  /** Structural ref id within a form scope (e.g. "field-2"). */
  ref_id: string;
  /** Section ref id if the field belongs to a visual sub-section (e.g. "section-1"). */
  section_ref_id: string;
  /** Rich label metadata produced by the LabelExtractor. */
  metadata: LabelMetadata;
  /** CSS selector that uniquely identifies this element. */
  selector: string;
  /** Reference to the platform-abstracted DOM node. */
  node: CognilotNode;

  // ── Registry flags ────────────────────────────────────────────────────────
  /**
   * Whether this field belongs to a significant form container
   * (native <form>, virtual container, or radial-expansion result).
   * Used to decide whether to trigger a batch AI prefetch on click.
   */
  belongsToForm: boolean;

  /**
   * The stable ID of the FormScopeInfo this field belongs to.
   * Null when `belongsToForm` is false (isolated/standalone field).
   */
  formScopeId: string | null;

  // ── Unified resolution ────────────────────────────────────────────────────
  /**
   * The resolved suggestion for this field.
   * Null when `status` is 'pending' or 'failed'.
   * The `source` property indicates whether it came from local cache or AI.
   */
  resolution: FieldResolution | null;

  // ── Lifecycle status ──────────────────────────────────────────────────────
  /**
   * Simple 3-state lifecycle:
   * - 'pending'  → awaiting resolution (will be sent to AI batch)
   * - 'resolved' → has a valid resolution from any source
   * - 'failed'   → resolution was attempted and failed
   */
  status: 'pending' | 'resolved' | 'failed';

  /**
   * Priority score assigned to the form this field belongs to.
   * Derived from SDK DetectionEngine / FormScopeResolver.
   */
  formScore?: number;
}
