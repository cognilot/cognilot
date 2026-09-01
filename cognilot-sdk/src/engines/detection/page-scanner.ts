import { CognilotSDK } from '../../index';
import { FieldRegistry } from '../../core/field-registry';
import {
  FieldRegistryEntry,
  FieldResolution,
  isResolvableFieldType,
} from '../../contracts/field-registry-entry';
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
        if (!isResolvableFieldType(field.type) || field.resolvable === false) {
          field.status = 'detected';
          field.resolvable = false;
          field.resolution = null;
        } else {
          const resolution = await this._resolveFieldLocally(field);
          if (resolution) {
            field.resolution = resolution;
            field.status = 'resolved';
          }
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
      const hasChanges = mutations.some((m) => {
        if (m.type === 'childList') {
          return Array.from(m.addedNodes).some(
            (n) =>
              n instanceof HTMLElement &&
              (n.matches(
                'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"]'
              ) ||
                n.querySelector(
                  'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"]'
                ))
          );
        }
        if (m.type === 'attributes') {
          const target = m.target as HTMLElement;
          if (!target || !target.tagName) return false;
          return (
            target.matches(
              'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"], form, fieldset, [role="group"], [role="region"], details, .collapse, .accordion, [class*="collapse"], [class*="accordion"], [class*="modal"], [class*="dialog"], [class*="tab"]'
            ) ||
            target.querySelector(
              'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"]'
            ) !== null
          );
        }
        return false;
      });

      if (hasChanges) {
        this._scheduleIncrementalScan();
      }
    });

    this._observer.observe(docBody, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'aria-expanded', 'open'],
    });
    console.log('[PageScanner] 👁️ MutationObserver active (childList + attributes).');
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
    const type = (field.type || '').toLowerCase();
    if (!isResolvableFieldType(type) || field.resolvable === false) {
      return null;
    }

    // ── Special case: File Input (CV / Resume auto-attachment) ───────────────
    if (type === 'file') {
      let resolvedFileName = 'cv_candidato.pdf';
      try {
        const storage = this.sdk.adapters?.storage;
        if (storage) {
          const res = await storage.get(['Cognilot_memory_cache']);
          const memCache = res?.Cognilot_memory_cache || res || {};
          const flatMemory = memCache.data || memCache.data_learned || memCache || {};
          const found =
            flatMemory.cv_file_name ||
            flatMemory.cv_file ||
            flatMemory.cvFileName ||
            flatMemory.resume_file;
          if (found) {
            const rawVal = Array.isArray(found) ? found[0] : String(found);
            if (rawVal && typeof rawVal === 'string' && rawVal.trim()) {
              resolvedFileName = rawVal.trim();
            }
          }
        }
      } catch (err) {
        console.warn('[PageScanner] Error resolving CV filename from memory:', err);
      }

      // Ensure valid extension matching accept attribute or fallback to .pdf
      const rawNode = field.node as any;
      const acceptAttr = rawNode?.getAttribute?.('accept');
      if (acceptAttr && !resolvedFileName.includes('.')) {
        const firstExt = acceptAttr.split(',')[0].trim();
        resolvedFileName += firstExt.startsWith('.') ? firstExt : `.${firstExt}`;
      } else if (!resolvedFileName.includes('.')) {
        resolvedFileName += '.pdf';
      }

      return {
        value: resolvedFileName,
        options: [resolvedFileName],
        source: 'memory',
        memoryKey: 'cv_file_name',
      };
    }

    // ── Priority 1: Existing value (skip radio/checkbox/select/autocomplete — their .value is
    //    the HTML value attribute or default option, not user input) ──────────────────────────
    const role = (field.node as any)?.getAttribute?.('role');
    const ariaAutocomplete = (field.node as any)?.getAttribute?.('aria-autocomplete');
    const isCombobox = role === 'combobox' || ariaAutocomplete !== null;
    const isChoice =
      type === 'radio' ||
      type === 'checkbox' ||
      type === 'select' ||
      type === 'autocomplete' ||
      isCombobox;
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

    // ── Security Gate & Priority for Password fields: Credential Vault only ──
    const isPassword =
      type === 'password' ||
      (field.node as any)?.type === 'password' ||
      (field.node as any)?.getAttribute?.('type') === 'password';

    if (isPassword) {
      try {
        const storage = this.sdk.adapters?.storage;
        if (storage) {
          const res = await (storage as any).get('Cognilot_credentials');
          const rawList = res?.Cognilot_credentials || res || [];
          if (Array.isArray(rawList) && rawList.length > 0) {
            const globalCtx = this.sdk.platform.getGlobalContext();
            const host = (globalCtx?.location?.hostname || '').toLowerCase().replace(/^www\./, '');
            const matchedCred = rawList.find((c: any) => {
              const d = String(c.domain || '')
                .toLowerCase()
                .replace(/^www\./, '');
              const baseD = d.split('.')[0];
              const baseH = host.split('.')[0];
              return (
                host === d ||
                host.endsWith(`.${d}`) ||
                d.endsWith(`.${host}`) ||
                (baseD.length >= 4 && baseD === baseH)
              );
            });
            if (matchedCred && matchedCred.password) {
              return {
                value: matchedCred.password,
                options: [matchedCred.password],
                source: 'credentials_vault',
              };
            }
          }
        }
      } catch (e) {
        console.warn('[PageScanner] Password resolution error:', e);
      }
      // Never allow password fields to be resolved with alias or profile cache
      return null;
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

    // ── Priority 2: Memory cache (Seed dictionary + Direct keys) ──────────
    try {
      if (this.sdk.memory) {
        const memoryResult = await this.sdk.memory.resolve(field as any);
        if (memoryResult?.success && memoryResult.suggestion?.options?.length) {
          const memOpts = memoryResult.suggestion.options.map(String);
          if (isChoice) {
            const matched = matchChoiceValue(field.options, memOpts);
            if (matched) {
              return {
                value: matched.value,
                options: [matched.value],
                source: 'memory',
                memoryKey: memoryResult.memoryKey || null,
              };
            }
          } else {
            return {
              value: memOpts[0],
              options: memOpts,
              source: 'memory',
              memoryKey: memoryResult.memoryKey || null,
            };
          }
        }
      }
    } catch (e) {
      console.warn('[PageScanner] Memory resolution error:', e);
    }

    // ── Priority 3: Option tanteo for choice fields ────────────────────────
    // When a radio/checkbox/select has predefined options, check if any
    // option text matches a stored memory value (e.g. option "Perú" matches
    // memory.country = ["Perú"]). This guesses the answer without AI.
    if (isChoice) {
      const fieldOptions = Array.isArray(field.options) ? field.options : [];
      if (fieldOptions.length > 0) {
        try {
          const storageResult = await this.sdk.adapters?.storage?.get(['Cognilot_memory_cache']);
          const rawMem = storageResult?.Cognilot_memory_cache || storageResult || {};
          const memData = rawMem.data || rawMem.data_learned || rawMem;

          // Map from memory string -> memoryKey
          const memToKey = new Map<string, string>();
          for (const [key, val] of Object.entries(memData)) {
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
              source: 'memory_cache',
              memoryKey: memToKey.get(matched.mem) || null,
            };
          }
        } catch (e) {
          console.warn('[PageScanner] Option tanteo error:', e);
        }
      }
    }

    // ── Priority 5: Persistent / Session AI Cache ──────────────────────────
    // If the field was already resolved by AI previously on this domain,
    // reuse the cached result across page reloads without making another AI call.
    try {
      const storage = this.sdk.adapters?.storage;
      if (storage) {
        const globalContext = this.sdk.platform.getGlobalContext();
        const domain = (globalContext?.location?.hostname || '').toLowerCase();
        const rawNode = field.node?.getRawNode?.() as any;
        const attrName =
          rawNode && typeof rawNode.getAttribute === 'function'
            ? rawNode.getAttribute('name')
            : null;
        const id = field.id;
        const name = field.name || attrName;
        const text = field.text || field.metadata?.label;

        if (isChoice) {
          const decisionsResult = await storage.get('Cognilot_decisions_cache');
          const cachedDecisions =
            decisionsResult?.Cognilot_decisions_cache || decisionsResult || {};
          const label = field.metadata?.label;
          const candidateKeys = [
            domain && id ? `${domain}::${id}` : null,
            domain && text ? `${domain}::${text}` : null,
            domain && label ? `${domain}::${label}` : null,
            domain && name ? `${domain}::${name}` : null,
            domain && field.selector ? `${domain}::${field.selector}` : null,
            id,
            name,
            text,
            label,
            field.selector,
          ].filter(Boolean) as string[];

          for (const k of candidateKeys) {
            const dec = cachedDecisions[k];
            if (dec && (dec.selected_values?.length || dec.value)) {
              const resVal = dec.selected_values?.[0] || dec.value || 'Selected';
              const cachedOptions = dec.allChoices || dec.options || [];
              if (cachedOptions.length > 0 && (!field.options || field.options.length === 0)) {
                field.options = cachedOptions;
              }
              return {
                value: String(resVal),
                options: dec.selected_values || [String(resVal)],
                source: 'ai',
              };
            }
          }
        } else {
          const suggestionsResult = await storage.get('Cognilot_suggestions_cache');
          const cachedSuggestions =
            suggestionsResult?.Cognilot_suggestions_cache || suggestionsResult || {};
          const candidateKeys = [
            id ? `${domain}::${id}` : null,
            name ? `${domain}::${name}` : null,
            text ? `${domain}::${text}` : null,
            id || null,
            name || null,
            text || null,
          ].filter(Boolean) as string[];

          for (const k of candidateKeys) {
            const sug = cachedSuggestions[k];
            if (sug && sug.value) {
              return {
                value: sug.value,
                options: sug.options || [sug.value],
                source: 'ai',
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('[PageScanner] AI cache resolution error:', e);
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

      const globalCtx = this.sdk.platform.getGlobalContext() as any;
      const win = globalCtx?.window || globalCtx;
      if (win && typeof win.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        win.dispatchEvent(
          new CustomEvent('cognilot-scan-complete', {
            detail: {
              formScopes,
              summary,
            },
          })
        );
      }
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

    const { fields: allFields, formScopes } = this.sdk.detection.scanAllFields();
    const newFields = allFields.filter((f) => !this.registry.findByNode(f.node.getRawNode()));

    if (newFields.length === 0) {
      console.log('[PageScanner] No new fields found.');
      return;
    }

    console.log(`[PageScanner] Found ${newFields.length} new field(s).`);
    for (const field of newFields) {
      if (!isResolvableFieldType(field.type) || field.resolvable === false) {
        field.status = 'detected';
        field.resolvable = false;
        field.resolution = null;
      } else {
        const resolution = await this._resolveFieldLocally(field);
        if (resolution) {
          field.resolution = resolution;
          field.status = 'resolved';
        }
      }
      this.registry.register(field);
    }

    // Persist updated snapshot after incremental scan (M2)
    await this._persistRegistrySnapshot();

    this._notifySidebar(formScopes);
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
