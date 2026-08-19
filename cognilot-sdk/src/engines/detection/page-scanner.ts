import { CognilotSDK } from '../../index';
import { FieldRegistry } from '../../core/field-registry';
import { FieldRegistryEntry, FieldResolution } from '../../contracts/field-registry-entry';
import { FormScopeInfo } from '../../contracts/form-scope-info';

/**
 * PageScanner
 *
 * Orchestrates the proactive full-page scan that runs once at page load.
 * Responsibilities:
 *  1. Call DetectionEngine.scanAllFields() to collect + classify every field.
 *  2. For each field, run local resolution (alias cache / profile cache / existing value).
 *  3. Populate the FieldRegistry with the results.
 *  4. Notify the sidebar extension via messaging (pageScanComplete event).
 *  5. Start a MutationObserver to incrementally scan fields added after load (SPAs, modals).
 *  6. Persist a serializable registry snapshot to chrome.storage.session (keyed by tabId)
 *     so the sidebar can hydrate instantly even if the content script hasn't responded yet.
 *  7. Watch for SPA URL changes and clear + re-scan when the URL changes (M6).
 *
 * This class does NOT modify any existing detection or suggestion engine.
 * It is a pure addition to the SDK — Phase 1 of the Universal Suggestion redesign.
 */
export class PageScanner {
  private sdk: CognilotSDK;
  private registry: FieldRegistry;
  private _observer: MutationObserver | null = null;
  private _isScanning = false;

  /**
   * Debounce delay (ms) for the incremental MutationObserver scan.
   * Prevents flooding the scan when a SPA adds many nodes at once.
   */
  private readonly _incrementalDebounceMs = 300;
  private _incrementalTimer: ReturnType<typeof setTimeout> | null = null;

  // ── SPA URL watcher (M6) ────────────────────────────────────────────────────
  private _lastKnownUrl = '';
  private _urlWatcherInterval: ReturnType<typeof setInterval> | null = null;
  private readonly _urlWatchIntervalMs = 1000;

