import { FieldRegistryEntry, FieldResolution } from '../contracts/field-registry-entry';

/**
 * FieldRegistry
 *
 * The in-memory source of truth for ALL text-input fields detected on the current page.
 * Populated proactively by PageScanner at page load, and updated incrementally
 * when new fields appear (via MutationObserver in PageScanner).
 *
 * The registry is keyed by a stable field ID (derived from the DOM `id` attribute or
 * auto-generated during scanning). A secondary index by raw DOM node reference allows
 * O(1) lookups when the user clicks a field.
 *
 * STATUS LIFECYCLE:
 *   PageScanner   → register() with status 'pending' or 'resolved' (if local match)
 *   ActionEngine  → reads status on click; calls updateResolution() after AI response
 *   Sidebar       → reads getAll() / getPendingFields() / getFormFields() to render UI
 */
export class FieldRegistry {
  /** Primary store: field id → FieldRegistryEntry */
  private _entries: Map<string, FieldRegistryEntry> = new Map();

  /**
   * Secondary index: raw DOM element → field id
   * Enables O(1) lookups by DOM reference without iterating the entire map.
   */
  private _nodeIndex: WeakMap<object, string> = new WeakMap();

  // ── Write operations ────────────────────────────────────────────────────────

  /**
   * Registers a newly scanned field entry.
   * If an entry with the same id already exists, it is overwritten.
   * The raw DOM node is indexed for fast lookup.
   */
  register(entry: FieldRegistryEntry): void {
    this._entries.set(entry.id, entry);
    const rawNode = entry.node?.getRawNode?.();
    if (rawNode) {
      this._nodeIndex.set(rawNode, entry.id);
    }
  }

  /**
   * Updates the resolution and status of an existing entry.
   * Typically called by ActionEngine after a successful AI response.
   *
   * @param id        - The stable field id.
   * @param resolution - The resolved value/options/source from AI or local cache.
   */
  updateResolution(id: string, resolution: FieldResolution): void {
    const entry = this._entries.get(id);
    if (!entry) {
      console.warn(`[FieldRegistry] updateResolution: no entry found for id "${id}"`);
      return;
    }
    entry.resolution = resolution;
    entry.status = 'resolved';
    this._entries.set(id, entry);
  }

  /**
   * Marks an entry as failed (AI returned no usable result).
   * @param id - The stable field id.
   */
  markFailed(id: string): void {
    const entry = this._entries.get(id);
    if (!entry) return;
    entry.status = 'failed';
    this._entries.set(id, entry);
  }

  /**
   * Removes all entries. Called when the page navigates (SPA route change).
   */
  clear(): void {
    this._entries.clear();
    // WeakMap entries are automatically GC'd when DOM nodes are collected.
  }

  // ── Read operations ─────────────────────────────────────────────────────────

  /**
   * Looks up an entry by the raw DOM element reference.
   * This is the primary lookup path, called on every user interaction (click / focus).
   * Uses the WeakMap secondary index for O(1) performance.
   *
   * @param rawElement - The raw (unwrapped) DOM element, e.g. from event.target.
   * @returns The matching entry, or null if this field was not scanned.
   */
  findByNode(rawElement: object): FieldRegistryEntry | null {
    const id = this._nodeIndex.get(rawElement);
    if (!id) return null;
    return this._entries.get(id) ?? null;
  }

  /**
   * Looks up an entry by its CSS selector.
   * Slower than findByNode (O(n) scan), used as a fallback when the node reference
   * is unavailable (e.g. after a DOM re-render that recreated the element).
   *
   * @param selector - CSS selector string stored in entry.selector.
   * @returns The first matching entry, or null.
   */
  findBySelector(selector: string): FieldRegistryEntry | null {
    if (!selector) return null;
    for (const entry of this._entries.values()) {
      if (entry.selector === selector) return entry;
    }
    return null;
  }

  /**
   * Returns the entry for a given field id, or null.
   */
  findById(id: string): FieldRegistryEntry | null {
    return this._entries.get(id) ?? null;
  }

  // ── Collection accessors ───────────────────────────────────────────────────

  /** Returns all registered entries as an array. */
  getAll(): FieldRegistryEntry[] {
    return Array.from(this._entries.values());
  }

  /**
   * Returns only fields that belong to a significant form container.
   * Used by the sidebar "Solo Formulario" filter.
   */
  getFormFields(): FieldRegistryEntry[] {
    return this.getAll().filter((e) => e.belongsToForm);
  }

  /**
   * Returns only fields with status === 'pending'.
   * These are the fields that have no local resolution and need an AI request.
   * Used by PageScanner to report counts and by ActionEngine to build batch payloads.
   */
  getPendingFields(): FieldRegistryEntry[] {
    return this.getAll().filter((e) => e.status === 'pending');
  }

  /**
   * Returns all pending fields that belong to a specific form scope.
   * Used by ActionEngine to build the batch prefetch payload when the user
   * clicks a field that is part of a form.
   *
   * @param formScopeId - The stable ID of the form scope to filter by.
   */
  getPendingFieldsByFormScope(formScopeId: string): FieldRegistryEntry[] {
    return this.getAll().filter(
      (e) => e.status === 'pending' && e.belongsToForm && e.formScopeId === formScopeId
    );
  }

  /**
   * Returns all fields that belong to a specific form scope (any status).
   * Useful for the sidebar to show all fields of a given form.
   *
   * @param formScopeId - The stable ID of the form scope.
   */
  getByFormScope(formScopeId: string): FieldRegistryEntry[] {
    return this.getAll().filter((e) => e.formScopeId === formScopeId);
  }

  // ── Computed statistics ────────────────────────────────────────────────────

  /** Total number of registered entries. */
  get size(): number {
    return this._entries.size;
  }

  /** Number of fields with status === 'resolved'. */
  get resolvedCount(): number {
    return this.getAll().filter((e) => e.status === 'resolved').length;
  }

  /** Number of fields with status === 'pending'. */
  get pendingCount(): number {
    return this.getAll().filter((e) => e.status === 'pending').length;
  }

  /** Number of fields that belong to at least one form scope. */
  get formFieldCount(): number {
    return this.getFormFields().length;
  }

  /**
   * Returns a summary object suitable for sending to the sidebar or for logging.
   */
  getSummary(): {
    total: number;
    resolved: number;
    pending: number;
    failed: number;
    formFields: number;
    isolatedFields: number;
  } {
    const all = this.getAll();
    return {
      total: all.length,
      resolved: all.filter((e) => e.status === 'resolved').length,
      pending: all.filter((e) => e.status === 'pending').length,
      failed: all.filter((e) => e.status === 'failed').length,
      formFields: all.filter((e) => e.belongsToForm).length,
      isolatedFields: all.filter((e) => !e.belongsToForm).length,
    };
  }
}