  constructor(sdk: CognilotSDK, registry: FieldRegistry) {
    this.sdk = sdk;
    this.registry = registry;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Entry point called by CognilotSDK on page load (or DOMContentLoaded).
   *
   * Executes the full proactive scan:
   *  1. Collects + classifies all fields via DetectionEngine.scanAllFields().
   *  2. Resolves each field locally (alias, profile, or existing value).
   *  3. Registers every field in the FieldRegistry.
   *  4. Persists a serializable snapshot in chrome.storage.session (per tabId).
   *  5. Sends pageScanComplete to the sidebar.
   *  6. Starts the MutationObserver for dynamic fields (SPAs, modals).
   *  7. Starts the URL watcher for SPA navigations.
   */
  async scanOnPageLoad(): Promise<void> {
    if (this._isScanning) return;
    this._isScanning = true;

    try {
      console.log('[PageScanner] 🔍 Starting proactive full-page scan...');

      // ── Step 1: Collect + classify all fields ───────────────────────────────
      const { fields, formScopes } = this.sdk.detection.scanAllFields();

      console.log(
        `[PageScanner] Found ${fields.length} field(s) across ${formScopes.length} form scope(s).`
      );

      // ── Step 2 & 3: Resolve locally and register ────────────────────────────
      for (const field of fields) {
        const resolution = await this._resolveFieldLocally(field);
        if (resolution) {
          field.resolution = resolution;
          field.status = 'resolved';
        }
        // status remains 'pending' if no local match was found
        this.registry.register(field);
      }

      // ── Step 4: Persist snapshot to storage.session ─────────────────────────
      await this._persistRegistrySnapshot();

      // ── Step 5: Notify sidebar ───────────────────────────────────────────────
      this._notifySidebar(formScopes);

      // ── Step 6: Start observing for dynamic fields ───────────────────────────
      this.startObserving();

      // ── Step 7: Start URL watcher for SPA navigation ────────────────────────
      this._startUrlWatcher();

      const summary = this.registry.getSummary();
      console.log('[PageScanner] ✅ Scan complete.', summary);
    } catch (err) {
      console.error('[PageScanner] ❌ Scan failed:', err);
    } finally {
      this._isScanning = false;
    }
  }

  /**
   * Starts a MutationObserver that watches for DOM changes.
   * When new input elements appear (e.g. modals, wizard steps, SPA navigation),
   * an incremental scan is triggered with a debounce.
   *
   * Safe to call multiple times — only one observer will be active.
   */
  startObserving(): void {
    if (this._observer) return;

    const globalCtx = this.sdk.platform.getGlobalContext();
    const docBody = globalCtx.document?.body;
    if (!docBody) return;

    this._observer = new MutationObserver((mutations) => {
      const hasNewInputs = mutations.some((m) =>
        Array.from(m.addedNodes).some(
          (n) =>
            n instanceof HTMLElement &&
            (n.matches(
              'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"]'
            ) ||
              n.querySelector(
                'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"]'
              ))
        )
      );

      if (hasNewInputs) {
        this._scheduleIncrementalScan();
      }
    });

    this._observer.observe(docBody, { childList: true, subtree: true });
    console.log('[PageScanner] 👁️ MutationObserver active.');
  }

  /** Stops observing. Called on SPA route change or SDK destroy(). */
  stopObserving(): void {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._incrementalTimer) {
      clearTimeout(this._incrementalTimer);
      this._incrementalTimer = null;
    }
    console.log('[PageScanner] 🛑 MutationObserver stopped.');
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Attempts to resolve a field using local caches (no AI request).
   *
   * Resolution priority:
   *  1. Existing value in the DOM field (the user already typed something).
   *  2. Alias cache match (learned value from previous form submissions).
   *  3. Profile cache match (user profile heuristics: name, email, phone…).
   *
   * Returns null if no local match is found (field will be marked 'pending').
   */
  private async _resolveFieldLocally(field: FieldRegistryEntry): Promise<FieldResolution | null> {
    // ── Priority 1: Existing value (skip radio/checkbox — their .value is
    //    the HTML value attribute, not user input) ──────────────────────────
    const type = (field.type || '').toLowerCase();
    const isChoice = type === 'radio' || type === 'checkbox';
    if (!isChoice) {
      const existingValue = (field.node as any).value?.trim?.() ?? '';
      if (existingValue) {
        return {
          value: existingValue,
          options: [existingValue],
          source: 'existing_value',
        };
      }
    }

    // Helper to verify if any choice field option matches a memory suggestion (Tanteo)
    const matchChoiceValue = (fieldOpts: any[], memOpts: string[]) => {
      if (
        !Array.isArray(fieldOpts) ||
        fieldOpts.length === 0 ||
        !Array.isArray(memOpts) ||
        memOpts.length === 0
      ) {
        return null;
      }
      const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      for (const opt of fieldOpts) {
        const optText = String(opt.text || '')
          .trim()
          .toLowerCase();
        const optVal = String(opt.value || '')
          .trim()
          .toLowerCase();
        const nOptText = normalize(optText);
        const nOptVal = normalize(optVal);

        if (!optText && !optVal) continue;

        for (const mem of memOpts) {
          const mStr = String(mem).trim().toLowerCase();
          const nMem = normalize(mStr);
          if (!mStr) continue;

          // 1. Exact match
          if (optText === mStr || optVal === mStr || nOptText === nMem || nOptVal === nMem) {
            return { value: String(opt.text || opt.value || mem), mem: mStr };
          }

          // 2. Substring match for longer texts (minimum 3 chars)
          if (nMem.length >= 3 && nOptText.length >= 3) {
            if (nOptText.includes(nMem) || nMem.includes(nOptText)) {
              return { value: String(opt.text || opt.value || mem), mem: mStr };
            }
          }
          if (nMem.length >= 3 && nOptVal.length >= 3) {
            if (nOptVal.includes(nMem) || nMem.includes(nOptVal)) {
              return { value: String(opt.text || opt.value || mem), mem: mStr };
            }
          }
        }
      }
      return null;
    };

    // ── Priority 2: Alias cache ────────────────────────────────────────────
    try {
      // FieldDetectionResponse shape is a subset of FieldRegistryEntry, safe to cast
      const aliasResult = await this.sdk.alias.resolve(field as any);
      if (aliasResult?.success && aliasResult.suggestion?.options?.length) {
        const memOpts = aliasResult.suggestion.options.map(String);
        if (isChoice) {
          const matched = matchChoiceValue(field.options, memOpts);
          if (matched) {
            return {
              value: matched.value,
              options: [matched.value],
              source: 'alias_cache',
              memoryKey: aliasResult.memoryKey || null,
            };
          }
        } else {
          return {
            value: memOpts[0],
            options: memOpts,
            source: 'alias_cache',
            memoryKey: aliasResult.memoryKey || null,
          };
        }
      }
    } catch (e) {
      console.warn('[PageScanner] Alias resolution error:', e);
    }

    // ── Priority 3: Profile cache ──────────────────────────────────────────
    try {
      const profileResult = await this.sdk.profile.resolve(field as any);
      if (profileResult?.success && profileResult.suggestion?.options?.length) {
        const memOpts = profileResult.suggestion.options.map(String);
        if (isChoice) {
          const matched = matchChoiceValue(field.options, memOpts);
          if (matched) {
            return {
              value: matched.value,
              options: [matched.value],
              source: 'profile_cache',
              memoryKey: profileResult.memoryKey || null,
            };
          }
        } else {
          return {
            value: memOpts[0],
            options: memOpts,
            source: 'profile_cache',
            memoryKey: profileResult.memoryKey || null,
          };
        }
      }
    } catch (e) {
      console.warn('[PageScanner] Profile resolution error:', e);
    }

    // ── Priority 4: Option tanteo for choice fields ────────────────────────
    // When a radio/checkbox/select has predefined options, check if any
    // option text matches a stored profile value (e.g. option "Perú" matches
    // profile.country = ["Perú"]). This guesses the answer without AI.
    if (isChoice) {
      const fieldOptions = Array.isArray(field.options) ? field.options : [];
      if (fieldOptions.length > 0) {
        try {
          const storageResult = await this.sdk.adapters?.storage?.get('Cognilot_profile_cache');
          const rawProfile = storageResult?.Cognilot_profile_cache || storageResult || {};
          const dataLearned = rawProfile.data_learned || rawProfile;

          // Map from memory string -> memoryKey
          const memToKey = new Map<string, string>();
          for (const [key, val] of Object.entries(dataLearned)) {
            if (Array.isArray(val)) {
              val.forEach((v) => {
                if (v !== undefined && v !== null && v !== '') {
                  memToKey.set(String(v).toLowerCase().trim(), key);
                }
              });
            } else if (val !== undefined && val !== null && val !== '') {
              memToKey.set(String(val).toLowerCase().trim(), key);
            }
          }

          const memOpts = Array.from(memToKey.keys());
          const matched = matchChoiceValue(fieldOptions, memOpts);

          if (matched) {
            return {
              value: matched.value,
              options: [matched.value],
              source: 'profile_cache',
              memoryKey: memToKey.get(matched.mem) || null,
            };
          }
        } catch (e) {
          console.warn('[PageScanner] Option tanteo error:', e);
        }
      }
    }

    return null;
  }

  /**
   * Sends a pageScanComplete message to the sidebar (Chrome extension messaging).
   * The sidebar uses this to render the field list and counters.
   */
  private _notifySidebar(formScopes: FormScopeInfo[]): void {
    try {
      const summary = this.registry.getSummary();
      this.sdk.adapters?.messaging?.sendMessage({
        action: 'pageScanComplete',
        totalFields: summary.total,
        resolvedLocally: summary.resolved,
        pending: summary.pending,
        formScopes: formScopes.length,
        formScopeDetails: formScopes.map((s) => ({
          id: s.id,
          strategy: s.strategy,
          selector: s.selector,
          score: s.score,
          fieldCount: this.registry.getByFormScope(s.id).length,
        })),
      });
    } catch (e) {
      // Messaging may not be available in all environments (e.g. tests)
      console.warn('[PageScanner] Could not notify sidebar:', e);
    }
  }

  /**
   * Persists a serializable snapshot of the current FieldRegistry to
   * chrome.storage.session keyed by `Cognilot_registry_{tabId}`.
   *
   * This allows the sidebar to hydrate instantly (M2) even before the
   * content script responds to sidebarGetRegistry messages. The snapshot
   * is intentionally lightweight — DOM nodes are stripped and only the
   * data the sidebar needs is kept.
   */
  private async _persistRegistrySnapshot(): Promise<void> {
    try {
      const chromeApi = (globalThis as any).chrome;
      if (!chromeApi?.storage?.session || !chromeApi?.runtime?.id) return;

      const all = this.registry.getAll();
      if (all.length === 0) return;

      // Serialize — strip non-transferable DOM node references
      const snapshot = all.map((f) => ({
        id: f.id,
        type: f.type,
        tagName: f.tagName,
        name: f.name,
        text: f.text,
        placeholder: f.placeholder,
        required: f.required,
        options: f.options,
        selector: f.selector,
        belongsToForm: f.belongsToForm,
        formScopeId: f.formScopeId,
        formScore: (f as any).formScore || 0,
        status: f.status,
        resolution: f.resolution,
        // Include formName if present (set by handleRegistryData in sidebar)
        formName: (f as any).formName || null,
      }));

      const url = (globalThis as any).location?.href || '';
      const key = `Cognilot_registry_snapshot`;

      await chromeApi.storage.session.set({
        [key]: {
          fields: snapshot,
          url,
          timestamp: Date.now(),
          total: all.length,
        },
      });

      console.log(`[PageScanner] 💾 Registry snapshot persisted (${snapshot.length} fields).`);
    } catch (e) {
      // Storage.session may not be available in all environments
      console.warn('[PageScanner] Could not persist registry snapshot:', e);
    }
  }

  /**
   * Schedules a debounced incremental scan.
   * Only scans fields NOT already in the registry (new ones added by the SPA).
   */
  private _scheduleIncrementalScan(): void {
    if (this._incrementalTimer) clearTimeout(this._incrementalTimer);
    this._incrementalTimer = setTimeout(() => {
      this._runIncrementalScan();
    }, this._incrementalDebounceMs);
  }

  /**
   * Runs a targeted scan for fields that appeared after the initial page load.
   * Skips fields already registered (checked via registry.findByNode).
   */
  private async _runIncrementalScan(): Promise<void> {
    console.log('[PageScanner] 🔄 Incremental scan triggered...');

    const { fields: allFields } = this.sdk.detection.scanAllFields();
    const newFields = allFields.filter((f) => !this.registry.findByNode(f.node.getRawNode()));

    if (newFields.length === 0) {
      console.log('[PageScanner] No new fields found.');
      return;
    }

    console.log(`[PageScanner] Found ${newFields.length} new field(s).`);
    for (const field of newFields) {
      const resolution = await this._resolveFieldLocally(field);
      if (resolution) {
        field.resolution = resolution;
        field.status = 'resolved';
      }
      this.registry.register(field);
    }

    // Persist updated snapshot after incremental scan (M2)
    await this._persistRegistrySnapshot();

    this._notifySidebar([]);
  }

  // ── SPA URL Watcher (M6) ───────────────────────────────────────────────────

  /**
   * Starts polling the current URL every second to detect SPA navigations.
   * When the URL changes, clears the registry and triggers a full re-scan
   * so the sidebar always reflects the fields of the CURRENT page.
   *
   * Uses setInterval (not History API patching) to be non-invasive and
   * compatible with all SPA frameworks (React Router, Vue Router, Next.js, etc.).
   *
   * Safe to call multiple times — only one interval will be active.
   */
  private _startUrlWatcher(): void {
    if (this._urlWatcherInterval) return;

    const globalCtx = this.sdk.platform.getGlobalContext();
    this._lastKnownUrl = globalCtx.location?.href || '';

    this._urlWatcherInterval = setInterval(() => {
      const currentUrl = globalCtx.location?.href || '';
      if (currentUrl === this._lastKnownUrl) return;

      const oldUrl = this._lastKnownUrl;
      this._lastKnownUrl = currentUrl;

      console.log(`[PageScanner] 🔄 SPA URL changed: ${oldUrl} → ${currentUrl}`);

      // Stop the old MutationObserver (new one will start after re-scan)
      this.stopObserving();

      // Clear stale registry entries from the previous page
      this.registry.clear();

      // Invalidate the SDK detection cache
      this.sdk.detection.invalidateCache();

      // Run a fresh full scan for the new page
      // Use a small delay to let the SPA finish rendering its new DOM
      setTimeout(() => {
        this.scanOnPageLoad();
      }, 500);
    }, this._urlWatchIntervalMs);

    console.log('[PageScanner] 🕐 SPA URL watcher active.');
  }

  /** Stops the SPA URL watcher interval. */
  private _stopUrlWatcher(): void {
    if (this._urlWatcherInterval) {
      clearInterval(this._urlWatcherInterval);
      this._urlWatcherInterval = null;
    }
  }
}
