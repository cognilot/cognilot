// @ts-nocheck
/**
 * SIDEBAR.TS - Cognilot Sidebar Logic
 * Vertical Layout & Integrated Header Profile
 *
 * NOTE: This file uses @ts-nocheck for the initial TypeScript migration pass.
 * The 2000+ line class will be incrementally typed in a follow-up phase.
 */

import { registerGlobals as registerConfigGlobals } from './config';
import '@cognilot/sdk';
import { initHostAdapters } from './host_adapters';

// Register globals before class instantiation
registerConfigGlobals();
initHostAdapters();

class CognilotSidebar {
  constructor() {
    this.currentSettings = {};
    this.currentTab = null;
    this.formDetection = null;
    this.detectedFieldCount = 0;
    this.userPlan = 'free';
    this.autoModeActive = false;
    this.WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL || 'https://Cognilot-web.vercel.app';
    this.lastSolvedUrl = null;

    // Detection priority system
    this.currentDetection = null; // { source, questions, score, timestamp, confidence, fieldCount }
    this.detectionLocked = false; // Set to true when inspector is active
    this.solveActive = false;
    this.inspectorActive = false;
    this._resetThrottle = false;
    this.activeScope = 'all'; // Top filters (Forms, Isolated, All)
    this.activeStatus = 'all'; // Internal filters (Todo, Mem, IA)
    this.activeMode = 'all'; // Mode filters (Escritura, Opciones)
  }

  async init() {
    this.debug('Init started');
    try {
      // Register minimal adapters required for sidebar functionality
      const registry = window.Cognilot?.SDK?.Core?.Registry;
      if (registry && window.Cognilot?.HostAdapters) {
        registry.registerAdapter('storage', new window.Cognilot.HostAdapters.Storage());
        registry.registerAdapter('messaging', new window.Cognilot.HostAdapters.Messaging());
        registry.registerAdapter('settings', new window.Cognilot.HostAdapters.Settings());
        registry.registerAdapter('auth', new window.Cognilot.HostAdapters.Auth());
      }

      // Show initial loading state before tab is fetched
      const statusText = document.getElementById('status-text');
      if (statusText) statusText.textContent = 'Detecting site...';
      const infoText = document.getElementById('info-text');
      if (infoText) infoText.innerHTML = 'Analyzing page...';
      const dot = document.getElementById('agent-status-dot');
      if (dot) {
        dot.className = 'agent-dot';
        dot.classList.add('agent-dot--checking');
      }

      this.debug('Loading settings...');
      await this.loadSettings();

      this.debug('Setting up listeners...');
      this.setupEventListeners();
      this.setupTabNavigation();
      this.setupAccordion();

      this.debug('Refreshing tab...');
      // Wait a short moment to ensure tab context is stable
      setTimeout(async () => {
        await this.refreshCurrentTab();
      }, 500);

      this.debug('Init complete');

      // Listen for tab changes
      chrome.tabs.onActivated.addListener(() => {
        this.debug('Tab activated');
        this.clearContext();
        // Use retry-based sync to tolerate Universal Scan startup delay (M4)
        this.refreshCurrentTab();
      });

      // Listen for storage changes (Reactive Auth Guard)
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.Cognilot_user || changes.Cognilot_auth_token) {
          this.debug('Auth storage changed, re-checking status...');
          this.checkAuthStatus();
        }
      });
      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        // Only trigger a hard UI reset if the page finishes loading AND the core URL actually changed.
        // SPAs and Vite dev servers often fire 'complete' status updates without a real navigation.
        if (tabId === this.currentTab?.id && changeInfo.status === 'complete') {
          this.debug('Tab updated: complete');

          const oldUrl = this.currentTab?.url?.split('#')[0] || '';
          const newUrl = tab?.url?.split('#')[0] || '';

          if (oldUrl !== newUrl) {
            // M4: Clear context immediately but wait before syncing.
            // The content script needs time to run Universal Scan on the new page.
            // syncWithRegistry has retry logic to handle delayed scan completion.
            this.clearContext();
            this.currentTab = tab;
            this.updateStatus('checking', this.getDomain(), 'Loading new page...');
            // Delay first sync attempt — let Universal Scan initialise first
            setTimeout(() => this.syncWithRegistry(4, 1000), 1500);
          } else {
            // Document refreshed in place or SPA update.
            // Don't nuke the UI aggressively. Just request a background sync.
            this.currentTab = tab;
            this.syncWithRegistry();
          }
        }
      });

      // Check if we were forced to open on a specific tab
      const data = await chrome.storage.local.get(['Cognilot_force_tab']);
      if (data.Cognilot_force_tab) {
        this.switchToTab(data.Cognilot_force_tab);
        chrome.storage.local.remove(['Cognilot_force_tab']);
      }
    } catch (error) {
      console.error('Sidebar initialization error:', error);
    }
  }

  // ========================================
  // CORE & DETECTION
  // ========================================

  async refreshCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      this.currentTab = tab || null;

      if (!this.currentTab) {
        // Fallback: try querying without currentWindow
        const tabs = await chrome.tabs.query({ active: true });
        this.currentTab = tabs.length > 0 ? tabs[0] : null;
      }
    } catch (e) {
      console.warn('[Sidebar] Tab query failed:', e);
    }

    this.checkAuthStatus();

    if (this.currentTab) {
      // Don't even try if the tab is discarded or in BFCache
      if (this.currentTab.discarded) {
        this.updateStatus('not-detected', this.getDomain(), 'Tab suspended. Reload to scan.');
        return;
      }
      // M1: Use retry-based sync to handle Universal Scan startup delay
      this.syncWithRegistry();
    } else {
      this.updateStatus('not-detected', 'No active tab', 'Please navigate to a website');
    }
  }

  /**
   * Defensive messaging wrapper to handle BFCache and "Receiving end does not exist" errors.
   */
  async safeSendMessage(action, data = {}) {
    if (!this.currentTab?.id) return { success: false, error: 'No active tab' };

    return new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(this.currentTab.id, { action, data }, (response) => {
          if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError.message || '';

            // "The page keeping the extension port is moved into back/forward cache"
            // "Receiving end does not exist"
            if (msg.includes('back/forward cache') || msg.includes('Receiving end')) {
              this.debug(`Tab messaging suspended: ${msg}`);
              resolve({
                success: false,
                error: 'suspended',
                isBFCache: msg.includes('back/forward cache'),
              });
            } else {
              this.debug(`Messaging error: ${msg}`);
              resolve({ success: false, error: msg });
            }
          } else {
            resolve(response || { success: false, error: 'Empty response' });
          }
        });
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        this.debug(`SafeSendMessage crash: ${errMsg}`);
        resolve({ success: false, error: errMsg });
      }
    });
  }

  isProPlan() {
    return String(this.userPlan || 'free').toLowerCase() === 'pro';
  }

  async detectForms() {
    if (!this.currentTab) return;
    const tabUrl = this.currentTab.url || '';
    if (
      tabUrl.startsWith('chrome://') ||
      tabUrl.startsWith('chrome-extension://') ||
      tabUrl.startsWith('edge://') ||
      tabUrl.startsWith('about:')
    ) {
      this.updateStatus('error', 'Ready', 'Navigate to a web page');
      return;
    }

    // Clear stale context before re-detecting, but preserve manual inspector selections.
    // Tab-switch and page-reload clearing is handled in the onActivated/onUpdated listeners.
    const isManual = this.currentChatContext?.source === 'manual_selection';
    if (!isManual) {
      this.clearContext();
    }

    const domain = this.getDomain();
    this.updateStatus('checking', domain, 'Analyzing page...');

    try {
      const response: any = await Promise.race([
        this.safeSendMessage('sidebarDetectForms'),
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: false, error: 'timeout' }), 2500)
        ),
      ]);

      if (!response || !response.success) {
        if (response?.error === 'suspended') {
          this.updateStatus('not-detected', domain, 'Tab is inactive');
          return;
        }

        this.debug(`Detection failed: ${response?.error || 'Unknown error'}`);
        if (!this.currentChatContext) {
          this.handleDetectionResult(
            null,
            response?.error || 'Timed out',
            null,
            response?.pageTitle
          );
        }
        return;
      }

      this.debug(`Automatic detection found: ${response.detection?.found ? 'Form' : 'No Form'}`);
      this.handleDetectionResult(response.detection, null, response.language, response.pageTitle);
    } catch (error) {
      this.updateStatus('error', this.getDomain(), 'Detection service unavailable');
    }
  }

  handleDetectionResult(detection, errorMsg = null, language = null, pageTitle = null) {
    const domain = this.getDomain();
    const subtext = pageTitle || errorMsg || 'Ready to assist';

    if (!detection) {
      this.formDetection = null; // Clear stale detection
      this.detectedFieldCount = 0;
      this.updateStatus('not-detected', domain, subtext);
      if (this.currentChatContext?.type === 'form') {
        this.clearContext();
      }
      return;
    }

    // Now uses standardized DetectionPayload structure
    const questions = detection.questions || [];
    const isForm = !!(detection.isForm || detection.is_likely_form);
    const count = detection.count || 0;
    const source = detection.source || 'auto_detection';

    // Check if current context belongs to this URL/Domain
    if (this.currentChatContext && this.currentChatContext.page_context) {
      const contextUrl = this.currentChatContext.page_context.url;
      const currentUrl = this.currentTab?.url;

      if (contextUrl && currentUrl) {
        const cleanContext = contextUrl.split('#')[0].split('?')[0].replace(/\/$/, '');
        const cleanCurrent = currentUrl.split('#')[0].split('?')[0].replace(/\/$/, '');
        if (cleanContext !== cleanCurrent) {
          this.debug('Context URL mismatch, clearing preview');
          this.clearContext();
        }
      }
    }

    const isManual = this.currentChatContext?.source === 'manual_selection';

    if (isForm) {
      this.updateStatus('detected', domain, subtext);

      const isAlreadySolved = this.lastSolvedUrl === this.currentTab?.url;
      this.detectedFieldCount = count;
      this.updatePrimarySolveButtonState(true);

      if (questions.length > 0 && !isAlreadySolved) {
        // Si no hay selección manual o acabamos de abrir, mostrar el contexto automático
        if (!isManual) {
          this.setFormContext(questions, {
            source: source,
            url: this.currentTab?.url,
          });
        }
      } else if (!isManual) {
        // If we are not in manual mode, hide if nothing found or already solved
        const pre = document.getElementById('chat-context-preview');
        if (pre) pre.style.display = 'none';
        const placeholder = document.getElementById('chat-input-placeholder');
        if (placeholder) placeholder.style.display = 'block';
      }
    } else {
      this.detectedFieldCount = 0;
      this.updatePrimarySolveButtonState(false);
      this.updateStatus('not-detected', domain, subtext);
      // Protect manual selection from being cleared by "no form" detection
      if (!isManual) {
        this.clearContext();
      }
    }

    this.formDetection = detection;
  }

  async setFormContext(questions, options = {}) {
    if (!questions || !Array.isArray(questions)) return;
    const validQuestions = questions.filter((q) => q && typeof q === 'object');
    if (validQuestions.length === 0) return;

    const sdk = window.Cognilot?.SDK;
    const alias = sdk?.alias;
    const profile = sdk?.profile;

    const processedQuestions = await Promise.all(
      validQuestions.map(async (q, i) => {
        const qData = { ...q, index: i + 1, answer: null, success: false };

        // Pre-populate if field already has a value on the page
        if (q.currentValue && String(q.currentValue).trim().length > 0) {
          qData.resolution = {
            success: true,
            source: 'pre-filled',
            value: String(q.currentValue).trim(),
          };
        }

        if (alias) {
          try {
            let match = await alias.resolve(q);
            let source = 'alias_cache';

            if (!match && profile) {
              match = await profile.resolve(q);
              source = 'profile_cache';
            }

            if (match) {
              let val = match.value;
              if (
                match.suggestion &&
                match.suggestion.options &&
                match.suggestion.options.length > 0
              ) {
                val = match.suggestion.options[0];
              } else if (typeof match === 'string') {
                val = match;
              }

              if (val !== undefined) {
                qData.resolution = {
                  success: true,
                  source: source,
                  value: typeof val === 'object' ? val.value : val,
                };
              }
            }
          } catch (e) {
            console.warn('[Sidebar] Error pre-resolving local cache:', e);
          }
        }
        return qData;
      })
    );

    this.currentChatContext = {
      type: 'form',
      source: options.source || 'auto_detection',
      questions: processedQuestions,
      language: options.language || this.formDetection?.language || null,
      page_context: {
        url: options.url || this.currentTab?.url || '',
        source: options.source || 'auto_detection',
      },
    };

    this.updateContextPreview();
    this.updatePrimarySolveButtonState(true);
  }

  renderFilterButtons(formIds) {
    const container = document.getElementById('chat-context-filters');
    if (!container) return;

    // Check if we have isolated fields
    const hasIsolated = this.currentChatContext?.questions?.some((q) => !q.belongsToForm);

    let html = `
      <button class="filter-btn" 
              style="font-size: 9px; padding: 2px 6px; border-radius: 4px; border: 1px solid ${this.activeScope === 'all' ? 'var(--accent-color)' : 'var(--border-color)'}; background: ${this.activeScope === 'all' ? 'var(--accent-color)' : 'transparent'}; color: ${this.activeScope === 'all' ? 'white' : 'var(--text-secondary)'}; cursor: pointer; font-weight: 600;"
              data-filter="all">
        Todos los formularios
      </button>
    `;

    if (hasIsolated) {
      html += `
        <button class="filter-btn" 
                style="font-size: 9px; padding: 2px 6px; border-radius: 4px; border: 1px solid ${this.activeScope === 'isolated' ? 'var(--accent-color)' : 'var(--border-color)'}; background: ${this.activeScope === 'isolated' ? 'var(--accent-color)' : 'transparent'}; color: ${this.activeScope === 'isolated' ? 'white' : 'var(--text-secondary)'}; cursor: pointer; font-weight: 600;"
                data-filter="isolated">
          Aislados
        </button>
      `;
    }

    // Helper to calculate UI Priority for a form ID
    const getFormPriority = (formId: string) => {
      const fields =
        this.currentChatContext?.questions?.filter(
          (q) => String(q.formId || q.form_id) === String(formId)
        ) || [];

      let iaCount = 0;
      let memCount = 0;

      fields.forEach((f) => {
        if (f.resolution?.success) memCount++;
        else iaCount++;
      });

      const sdkScore = fields[0]?.formScore || 0;
      return sdkScore + iaCount * 50 + memCount * 10;
    };

    // Sort form IDs by combined UI Priority
    const sortedFormIds = [...formIds].sort((a, b) => {
      return getFormPriority(b) - getFormPriority(a);
    });

    sortedFormIds.forEach((id) => {
      const filterKey = `form_${id}`;
      // Calculate original index to keep "Formulario N" consistent with detection order
      const originalIndex = formIds.indexOf(id);
      const fieldWithFormName = this.currentChatContext?.questions?.find(
        (q) => String(q.formId) === String(id) || String(q.form_id) === String(id)
      );
      const formLabel = fieldWithFormName?.formName || `Formulario ${originalIndex + 1}`;

      html += `
        <button class="filter-btn" 
                style="font-size: 9px; padding: 2px 6px; border-radius: 4px; border: 1px solid ${this.activeScope === filterKey ? 'var(--accent-color)' : 'var(--border-color)'}; background: ${this.activeScope === filterKey ? 'var(--accent-color)' : 'transparent'}; color: ${this.activeScope === filterKey ? 'white' : 'var(--text-secondary)'}; cursor: pointer; font-weight: 600;"
                data-filter="${filterKey}">
          ${formLabel}
        </button>
      `;
    });

    container.innerHTML = html;

    // Re-bind listeners
    container.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.activeScope = btn.getAttribute('data-filter');
        this.renderFilterButtons(formIds);
        this.updateContextPreview();
      });
    });
  }

  renderStatusFilters() {
    const container = document.getElementById('chat-status-filters');
    if (!container) return;

    // 1. Status Cycling Button (Estado, Memoria, IA)
    const statusOptions = [
      { id: 'all', label: 'Estado' },
      { id: 'mem', label: 'Memoria' },
      { id: 'ia', label: 'IA' },
    ];
    const currentStatusOpt =
      statusOptions.find((o) => o.id === this.activeStatus) || statusOptions[0];

    // 2. Mode Cycling Button (Modo, Escritura, Opciones)
    const modeOptions = [
      { id: 'all', label: 'Modo' },
      { id: 'escritura', label: 'Escritura' },
      { id: 'opciones', label: 'Opciones' },
    ];
    const currentModeOpt = modeOptions.find((o) => o.id === this.activeMode) || modeOptions[0];

    container.innerHTML = `
      <button id="cycle-mode-btn" class="status-pill" 
              style="
                font-size: 8px; 
                padding: 2px 8px; 
                border-radius: 10px; 
                border: 1px solid ${this.activeMode !== 'all' ? 'var(--accent-color)' : 'var(--border-color)'}; 
                background: ${this.activeMode !== 'all' ? 'var(--accent-color)' : 'rgba(0,0,0,0.02)'}; 
                color: ${this.activeMode !== 'all' ? 'white' : 'var(--text-secondary)'}; 
                cursor: pointer; 
                font-weight: 700;
                text-transform: uppercase;
                transition: all 0.2s ease;
              ">
        ${currentModeOpt.label}
      </button>
      <button id="cycle-status-btn" class="status-pill" 
              style="
                font-size: 8px; 
                padding: 2px 8px; 
                border-radius: 10px; 
                border: 1px solid ${this.activeStatus !== 'all' ? 'var(--accent-color)' : 'var(--border-color)'}; 
                background: ${this.activeStatus !== 'all' ? 'var(--accent-color)' : 'rgba(0,0,0,0.02)'}; 
                color: ${this.activeStatus !== 'all' ? 'white' : 'var(--text-secondary)'}; 
                cursor: pointer; 
                font-weight: 700;
                text-transform: uppercase;
                transition: all 0.2s ease;
              ">
        ${currentStatusOpt.label}
      </button>
    `;

    // Listeners for Status Button
    document.getElementById('cycle-status-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentIndex = statusOptions.findIndex((o) => o.id === this.activeStatus);
      const nextIndex = (currentIndex + 1) % statusOptions.length;
      this.activeStatus = statusOptions[nextIndex].id;
      this.renderStatusFilters();
      this.updateContextPreview();
    });

    // Listeners for Mode Button
    document.getElementById('cycle-mode-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentIndex = modeOptions.findIndex((o) => o.id === this.activeMode);
      const nextIndex = (currentIndex + 1) % modeOptions.length;
      this.activeMode = modeOptions[nextIndex].id;
      this.renderStatusFilters();
      this.updateContextPreview();
    });
  }

  getFilteredQuestions() {
    let questions = this.currentChatContext?.questions || [];

    // 1. Apply Scope Filter (Top Level)
    if (!this.activeScope || this.activeScope === 'all') {
      questions = questions.filter((q) => q.belongsToForm);
    } else if (this.activeScope === 'isolated') {
      questions = questions.filter((q) => !q.belongsToForm);
    } else if (this.activeScope && this.activeScope.startsWith('form_')) {
      const targetFormId = this.activeScope.replace('form_', '');
      questions = questions.filter(
        (q) => String(q.formId) === targetFormId || String(q.form_id) === targetFormId
      );
    }

    // 2. Apply Status Filter (Internal Level)
    if (this.activeStatus === 'mem') {
      questions = questions.filter(
        (q) => q.resolution?.success && q.resolution.source !== 'pre-filled'
      );
    } else if (this.activeStatus === 'ia') {
      questions = questions.filter((q) => !q.resolution?.success || q.answer);
    }

    // 3. Apply Mode Filter (Internal Level)
    if (this.activeMode === 'escritura') {
      const textTypes = ['text', 'textarea', 'email', 'tel', 'url', 'number', 'search', 'password'];
      questions = questions.filter((q) => textTypes.includes(q.type || 'text'));
    } else if (this.activeMode === 'opciones') {
      const choiceTypes = ['radio', 'checkbox', 'select', 'file', 'date', 'time', 'color', 'range'];
      questions = questions.filter((q) => choiceTypes.includes(q.type));
    }

    return questions;
  }

  updateContextPreview() {
    const pre = document.getElementById('chat-context-preview');
    const text = document.getElementById('chat-context-text');
    const placeholder = document.getElementById('chat-input-placeholder');

    if (pre && text) {
      const hasQuestions =
        this.currentChatContext?.questions && this.currentChatContext.questions.length > 0;

      if (hasQuestions) {
        pre.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';

        // 1. Render internal status filters
        this.renderStatusFilters();

        const filteredQuestions = this.getFilteredQuestions();
        const themeColor = 'var(--accent-color, #0e7490)';

        if (filteredQuestions.length === 0) {
          text.innerHTML =
            '<div style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 11px; font-style: italic;">No hay campos para este filtro</div>';
        } else {
          // Helper to render a single field
          const renderField = (q, i) => {
            const type = q.type || 'text';
            const labelStr = q.text || q.label || q.question || `Field ${i + 1}`;
            const cleanLabel = labelStr.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

            const hasResolution = q.resolution?.success;

            let entryHtml = `
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; align-items: flex-start; gap: 8px;">
                            <div style="font-size: 10px; color: ${themeColor}; font-weight: 700; width: 14px; margin-top: 1px;">${i + 1}.</div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-bottom: 2px;">
                                    <span style="font-size: 11px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${cleanLabel}</span>
                                    <span style="font-size: 8px; color: var(--text-secondary); text-transform: uppercase; background: rgba(0,0,0,0.03); padding: 0 4px; border-radius: 3px; border: 1px solid var(--border-color);">${type}</span>
                                </div>
                  `;

            if (hasResolution) {
              const isPreFilled = q.resolution.source === 'pre-filled';
              if (isPreFilled) {
                entryHtml += `
                             <div style="font-size: 10px; color: var(--text-secondary); opacity: 0.7;">
                                 ${q.resolution.value}
                             </div>
                          `;
              } else {
                entryHtml += `
                             <div style="display: flex; align-items: center; gap: 4px; font-size: 10px;">
                                  <span style="font-weight: 800; color: var(--accent-color);">[MEM]</span>
                                  <span style="color: var(--text-primary); font-weight: 500;">${q.resolution.value}</span>
                              </div>
                          `;
              }
            } else if (q.answer) {
              entryHtml += `
                             <div style="display: flex; align-items: center; gap: 4px; font-size: 10px;">
                                  <span style="font-weight: 800; color: #8b5cf6;">[IA]</span>
                                  <span style="color: var(--text-primary); font-weight: 500;">${q.answer}</span>
                              </div>
                          `;
            } else {
              entryHtml += `
                             <div style="display: flex; align-items: center; gap: 4px; font-size: 10px;">
                                  <span style="font-weight: 800; color: #8b5cf6; opacity: 0.8;">[IA]</span>
                                  <span style="color: var(--text-secondary); font-style: italic; opacity: 0.5;">...</span>
                              </div>
                          `;
            }

            entryHtml += `</div></div></div>`;
            return entryHtml;
          };

          let finalHtml = '';

          if (this.activeScope === 'isolated') {
            // Render as simple list for isolated fields
            finalHtml = filteredQuestions.map((q, i) => renderField(q, i)).join('');
          } else {
            // Group by formId
            const grouped = {};
            filteredQuestions.forEach((q) => {
              const formId = q.formId || q.form_id || 'unknown';
              if (!grouped[formId]) {
                grouped[formId] = { formName: q.formName, questions: [] };
              }
              grouped[formId].questions.push(q);
            });

            // Get all unique form IDs in original order to determine correct index
            const allFormIds = [
              ...new Set(
                (this.currentChatContext?.questions || [])
                  .filter((q) => q.belongsToForm)
                  .map((q) => String(q.formId || q.form_id || 'unknown'))
              ),
            ];

            Object.entries(grouped)
              .sort((a, b) => {
                const getPriority = (data: any) => {
                  let iaCount = 0;
                  let memCount = 0;
                  data.questions.forEach((q) => {
                    if (q.resolution?.success) memCount++;
                    else iaCount++;
                  });
                  const sdkScore = data.questions[0]?.formScore || 0;
                  return sdkScore + iaCount * 50 + memCount * 10;
                };
                return getPriority(b[1]) - getPriority(a[1]);
              })
              .forEach(([formId, data]) => {
                const realIndex = allFormIds.indexOf(String(formId));
                const displayIndex = realIndex >= 0 ? realIndex + 1 : 1;
                const formLabel = data.formName || `Formulario ${displayIndex}`;

                finalHtml += `
                <div style="background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-bottom: 12px;">
                   <div style="font-size: 11px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--divider-color);">
                      ${formLabel}
                   </div>
              `;

                finalHtml += data.questions.map((q, i) => renderField(q, i)).join('');

                finalHtml += `</div>`;
              });
          }

          text.innerHTML = finalHtml;
        }
      } else {
        pre.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
      }

      // Sync button state immediately after setting the preview display style
      const isDetected = !!(
        this.formDetection &&
        (this.formDetection.found ||
          this.formDetection.isForm ||
          this.formDetection.result?.esFormulario)
      );
      this.updatePrimarySolveButtonState(isDetected);
    }
  }

  debug(msg) {
    const output = typeof msg === 'string' ? msg : JSON.stringify(msg);
    console.log(`[Sidebar] ${output}`);
    const logger = document.getElementById('debug-log');
    if (logger) {
      logger.textContent = output;
    }
  }

  updateStatus(type, primaryText, subtext = '') {
    const statusText = document.getElementById('status-text');
    const dot = document.getElementById('agent-status-dot');
    const infoText = document.getElementById('info-text');
    const domain = this.getDomain();

    // Always show domain in the primary status label
    if (statusText) {
      statusText.textContent = domain;
    }

    // subtext usually contains the page title (H1) or error details
    if (infoText) {
      if (subtext) {
        infoText.innerHTML = subtext;
      } else if (type === 'checking') {
        infoText.innerHTML = 'Analyzing page...';
      } else if (type === 'not-detected') {
        infoText.innerHTML = 'Ready to assist';
      } else if (type === 'isolated') {
        infoText.innerHTML = subtext || 'Campo aislado detectado';
      } else {
        infoText.innerHTML = primaryText || 'Cognilot ready';
      }
    }

    // Update agent dot color
    if (dot) {
      dot.className = 'agent-dot';
      if (type === 'detected') dot.classList.add('agent-dot--active');
      else if (type === 'isolated') dot.classList.add('agent-dot--isolated');
      else if (type === 'checking') dot.classList.add('agent-dot--checking');
      else if (type === 'not-detected' || type === 'error') dot.classList.add('agent-dot--error');
    }

    // Update info-text color based on theme
    if (infoText) {
      if (type === 'isolated') {
        infoText.style.color = 'var(--secondary)';
      } else {
        infoText.style.color = 'var(--accent-color)';
      }
    }

    // Keep the main solve trigger in sync with page state
    const isDetected = type === 'detected';
    this.updatePrimarySolveButtonState(isDetected);
  }

  toggleContextPreview() {
    const text = document.getElementById('chat-context-text');
    const btn = document.getElementById('chat-context-collapse-btn');
    if (!text || !btn) return;

    const isCollapsed = text.style.display === 'none';
    text.style.display = isCollapsed ? 'block' : 'none';

    // Rotate icon: 180deg when collapsed (pointing down)
    btn.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)';

    if (window.Cognilot?.Logger) {
      window.Cognilot.Logger.debug(`Context preview ${isCollapsed ? 'expanded' : 'collapsed'}`);
    }
  }

  updatePrimarySolveButtonState(isDetected) {
    const isAlreadySolved = this.lastSolvedUrl === this.currentTab?.url;
    const solveTriggerBtn = document.getElementById('chat-toggle-btn');
    const contextPreview = document.getElementById('chat-context-preview');
    const hasQuestionsContext = !!(
      this.currentChatContext &&
      this.currentChatContext.questions &&
      this.currentChatContext.questions.length > 0
    );
    const hasContextPreview = !!(
      contextPreview &&
      (contextPreview.style.display !== 'none' || hasQuestionsContext)
    );

    let hasFieldsToSolve = true;
    if (this.currentChatContext && this.currentChatContext.questions) {
      hasFieldsToSolve = this.currentChatContext.questions.some(
        (q) => q.resolution?.source !== 'pre-filled'
      );
    }

    const canSolve = !!(
      isDetected &&
      !isAlreadySolved &&
      hasContextPreview &&
      this.detectedFieldCount > 0 &&
      hasFieldsToSolve
    );

    let titleMsg = 'Solve detected fields';
    if (!isDetected || this.detectedFieldCount === 0) {
      titleMsg = 'No form detected to solve';
    } else if (isAlreadySolved) {
      titleMsg = 'Form already solved';
    } else if (!hasContextPreview) {
      titleMsg = 'No form context loaded';
    } else if (!hasFieldsToSolve) {
      titleMsg = 'No fields to solve';
    }

    if (solveTriggerBtn) {
      solveTriggerBtn.disabled = !canSolve;
      solveTriggerBtn.title = titleMsg;
      solveTriggerBtn.style.opacity = solveTriggerBtn.disabled ? '0.3' : '1';
      solveTriggerBtn.style.cursor = solveTriggerBtn.disabled ? 'not-allowed' : 'pointer';

      // Strict visibility: only show if a form was actually detected on the page
      solveTriggerBtn.style.display = isDetected ? 'flex' : 'none';

      solveTriggerBtn.style.background = canSolve ? 'var(--accent-color)' : 'rgba(0,0,0,0.15)';
      solveTriggerBtn.style.boxShadow = canSolve
        ? '0 2px 8px rgba(var(--accent-rgb, 14, 116, 144), 0.35)'
        : 'none';

      // Update pointer-events for total blocking
      solveTriggerBtn.style.pointerEvents =
        solveTriggerBtn.disabled && !isDetected ? 'none' : 'auto';
    }
  }

  getDomain() {
    if (!this.currentTab || !this.currentTab.url) return 'Detecting site...';
    try {
      const url = new URL(this.currentTab.url);
      return url.hostname.replace('www.', '');
    } catch (e) {
      return 'Detecting site...';
    }
  }

  // Update context card detail line
  updateContextDetail(text) {
    const infoText = document.getElementById('info-text');
    if (infoText) infoText.textContent = text;
  }

  // ========================================
  // SETTINGS MANAGEMENT
  // ========================================

  async loadSettings() {
    const settingsAdapter = window.Cognilot.SDK.Core.Registry.getAdapter('settings');
    const manager = window.Cognilot.SDK.Core.SettingsManager;
    const storedSettings = (await settingsAdapter.getSettings()) || {};

    // Merge stored settings with defaults from SDK
    this.currentSettings = manager
      ? manager.deepMerge(manager.DEFAULT_SETTINGS, storedSettings)
      : storedSettings;

    this.updateUIWithSettings();
    await this.checkAuthStatus();
  }

  showByokWarningBanner(provider: string) {
    const existing = document.getElementById('byok-warning-banner');
    if (existing) existing.remove();

    const byokSettings = document.getElementById('byok-settings');
    if (byokSettings) {
      const banner = document.createElement('div');
      banner.id = 'byok-warning-banner';
      banner.style.padding = '8px 12px';
      banner.style.background = 'rgba(239, 68, 68, 0.1)';
      banner.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      banner.style.borderRadius = '4px';
      banner.style.color = '#ef4444';
      banner.style.fontSize = '12px';
      banner.style.fontFamily = 'monospace';
      banner.style.lineHeight = '1.4';
      banner.innerHTML = `// WARNING: Configura tu API Key para ${provider.toUpperCase()}<br/>// o selecciona un modelo gratuito.`;

      byokSettings.insertBefore(banner, byokSettings.firstChild);
    }
  }

  updateUIWithSettings() {
    this.setToggle('copilot-enabled', this.currentSettings.copilotSuggestions?.enabled);
    this.setToggle(
      'copilot-learn-fields',
      this.currentSettings.copilotSuggestions?.learnCustomFields
    );
    this.setToggle(
      'copilot-use-profile-context',
      this.currentSettings.copilotSuggestions?.useProfileContext !== false
    );
    this.setToggle('byok-enabled', this.currentSettings.byok?.enabled);

    const provider = this.currentSettings.byok?.provider || 'openai';
    this.setSelectValue('byok-provider', provider);

    const apiKeyInput = document.getElementById('byok-api-key') as HTMLInputElement;
    if (apiKeyInput) {
      apiKeyInput.value = this.currentSettings.byok?.providers?.[provider]?.apiKey || '';
    }

    const modelInput = document.getElementById('byok-model') as HTMLInputElement;
    if (modelInput) {
      modelInput.value = this.currentSettings.byok?.providers?.[provider]?.model || '';
    }

    this.toggleByokFieldsVisibility(!!this.currentSettings.byok?.enabled);

    // AI Model selected in Home
    const modelValue = this.currentSettings.aiModels?.suggestionsProvider || 'llama-3.1-8b-instant';
    const activeOption = document.querySelector(`.model-option[data-value="${modelValue}"]`);
    if (activeOption) {
      this.updateModelSelectionUI(activeOption);
    }
  }

  updateModelSelectionUI(optionEl) {
    const triggerText = document.getElementById('current-model-display');
    const options = document.querySelectorAll('.model-option');

    // Update active class
    options.forEach((opt) => opt.classList.remove('model-option--active'));
    optionEl.classList.add('model-option--active');

    // Update display text
    if (triggerText) {
      triggerText.textContent = optionEl.dataset.label;
    }

    // Close dropdown
    const dropdown = document.getElementById('model-dropdown-list');
    if (dropdown) dropdown.classList.remove('model-dropdown--active');
  }

  setToggle(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = !!value;
  }

  setSelectValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || el.options[0]?.value;
  }

  async saveSettings() {
    // Helper to safely get checked state
    const getChecked = (id) => document.getElementById(id)?.checked || false;
    const getVal = (id) =>
      (document.getElementById(id) as HTMLInputElement | HTMLSelectElement)?.value || '';
    const activeModelEl = document.querySelector('.model-option--active');
    const getModelVal = () => activeModelEl?.dataset?.value || 'llama-3.1-8b-instant';

    const settingsAdapter = window.Cognilot.SDK.Core.Registry.getAdapter('settings');
    if (settingsAdapter) {
      await settingsAdapter.updateSetting(
        'copilotSuggestions.enabled',
        getChecked('copilot-enabled')
      );
      await settingsAdapter.updateSetting(
        'copilotSuggestions.learnCustomFields',
        getChecked('copilot-learn-fields')
      );
      await settingsAdapter.updateSetting(
        'copilotSuggestions.useProfileContext',
        getChecked('copilot-use-profile-context')
      );
      await settingsAdapter.updateSetting('byok.enabled', getChecked('byok-enabled'));

      const oldProvider = this.currentSettings.byok?.provider || 'openai';
      const newProvider = getVal('byok-provider');
      const apiKey = getVal('byok-api-key');
      const model = getVal('byok-model');

      if (oldProvider !== newProvider) {
        // Save inputs to old provider first
        await settingsAdapter.updateSetting(`byok.providers.${oldProvider}.apiKey`, apiKey);
        await settingsAdapter.updateSetting(`byok.providers.${oldProvider}.model`, model);

        // Save new provider selection
        await settingsAdapter.updateSetting('byok.provider', newProvider);

        // Fetch refreshed settings
        const newSettings = await settingsAdapter.getSettings();
        this.currentSettings = newSettings;

        // Load new provider values to UI
        const newApiKey = newSettings.byok?.providers?.[newProvider]?.apiKey || '';
        const newModel = newSettings.byok?.providers?.[newProvider]?.model || '';

        const apiKeyInput = document.getElementById('byok-api-key') as HTMLInputElement;
        if (apiKeyInput) apiKeyInput.value = newApiKey;
        const modelInput = document.getElementById('byok-model') as HTMLInputElement;
        if (modelInput) modelInput.value = newModel;

        // Legacy compatibility sync
        await settingsAdapter.updateSetting('byok.apiKey', newApiKey);
        await settingsAdapter.updateSetting('byok.model', newModel);
      } else {
        await settingsAdapter.updateSetting(`byok.providers.${newProvider}.apiKey`, apiKey);
        await settingsAdapter.updateSetting(`byok.providers.${newProvider}.model`, model);
        await settingsAdapter.updateSetting('byok.apiKey', apiKey);
        await settingsAdapter.updateSetting('byok.model', model);
      }

      await settingsAdapter.updateSetting('aiModels.suggestionsProvider', getModelVal());
      await settingsAdapter.updateSetting('aiModels.actionsProvider', getModelVal());
      this.currentSettings = await settingsAdapter.getSettings();

      // Clean warning banner if key exists
      const existingWarning = document.getElementById('byok-warning-banner');
      if (existingWarning && getVal('byok-api-key')) {
        existingWarning.remove();
      }
    }

    this.notifyContentScripts('settingsUpdated', this.currentSettings);
  }

  // ========================================
  // AUTH & PROFILE
  // ========================================

  async checkAuthStatus() {
    try {
      const registry = window.Cognilot?.SDK?.Core?.Registry;
      if (!registry) {
        this.debug('SDK Registry not available for auth check');
        return;
      }

      const authAdapter = registry.getAdapter('auth');
      if (!authAdapter) {
        this.debug('Auth adapter not registered yet');
        return;
      }

      const isAuthenticated = await authAdapter.isAuthenticated();
      const user = isAuthenticated ? await authAdapter.getUser() : null;
      this.userPlan = String(user?.plan || 'free').toLowerCase();

      const loginBtn = document.getElementById('header-login-btn');
      const userInfo = document.getElementById('header-user-info');
      const userInitial = document.getElementById('header-user-initial');
      const dropdownEmail = document.getElementById('dropdown-user-email');
      const planTypeText = document.getElementById('user-plan-type');

      if (isAuthenticated && user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';

        if (userInitial) {
          const name = user.email || 'U';
          userInitial.textContent = name.charAt(0).toUpperCase();
        }
        if (dropdownEmail) dropdownEmail.textContent = user.email;
        if (planTypeText) {
          planTypeText.textContent =
            (this.userPlan || 'free').charAt(0).toUpperCase() +
            (this.userPlan || 'free').slice(1).toLowerCase();
        }
      } else {
        if (loginBtn) loginBtn.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
      }

      this.updatePrimarySolveButtonState(
        !!(this.formDetection && (this.formDetection.isForm || this.formDetection.found))
      );

      // Update Auth Guard Overlay
      this.toggleAuthGuard(isAuthenticated);
    } catch (error) {
      this.debug(`Auth check failed: ${error.message}`);
    }
  }

  toggleAuthGuard(isAuthenticated) {
    const overlay = document.getElementById('auth-guard-overlay');
    const layout = document.querySelector('.app-layout') as HTMLElement;

    if (isAuthenticated) {
      if (overlay) {
        overlay.style.display = 'none';
      }
      if (layout) {
        layout.style.display = 'flex';
      }
    } else {
      if (overlay) {
        overlay.style.display = 'flex';
      }
      if (layout) {
        layout.style.display = 'none';
      }
    }
  }

  // ========================================
  // DETECTION PRIORITY SYSTEM
  // ========================================

  _calculateDetectionScore(detection, sourceName) {
    // Precision scores based on detection method
    const precisionMap = {
      manual_selection: 100, // Canonical user-selected source
      scoped_focus: 85, // Direct element seed
      auto_detection: 60, // Full-page heuristic
    };

    // Priority levels for tie-breaking
    const priorityMap = {
      manual_selection: 3, // Canonical user-selected source
      scoped_focus: 2, // Medium: user focused on field
      auto_detection: 1, // Low: general page detection
    };

    const precision = precisionMap[sourceName] || 50;
    const priority = priorityMap[sourceName] || 0;
    const recency = 1.0; // All new detections are fresh (timestamp calculated elsewhere)

    // Score formula: Precision (50%) + Priority (30%) + Recency (20%)
    const score = precision * 0.5 + priority * 0.3 + recency * 0.2;

    return Math.round(score);
  }

  shouldUpdateContext(newData, sourceName) {
    const isManualSource = sourceName === 'manual_selection';

    // Rule 1: Always allow manual source to override anything (it's user intent)
    if (isManualSource) return true;

    // Rule 2: If detection is locked (Inspector active), ONLY allow manual sources
    if (this.detectionLocked && !isManualSource) {
      return false;
    }

    // Rule 3: If current is manual source and new is not, DON'T replace (soft lock)
    const currentSource = this.currentDetection?.source;
    const currentIsManual = currentSource === 'manual_selection';
    if (this.currentChatContext && currentIsManual && !isManualSource) {
      return false;
    }

    // Get scores
    const newScore = this._calculateDetectionScore(newData, sourceName);
    const oldScore = this.currentDetection?.score || 0;

    // Rule 4: Always allow same source type to update (re-detection/refinement)
    if (sourceName === currentSource) return true;

    // Rule 5: Only replace DIFFERENT sources if new score is significantly better (+10%)
    return newScore > oldScore * 1.1;
  }

  lockDetectionForInspector() {
    // Called when Inspector activates - prevents Auto/Scoped from overwriting
    this.detectionLocked = true;
    this.inspectorActive = true;
    this.updateInspectButtonUI(true);
    if (window.Cognilot?.Logger) {
      window.Cognilot.Logger.info('🔒 Detection LOCKED for Inspector mode');
    }
  }

  unlockDetectionAfterInspector() {
    // Called when Inspector closes - allows Auto/Scoped to update again
    this.detectionLocked = false;
    this.inspectorActive = false;
    this.updateInspectButtonUI(false);
    if (window.Cognilot?.Logger) {
      window.Cognilot.Logger.info('🔓 Detection UNLOCKED after Inspector closed');
    }
  }

  handleScopedDetectionPreview(data, sender) {
    if (!data || !Array.isArray(data.questions) || data.questions.length === 0) return;

    if (sender?.tab?.id && this.currentTab?.id && sender.tab.id !== this.currentTab.id) return;

    const cleanDataUrl = (data.url || '').split('#')[0].split('?')[0].replace(/\/$/, '');
    const cleanCurrentUrl = (this.currentTab?.url || '')
      .split('#')[0]
      .split('?')[0]
      .replace(/\/$/, '');

    if (cleanDataUrl && cleanCurrentUrl && cleanDataUrl !== cleanCurrentUrl) return;

    const sourceName = data.source || 'scoped_focus';

    // RULE: Sidebar only handles form fields, not isolated fields
    if (data.isIsolated) return;

    // ========== PRIORITY VALIDATION ==========
    // Check if this detection should replace the current one
    if (!this.shouldUpdateContext(data, sourceName)) {
      if (window.Cognilot?.Logger) {
        window.Cognilot.Logger.debug(
          `⏭️ Detection from ${sourceName} rejected. Current: ${this.currentDetection?.source} (score: ${this.currentDetection?.score})`
        );
      }
      return;
    }

    // ========== UPDATE STATE ==========
    const score = this._calculateDetectionScore(data, sourceName);

    this.detectedFieldCount = data.count || data.questions.length || 0;
    this.formDetection = {
      found: this.detectedFieldCount > 0,
      questions: data.questions,
      result: {
        esFormulario: this.detectedFieldCount > 0,
        cantidadPreguntas: this.detectedFieldCount,
        cantidadCampos: this.detectedFieldCount,
        plataformas: ['Universal Semantic Web'],
        confianza: 'Medium',
      },
      language: data.language || this.formDetection?.language || null,
    };

    // Store detection metadata for priority system
    this.currentDetection = {
      source: sourceName,
      questions: data.questions,
      score: score,
      timestamp: Date.now(),
      confidence: 'Medium',
      fieldCount: this.detectedFieldCount,
    };

    this.setFormContext(data.questions, {
      source: sourceName,
      url: data.url,
      language: data.language,
      labelTitle: sourceName === 'manual_selection' ? 'Manual Selection' : null,
    });

    this.updateStatus('detected', this.getDomain());

    if (window.Cognilot?.Logger) {
      window.Cognilot.Logger.info(`✅ Detection accepted: ${sourceName} (score: ${score})`);
    }
  }

  toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
      const isHidden = dropdown.style.display === 'none';
      dropdown.style.display = isHidden ? 'block' : 'none';
    }
  }

  // ========================================
  // NAVIGATION & EVENTS
  // ========================================

  setupTabNavigation() {
    const tabs = document.querySelectorAll('.nav-item');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.switchToTab(tab.dataset.tab);
      });
    });
  }

  setupAccordion() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach((item) => {
      const header = item.querySelector('.accordion-header');
      header.addEventListener('click', () => {
        const isActive = item.classList.contains('accordion-item--active');

        // Close all items
        accordionItems.forEach((i) => i.classList.remove('accordion-item--active'));

        // Toggle current item if it wasn't active
        if (!isActive) {
          item.classList.add('accordion-item--active');
        }
      });
    });

    // Open first item by default
    if (accordionItems.length > 0) {
      accordionItems[0].classList.add('accordion-item--active');
    }
  }

  switchToTab(tabName) {
    const tabs = document.querySelectorAll('.nav-item');
    tabs.forEach((t) => t.classList.remove('nav-item--active'));
    document
      .querySelectorAll('.content-panel')
      .forEach((p) => p.classList.remove('content-panel--active'));

    const targetTab = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (targetTab) targetTab.classList.add('nav-item--active');

    const panel = document.getElementById(`${tabName}-panel`);
    if (panel) panel.classList.add('content-panel--active');

    // ensure main header nav is visible
    const homeNav = document.getElementById('nav-header-main');
    if (homeNav) homeNav.style.display = 'flex';

    if (tabName === 'history') {
      this.loadAndRenderFullHistory();
    }

    if (tabName === 'home') {
      this.refreshCurrentTab();
    }

    if (tabName === 'settings') {
      this.updateCacheSizeDisplay();
    }

    if (tabName === 'profile') {
      this.loadAndRenderLocalProfile();
    }
  }

  // ========================================
  // DARK MODE
  // ========================================

  initDarkMode() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (isDark) => {
      document.body.classList.toggle('dark-mode', isDark);
    };

    const updateUIState = (state) => {
      themeBtn.setAttribute('data-theme-state', state);
      const textEl = document.getElementById('theme-toggle-text');

      if (state === 'system') {
        applyTheme(mediaQuery.matches);
        themeBtn.title = 'Theme: System (Auto)';
        if (textEl) textEl.textContent = 'Tema: Sistema';
      } else if (state === 'light') {
        applyTheme(false);
        themeBtn.title = 'Theme: Light';
        if (textEl) textEl.textContent = 'Tema: Claro';
      } else if (state === 'dark') {
        applyTheme(true);
        themeBtn.title = 'Theme: Dark';
        if (textEl) textEl.textContent = 'Tema: Oscuro';
      }
    };

    // Initial load: defaults to 'system'
    const saved = localStorage.getItem('Cognilot_theme_preference') || 'system';
    updateUIState(saved);

    // Listen for system changes (only if in 'system' mode)
    mediaQuery.addEventListener('change', (e) => {
      if (themeBtn.getAttribute('data-theme-state') === 'system') {
        applyTheme(e.matches);
      }
    });

    themeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Keep dropdown open while cycling themes
      const currentState = themeBtn.getAttribute('data-theme-state');
      let nextState;

      // Cycle: system -> light -> dark -> system
      if (currentState === 'system') nextState = 'light';
      else if (currentState === 'light') nextState = 'dark';
      else nextState = 'system';

      updateUIState(nextState);
      localStorage.setItem('Cognilot_theme_preference', nextState);
    });
  }

  setupEventListeners() {
    // Dark Mode Toggle
    this.initDarkMode();

    // Helper to open or focus the Web App
    const openOrFocusWebApp = (path = '') => {
      const targetUrl = `${this.WEB_APP_URL}${path}`;
      // Search for any tab that matches our web app domain
      chrome.tabs.query({ url: `${this.WEB_APP_URL}/*` }, (tabs) => {
        if (tabs.length > 0) {
          const tab = tabs[0];
          const currentUrl = tab.url || '';

          // Focus the window and the tab
          chrome.windows.update(tab.windowId, { focused: true });
          chrome.tabs.update(tab.id!, { active: true });

          // Only update the URL if it's strictly necessary (e.g., if we are not on the app at all)
          // or if the user specifically needs to go to /auth and they aren't on a dashboard page.
          const isOnApp = currentUrl.startsWith(this.WEB_APP_URL);
          const isAuthPath = path.includes('/auth');
          const isAlreadyOnDashboard =
            currentUrl.includes('/profile') || currentUrl.includes('/welcome');

          if (!isOnApp || (isAuthPath && !isAlreadyOnDashboard && !currentUrl.includes('/auth'))) {
            chrome.tabs.update(tab.id!, { url: targetUrl }, () => {
              // Wait for navigation and then ping
              setTimeout(() => {
                this.safeSendMessage('request_auth_sync');
              }, 500);
            });
          } else {
            // Already on app, just ping after focus
            this.safeSendMessage('request_auth_sync');
          }
        } else {
          // If not found, create a new one
          chrome.tabs.create({ url: targetUrl });
        }
      });
    };

    // Header Actions
    document.getElementById('expand-btn')?.addEventListener('click', () => {
      openOrFocusWebApp();
    });

    document.getElementById('header-login-btn')?.addEventListener('click', () => {
      openOrFocusWebApp('/auth');
    });

    document.getElementById('header-user-badge')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleUserDropdown();
    });

    document.getElementById('auth-guard-login-btn')?.addEventListener('click', () => {
      openOrFocusWebApp('/auth');
    });

    document.getElementById('manage-user-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      openOrFocusWebApp('/profile');
    });

    document.addEventListener('click', () => {
      // Close dropdown if clicking outside
      const dropdown = document.getElementById('user-dropdown');
      if (dropdown) dropdown.style.display = 'none';
    });

    // Dropdown Actions
    document.getElementById('dropdown-logout-btn')?.addEventListener('click', async () => {
      const authAdapter = window.Cognilot.SDK.Core.Registry.getAdapter('auth');
      await authAdapter.logout();
      this.checkAuthStatus();
    });

    // Navigation
    document.querySelectorAll('.back-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.switchToTab('home'));
    });

    // Custom Model Selector Interactions
    const modelTrigger = document.getElementById('model-selector-trigger');
    const modelDropdown = document.getElementById('model-dropdown-list');

    if (modelTrigger) {
      modelTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        modelDropdown?.classList.toggle('model-dropdown--active');
      });
    }

    document.querySelectorAll('.model-option').forEach((option) => {
      option.addEventListener('click', async (e) => {
        e.stopPropagation();
        const val = (option as HTMLElement).dataset.value || '';
        if (val.startsWith('byok-')) {
          const provider = val.replace('byok-', '');
          const apiKey = this.currentSettings.byok?.providers?.[provider]?.apiKey || '';
          if (!apiKey) {
            // Close dropdown
            modelDropdown?.classList.remove('model-dropdown--active');

            // Revert option select in UI
            const currentVal =
              this.currentSettings.aiModels?.suggestionsProvider || 'llama-3.1-8b-instant';
            const currentOption = document.querySelector(
              `.model-option[data-value="${currentVal}"]`
            );
            if (currentOption) {
              this.updateModelSelectionUI(currentOption);
            }

            // Redirect to settings
            this.switchToTab('settings');

            // Open BYOK accordion
            const accordionItems = document.querySelectorAll('.accordion-item');
            accordionItems.forEach((i) => i.classList.remove('accordion-item--active'));
            const accByok = document.getElementById('acc-byok');
            if (accByok) accByok.classList.add('accordion-item--active');

            // Set select value
            this.setSelectValue('byok-provider', provider);

            // Update settings provider and inputs
            const settingsAdapter = window.Cognilot.SDK.Core.Registry.getAdapter('settings');
            if (settingsAdapter) {
              await settingsAdapter.updateSetting('byok.provider', provider);

              // Load the provider key/model
              const config = await settingsAdapter.getSettings();
              this.currentSettings = config;

              // Update inputs
              const apiKeyInput = document.getElementById('byok-api-key') as HTMLInputElement;
              if (apiKeyInput) apiKeyInput.value = config.byok?.providers?.[provider]?.apiKey || '';

              const modelInput = document.getElementById('byok-model') as HTMLInputElement;
              if (modelInput) modelInput.value = config.byok?.providers?.[provider]?.model || '';

              // Focus API Key input
              if (apiKeyInput) {
                apiKeyInput.focus();
              }

              // Show warning banner
              this.showByokWarningBanner(provider);
            }
            return;
          }
        }
        this.updateModelSelectionUI(option);
        await this.saveSettings();
      });
    });

    document.addEventListener('click', () => {
      modelDropdown?.classList.remove('model-dropdown--active');
    });

    // Main Actions (manual/inspect button only)
    document
      .getElementById('manual')
      ?.addEventListener('click', () => this.handleManualSelection());

    // Settings Toggles
    this.bindSettingsListeners();

    // Main solve trigger
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    if (chatToggleBtn) {
      chatToggleBtn.addEventListener('click', () => {
        if (chatToggleBtn.disabled) return;
        this.handleCognilot();
      });
    }

    // Context preview actions
    const contextCollapseBtn = document.getElementById('chat-context-collapse-btn');

    if (contextCollapseBtn) {
      contextCollapseBtn.addEventListener('click', () => {
        this.toggleContextPreview();
      });
    }

    const contextClearBtn = document.getElementById('chat-context-clear');

    if (contextClearBtn) {
      contextClearBtn.addEventListener('click', () => {
        this.clearContext();
      });
    }

    // Home model selector change
    document.getElementById('home-model-selector')?.addEventListener('change', () => {
      this.saveSettings();
    });

    // Reset detection engine
    document.getElementById('reset-engine-btn')?.addEventListener('click', () => {
      this.handleResetEngine();
    });

    // Profile Actions
    document.getElementById('clear-profile-btn')?.addEventListener('click', () => {
      this.handleClearProfile();
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'pageScanComplete') {
        // M5: Guard — only react if the scan is from our current tab
        if (sender?.tab?.id && this.currentTab?.id && sender.tab.id !== this.currentTab.id) {
          sendResponse({ received: true });
          return;
        }
        // Small stabilization delay lets the registry fully settle before we read it
        setTimeout(() => this.syncWithRegistry(2, 500), 300);
        sendResponse({ received: true });
      } else if (request.action === 'switchTab') {
        this.switchToTab(request.tab);
        sendResponse({ received: true });
      } else if (request.action === 'solveAllProgress') {
        this.handleSolveAllProgress(request);
        sendResponse({ received: true });
      } else if (request.action === 'scopedDetectionPreview') {
        this.handleScopedDetectionPreview(request.data, sender);
        sendResponse({ received: true });
      } else if (request.action === 'inspectorLockDetection') {
        this.lockDetectionForInspector();
        sendResponse({ received: true });
      } else if (request.action === 'inspectorUnlockDetection') {
        this.unlockDetectionAfterInspector();
        sendResponse({ received: true });
      } else if (request.action === 'fieldSuggestionResolved') {
        const { fieldId, fieldName, value, source } = request.data;
        if (this.currentChatContext?.questions) {
          // Find matching question by id or name
          const qIndex = this.currentChatContext.questions.findIndex(
            (q) => (q.id && q.id === fieldId) || (q.name && q.name === fieldName)
          );
          if (qIndex !== -1 && !this.currentChatContext.questions[qIndex].resolution?.success) {
            this.currentChatContext.questions[qIndex].resolution = {
              success: true,
              source: source || 'suggestion',
              value: value,
            };
            this.updateContextPreview();
          }
        }
        sendResponse({ received: true });
      } else if (request.action === 'batchPrefetchCompleted') {
        // Hydrate from registry again since the batch completed
        this.syncWithRegistry(2, 400);
        sendResponse({ received: true });
      }
    });
  }

  handleContextReceived(data) {
    console.log('Context received', data);
    this.currentChatContext = data;
    if (!this.currentChatContext.source) {
      this.currentChatContext.source = 'manual_selection';
    }
    // Ensure language is at the top level for ChipManager convenience
    if (data.page_context?.language) {
      this.currentChatContext.language = data.page_context.language;
    }
    this.updateContextPreview(
      '🔍 Context Loaded',
      data.markdown || data.element_text || 'HTML Block seleccionado'
    );

    this.lastSolvedUrl = null; // Reset solve silence on new manual context
    this.activeFilter = 'pending'; // reset filter
    this.renderFilterButtons([]); // Initial clear

    // Switch to home panel without triggering re-detection
    const activePanel = document.querySelector('.content-panel--active');
    if (!activePanel || activePanel.id !== 'home-panel') {
      // Only switch if not already on home - avoids triggering refreshCurrentTab → detectForms
      // which would overwrite the inspector context we just set
      const tabs = document.querySelectorAll('.nav-item');
      tabs.forEach((t) => t.classList.remove('nav-item--active'));
      document
        .querySelectorAll('.content-panel')
        .forEach((p) => p.classList.remove('content-panel--active'));
      const homeTab = document.querySelector('.nav-item[data-tab="home"]');
      if (homeTab) homeTab.classList.add('nav-item--active');
      const homePanel = document.getElementById('home-panel');
      if (homePanel) homePanel.classList.add('content-panel--active');
      const homeNav = document.getElementById('nav-header-main');
      if (homeNav) homeNav.style.display = 'flex';
    }
  }

  /**
   * Fetches the field registry from the active content script and renders it.
   *
   * M1: Implements exponential-backoff retry to tolerate Universal Scan startup
   * delays. The content script returns empty fields while the scan is in progress;
   * we retry up to `retries` times before giving up.
   *
   * M2: If the content script returns empty AND chrome.storage.session has a
   * fresh snapshot for this URL, the sidebar hydrates from that snapshot instantly.
   *
   * @param retries   Max number of attempts (default: 3).
   * @param delayMs   Base delay in ms between retries; multiplied by attempt index.
   */
  async syncWithRegistry(retries = 3, delayMs = 800) {
    if (!this.currentTab) return;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response: any = await this.safeSendMessage('sidebarGetRegistry');

        if (response?.error === 'suspended') return; // BFCache — silent

        if (response?.success && response.fields?.length > 0) {
          this.handleRegistryData(response.fields);
          return; // ✅ Success
        }

        // Empty registry — wait before retrying (Universal Scan may still be running)
        if (attempt < retries - 1) {
          this.debug(
            `syncWithRegistry: empty on attempt ${attempt + 1}/${retries}, retrying in ${delayMs * (attempt + 1)}ms...`
          );
          await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        }
      } catch (e) {
        console.warn('[Sidebar] syncWithRegistry attempt failed:', e);
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        }
      }
    }

    // M2: All retries exhausted — try storage.session snapshot as last resort
    try {
      const snapshot = await this._getSessionSnapshot();
      if (snapshot?.fields?.length > 0) {
        this.debug(
          `syncWithRegistry: hydrating from storage.session snapshot (${snapshot.fields.length} fields).`
        );
        this.handleRegistryData(snapshot.fields);
        return;
      }
    } catch (e) {
      // storage.session not available
    }

    // No data found anywhere
    this.updateStatus('not-detected', this.getDomain(), 'No fields detected yet');
    this.updatePrimarySolveButtonState(false);
  }

  /**
   * M2: Reads the most recent registry snapshot from chrome.storage.session.
   * Returns null if no snapshot exists or the snapshot is for a different URL.
   */
  private async _getSessionSnapshot(): Promise<any> {
    return new Promise((resolve) => {
      try {
        chrome.storage.session.get(['Cognilot_registry_snapshot'], (result) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          const snapshot = (result as any)?.Cognilot_registry_snapshot;
          if (!snapshot?.fields?.length) {
            resolve(null);
            return;
          }

          // Validate URL match
          const urlBase = (u: string) => u.split('#')[0].split('?')[0].replace(/\/$/, '');
          const snapshotUrl = snapshot.url || '';
          const currentUrl = this.currentTab?.url || '';
          const isMatch = urlBase(snapshotUrl) === urlBase(currentUrl);
          const isRecent = Date.now() - (snapshot.timestamp || 0) < 30000; // 30s

          resolve(isMatch && isRecent ? snapshot : null);
        });
      } catch (_e) {
        resolve(null);
      }
    });
  }

  handleRegistryData(fields) {
    const questions = fields.map((f) => ({
      id: f.id,
      text: f.text || f.name,
      label: f.text || f.name,
      type: f.type,
      belongsToForm: f.belongsToForm,
      formId: f.formScopeId || f.formId || f.form_id || null,
      formName: f.formName || f.form_name || null,
      formScore: f.formScore || 0,
      status: f.status,
      resolution:
        f.status === 'resolved'
          ? {
              success: true,
              source:
                f.resolution?.source === 'existing_value'
                  ? 'pre-filled'
                  : f.resolution?.source || 'ai',
              value: f.resolution?.value,
            }
          : null,
    }));

    // Retain previous answer states if any
    if (this.currentChatContext && this.currentChatContext.questions) {
      questions.forEach((q) => {
        const oldQ = this.currentChatContext.questions.find((old) => old.id === q.id);
        if (oldQ) {
          q.answer = oldQ.answer;
          q.success = oldQ.success;
        }
      });
    }

    this.currentChatContext = {
      ...(this.currentChatContext || {}),
      type: 'form',
      source: 'auto_scan',
      questions: questions,
      page_context: {
        url: this.currentTab?.url || '',
        source: 'auto_scan',
      },
    };

    // Extract unique Form IDs
    const formIds = [...new Set(fields.map((f) => f.formScopeId).filter((id) => !!id))];
    this.renderFilterButtons(formIds);

    // Call updateContextPreview first so the preview display state is set
    this.updateContextPreview();

    const hasForms = fields.some((f) => f.belongsToForm);
    const pageTitle = this.currentTab?.title || 'Ready to assist';
    if (hasForms) {
      this.formDetection = { found: true, isForm: true };
      this.updateStatus('detected', this.getDomain(), pageTitle);
      this.updatePrimarySolveButtonState(true);
    } else if (fields.length > 0) {
      this.formDetection = { found: true, isForm: false };
      this.updateStatus('detected', this.getDomain(), `${fields.length} fields found`);
      this.updatePrimarySolveButtonState(false);
    } else {
      this.updateStatus('not-detected', this.getDomain(), pageTitle);
      this.updatePrimarySolveButtonState(false);
    }
  }

  clearContext() {
    this.currentChatContext = null;
    this.currentDetection = null;
    this.formDetection = null;
    this.detectedFieldCount = 0;
    this.detectionLocked = false;

    const pre = document.getElementById('chat-context-preview');
    const text = document.getElementById('chat-context-text');
    const placeholder = document.getElementById('chat-input-placeholder');
    const dashboard = document.getElementById('detection-dashboard');

    if (pre) pre.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    if (text) {
      text.innerHTML = 'No context';
    }

    this.updatePrimarySolveButtonState(false);
  }

  appendChatMessage(text, role, id = '') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return null;
    const div = document.createElement('div');
    div.className = `chat-message ${role}-message`;
    if (id) div.id = id;

    div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    chatMessages.style.alignItems = 'flex-start';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Hide greeting message when chat starts
    const greeting = document.querySelector('.agent-greeting');
    if (greeting) greeting.style.display = 'none';

    return div;
  }

  handleSolveAllProgress(data) {
    const infoText = document.getElementById('info-text');
    // All progress updates go to the assistant message in the chat
    const assistantEl = this._assistantMsgEl || document.getElementById('solve-response');

    if (data.status === 'batch_start') {
      if (infoText) infoText.innerHTML = 'Resolviendo formulario...';
      if (assistantEl) {
        assistantEl.innerHTML = `
                <div class="status-message-chip">
                  <span>Resolviendo ${data.total} campos</span>
                  <svg class="arrow-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              `;
      }
    } else if (data.status === 'step') {
      // Update the context questions with the answer
      if (this.currentChatContext?.questions) {
        const qIndex = data.index - 1;
        if (this.currentChatContext.questions[qIndex]) {
          this.currentChatContext.questions[qIndex].answer =
            data.answer || (data.success ? 'Listo' : 'Error');
          this.currentChatContext.questions[qIndex].success = data.success;
        }
      }
      // Update assistant message — accumulate, never erase previous results
      if (assistantEl) {
        const qIndex = data.index - 1;
        const question = this.currentChatContext?.questions?.[qIndex];
        const labelStr = (
          question?.text ||
          question?.label ||
          question?.question ||
          `Campo ${data.index}`
        )
          .replace(/\n/g, ' ')
          .trim();

        const isNetworkError =
          data.error?.toLowerCase().includes('network') ||
          data.error?.toLowerCase().includes('fetch') ||
          data.error?.toLowerCase().includes('failed to fetch');
        const isNoData =
          data.error?.toLowerCase().includes('not found') ||
          data.error?.toLowerCase().includes('no match');

        const answer =
          data.answer ||
          (data.success
            ? 'Completado'
            : isNetworkError
              ? 'Servicio no disponible'
              : isNoData
                ? 'Sin datos'
                : 'No proporcionado');
        const answerStyle = data.success
          ? 'background: var(--main-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700;'
          : 'color: var(--danger-color); font-weight: 600; opacity: 0.9;';

        let current = assistantEl.innerHTML;

        // On first step or log, clear the initial loader if present
        if (current.includes('🚀')) current = '';

        const checkmark = data.success
          ? `<span style="color: var(--success-color); font-weight: 700; margin-left: 4px; font-size: 11px;">✓</span>`
          : `<span style="color: var(--danger-color); font-weight: 700; margin-left: 4px;">❌</span>`;

        // Formatting: N. Label: Answer (Mirroring context preview style)
        const fieldHtml = `
                <div style="margin-bottom: 4px; display: flex; gap: 6px; align-items: flex-start; animation: fadeIn 0.3s ease;">
                    <span style="font-size: 10px; color: var(--accent-color); font-weight: 700; min-width: 14px;">${data.index}.</span>
                    <div style="flex: 1;">
                        <span style="font-size: 12px; color: var(--text-primary); font-weight: 500;">${labelStr}:</span>
                        <span style="${answerStyle} font-size: 11px; margin-left: 4px;">${answer}</span>
                        ${checkmark}
                    </div>
                </div>
              `;

        // Only append if this index hasn't been added yet (prevent duplicates)
        if (!current.includes(`>${data.index}.</span>`)) {
          assistantEl.innerHTML = current + fieldHtml;
        } else {
          // Update existing entry if needed (for retries)
          const regex = new RegExp(
            `<div style="margin-bottom: 4px;.*?<span.*?>${data.index}.</span>.*?</div>`,
            's'
          );
          assistantEl.innerHTML = current.replace(regex, fieldHtml);
        }
      }
      // Scroll chat
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    } else if (data.status === 'log') {
      if (assistantEl) {
        let current = assistantEl.innerHTML;
        if (current.includes('🚀')) current = '';
        // Append log if it's not a duplicate of the last message
        if (!current.endsWith(data.message)) {
          assistantEl.innerHTML =
            (current ? current + '<br>' : '') +
            `<span style="opacity:0.7;font-style:italic;">${data.message}</span>`;
        }
      }
    } else if (data.status === 'error_log') {
      if (assistantEl) {
        let current = assistantEl.innerHTML;
        if (current.includes('🚀')) current = '';
        assistantEl.innerHTML =
          (current ? current + '<br>' : '') +
          `<span style="color:var(--danger-color);">❌ ${data.message}</span>`;
      }
    } else if (data.status === 'complete') {
      if (infoText) infoText.innerHTML = 'Resolución finalizada.';
      const total = (data.solved || 0) + (data.failed || 0);
      if (assistantEl) {
        let current = assistantEl.innerHTML;
        if (current.includes('🚀')) current = '';

        const celebrateIcon = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                  <path d="M4 22h16"></path>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                </svg>
              `;

        const retryBtn =
          data.failed > 0
            ? `<button id="retry-solve-btn" class="retry-inline-btn" style="padding: 2px 0; font-size: 11px; border: none; background: transparent; color: var(--accent-color); cursor: pointer; text-decoration: underline; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; transition: opacity 0.2s ease;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
              </svg>
              Volver a intentar
            </button>`
            : '';

        const errorRow =
          data.failed > 0
            ? `<div id="error-summary-row" style="display: flex; align-items: center; gap: 12px; margin-top: 10px; padding-left: 4px; animation: fadeIn 0.3s ease;">
              <span style="color:var(--danger-color); font-weight: 600; font-size: 11px;">(${data.failed} errores)</span>
              ${retryBtn}
             </div>`
            : '';

        assistantEl.innerHTML =
          current +
          `<div class="summary-badge" style="display: inline-flex;">` +
          `${celebrateIcon} <span class="label">Formulario Finalizado:</span> <span style="margin-left: 4px;">${data.solved}/${total} resueltos</span>` +
          `</div>` +
          errorRow;

        // Add event listener for retry button if it exists
        const actualRetryBtn = document.getElementById('retry-solve-btn');
        if (actualRetryBtn) {
          actualRetryBtn.onclick = (e) => {
            e.preventDefault();
            this.handleRetryFailed();
          };
        }
      }

      // Unlock if errors occurred, allowing the user to try again from the main button too
      if (data.failed > 0) {
        this.lastSolvedUrl = null;
      }

      // Re-enable send button state
      this.updatePrimarySolveButtonState(!!this.formDetection);
    }
  }

  bindSettingsListeners() {
    // Clear Cache
    document.getElementById('copilot-clear-cache')?.addEventListener('click', async (e) => {
      const btn = e.target;
      btn.textContent = 'Clearing...';
      btn.disabled = true;

      try {
        await this.executeScript(() => {
          const keysToRemove = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key === 'Cognilot_suggestions_cache' || key === 'Cognilot_decisions_cache') {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => sessionStorage.removeItem(k));
        });
      } catch (e) {}

      btn.textContent = 'Cleared!';
      setTimeout(() => {
        btn.disabled = false;
        this.updateCacheSizeDisplay();
      }, 1500);
    });

    // Auto-Save toggles
    [
      'copilot-enabled',
      'copilot-learn-fields',
      'copilot-use-profile-context',
      'byok-enabled',
    ].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', (e: any) => {
        if (id === 'byok-enabled') {
          this.toggleByokFieldsVisibility(e.target.checked);
        }
        this.saveSettings();
      });
    });

    ['byok-provider', 'byok-api-key', 'byok-model'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => {
        this.saveSettings();
      });
    });

    // BYOK connection tester
    document.getElementById('byok-test-connection')?.addEventListener('click', async () => {
      const provider = (document.getElementById('byok-provider') as HTMLSelectElement)?.value;
      const apiKey = (document.getElementById('byok-api-key') as HTMLInputElement)?.value || '';
      const customModel = (document.getElementById('byok-model') as HTMLInputElement)?.value || '';
      const statusEl = document.getElementById('byok-test-status');

      if (!apiKey) {
        if (statusEl) {
          statusEl.textContent = '[ERR] Missing API key';
          statusEl.style.color = 'var(--danger-color)';
        }
        return;
      }

      if (statusEl) {
        statusEl.textContent = 'Testing...';
        statusEl.style.color = 'var(--text-secondary)';
      }

      try {
        let success = false;
        let errorMsg = '';

        if (provider === 'openai') {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: customModel || 'gpt-4o-mini',
              messages: [{ role: 'user', content: 'Say OK' }],
              max_tokens: 5,
            }),
          });
          if (res.ok) success = true;
          else errorMsg = `${res.status} ${res.statusText}`;
        } else if (provider === 'anthropic') {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: customModel || 'claude-3-haiku-20240307',
              max_tokens: 5,
              messages: [{ role: 'user', content: 'Say OK' }],
            }),
          });
          if (res.ok) success = true;
          else errorMsg = `${res.status} ${res.statusText}`;
        } else if (provider === 'groq') {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: customModel || 'llama-3.3-70b-versatile',
              messages: [{ role: 'user', content: 'Say OK' }],
              max_tokens: 5,
            }),
          });
          if (res.ok) success = true;
          else errorMsg = `${res.status} ${res.statusText}`;
        }

        if (statusEl) {
          if (success) {
            statusEl.textContent = '[OK] Verified!';
            statusEl.style.color = 'var(--success-color)';
          } else {
            statusEl.textContent = `[ERR] ${errorMsg}`;
            statusEl.style.color = 'var(--danger-color)';
          }
        }
      } catch (err: any) {
        if (statusEl) {
          statusEl.textContent = `[ERR] ${err.message || 'Fetch failed'}`;
          statusEl.style.color = 'var(--danger-color)';
        }
      }
    });
  }

  toggleByokFieldsVisibility(visible: boolean) {
    const fieldGroups = document.querySelectorAll('.byok-field-group');
    fieldGroups.forEach((group: any) => {
      group.style.display = visible ? 'block' : 'none';
    });
  }

  // ========================================
  // HELPERS
  // ========================================

  async updateCacheSizeDisplay() {
    const btn = document.getElementById('copilot-clear-cache');
    if (!btn) return;

    try {
      const sizeBytes = await this.executeScript(() => {
        let total = 0;
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key === 'Cognilot_suggestions_cache' || key === 'Cognilot_decisions_cache') {
            total += key.length + (sessionStorage.getItem(key) || '').length;
          }
        }
        return total;
      });

      if (sizeBytes > 0) {
        const kb = (sizeBytes / 1024).toFixed(1);
        btn.textContent = `Clear Cache (${kb} KB)`;
      } else {
        btn.textContent = 'Clear Cache (0 KB)';
      }
    } catch (e) {
      btn.textContent = 'Clear Cache';
    }
  }

  async executeScript(func, args = []) {
    if (!this.currentTab || !this.currentTab.url) return;
    if (
      this.currentTab.url.startsWith('chrome://') ||
      this.currentTab.url.startsWith('chrome-extension://') ||
      this.currentTab.url.startsWith('edge://')
    ) {
      return; // Silently ignore to avoid uncatchable console errors
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: this.currentTab.id },
      func,
      args,
    });
    return results[0]?.result;
  }

  async notifyContentScripts(action, data) {
    if (this.currentTab) {
      await this.safeSendMessage(action, data);
    }
  }

  toggleCopilotSubSettings(enabled) {
    // Legacy support: if we ever need to disable all sub-settings again
    const group = document.getElementById('copilot-sub-settings');
    if (group) {
      // For now, always keep them enabled since there's no master toggle
      group.classList.remove('disabled');
      group.querySelectorAll('input, button').forEach((el) => (el.disabled = false));
    }
  }

  async handleCognilot() {
    this.solveActive = true;
    if (!this.currentTab) return;

    this.lastSolvedUrl = this.currentTab?.url;

    // 1. Capture field summary from context (RESPECTING FILTERS)
    const questions = this.getFilteredQuestions();

    if (questions.length === 0) return;

    const fieldNames = questions
      .slice(0, 5)
      .map((q) => q.text || q.label || q.question || 'campo')
      .join(', ');
    const moreCount = questions.length > 5 ? ` +${questions.length - 5} more` : '';
    const userSummary = `Solve ${questions.length} field${questions.length !== 1 ? 's' : ''}: ${fieldNames}${moreCount}`;

    // 2. Create user bubble (blue, right-aligned)
    this.appendChatMessage(userSummary, 'user');

    // 3. Hide context preview from input (it's been "sent")
    const contextPreview = document.getElementById('chat-context-preview');
    if (contextPreview) contextPreview.style.display = 'none';
    const placeholder = document.getElementById('chat-input-placeholder');
    if (placeholder) placeholder.style.display = 'block';

    // 4. Create assistant plain-text message placeholder
    this._assistantMsgEl = this.appendChatMessage(
      `
        <div class="status-message-chip">
          <span>Iniciando resolución</span>
          <svg class="arrow-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
    `,
      'assistant',
      'solve-response'
    );

    // 5. Disable send button while solving
    this.updatePrimarySolveButtonState(false);

    try {
      const response: any = await this.safeSendMessage('sidebarSolveAll', { questions: questions });

      if (!response.success) {
        if (this._assistantMsgEl) {
          this._assistantMsgEl.innerHTML = `<span style="color:var(--danger-color);">❌ Error: ${response.error || 'No se pudo iniciar'}</span>`;
        }
      }
    } finally {
      this.solveActive = false;
    }
  }

  async handleRetryFailed() {
    if (this.solveActive || !this.currentTab) return;

    const questions = this.currentChatContext?.questions || [];
    const failedQuestions = questions.filter((q) => q.success === false || !q.success);

    if (failedQuestions.length === 0) return;

    this.solveActive = true;
    this.updatePrimarySolveButtonState(false);

    // Update UI: Remove the summary badge/error row and show "Retrying" status
    if (this._assistantMsgEl) {
      // Remove summary badge and error row
      const currentHtml = this._assistantMsgEl.innerHTML;
      let newHtml = currentHtml.replace(/<div class="summary-badge".*?<\/div>/s, '');
      newHtml = newHtml.replace(
        /<div id="error-summary-row".*?<\/div>/s,
        `
        <div class="status-message-chip" style="margin-top: 8px;">
          <span>Reintentando ${failedQuestions.length} campos...</span>
          <svg class="loading-spinner" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </div>
      `
      );
      this._assistantMsgEl.innerHTML = newHtml;

      // Update the status of failed items to "Pending" visually
      failedQuestions.forEach((q) => {
        const qIndex = questions.indexOf(q) + 1;
        const regex = new RegExp(
          `<div style="margin-bottom: 4px;.*?<span.*?>${qIndex}.</span>.*?<span style="color: var\\(--danger-color\\).*?</span>.*?</div>`,
          's'
        );
        const pendingHtml = `
          <div style="margin-bottom: 4px; display: flex; gap: 6px; align-items: flex-start; opacity: 0.6;">
              <span style="font-size: 10px; color: var(--accent-color); font-weight: 700; min-width: 14px;">${qIndex}.</span>
              <div style="flex: 1;">
                  <span style="font-size: 12px; color: var(--text-primary); font-weight: 500;">${(q.text || q.label || q.question || 'Campo').replace(/\n/g, ' ').trim()}:</span>
                  <span style="font-size: 11px; margin-left: 4px; font-style: italic;">Reintentando...</span>
              </div>
          </div>
        `;
        this._assistantMsgEl.innerHTML = this._assistantMsgEl.innerHTML.replace(regex, pendingHtml);
      });
    }

    try {
      await this.safeSendMessage('sidebarSolveAll', { questions: failedQuestions });
    } finally {
      this.solveActive = false;
    }
  }

  async handleManualSelection() {
    if (!this.currentTab) return;

    const newActive = !this.inspectorActive;
    const action = newActive ? 'sidebarEnableInspector' : 'sidebarDisableInspector';
    const activeFormId =
      this.activeScope && this.activeScope.startsWith('form_')
        ? this.activeScope.replace('form_', '')
        : null;
    const data = newActive ? { activeFormId } : {};

    console.log('[Sidebar] handleManualSelection triggered', {
      inspectorActive: this.inspectorActive,
      nextAction: action,
      data,
    });
    try {
      await this.safeSendMessage(action, data);

      // Note: the state update and UI sync is actually handled via the
      // inspectorLockDetection / inspectorUnlockDetection message listeners
      // to ensure the UI matches the real state in the content script.
    } catch (e) {
      console.error(e);
    }
  }

  updateInspectButtonUI(isActive) {
    const btn = document.getElementById('manual');
    if (!btn) return;

    const span = btn.querySelector('span');
    if (isActive) {
      btn.style.background = 'var(--danger-color)';
      btn.style.color = 'white';
      btn.style.borderColor = 'var(--danger-color)';
      if (span) span.textContent = 'Close';
    } else {
      btn.style.background = 'var(--bg-sidebar)';
      btn.style.color = 'var(--text-secondary)';
      btn.style.borderColor = 'var(--border-color)';
      if (span) span.textContent = 'Inspect';
    }
  }

  cleanupQuestionText(text) {
    if (!text) return 'Unknown Question';
    return (
      text
        .replace(/Texto de una sola línea/gi, '')
        .replace(/Obligatorio/gi, '')
        .replace(/Required/gi, '')
        .replace(/\s*\*\s*$/, '') // Asterisk for required
        .replace(/:\s*$/, '') // Trailing colons
        .trim() || 'Question'
    );
  }

  async saveSessionToHistory(entries, type = 'solve_all') {
    let domain = 'Unknown Site';
    if (this.currentTab && this.currentTab.url) {
      try {
        const url = new URL(this.currentTab.url);
        domain = url.hostname.replace('www.', '');
      } catch (e) {
        console.error('Error parsing tab URL:', e);
      }
    }

    // Try to find a platform from detection result if available
    let platformName = domain;
    if (type === 'solve_all') {
      if (domain.includes('google.com')) platformName = 'Google Forms';
      else if (domain.includes('surveymonkey.com')) platformName = 'SurveyMonkey';
      else if (domain.includes('typeform.com')) platformName = 'Typeform';
    }

    const sessionId = type === 'chat' ? `chat_${domain}` : Date.now();

    const session = {
      id: sessionId,
      type: type, // 'solve_all' or 'chat'
      timestamp: new Date().toLocaleString(),
      title: platformName,
      domain: domain,
      entries: entries,
    };

    if (type === 'solve_all') {
      session.entries = entries.map((e, idx) => ({
        ...e,
        question: this.cleanupQuestionText(e.question),
        index: idx + 1,
      }));
    }

    chrome.storage.local.get(['solveHistory'], (result) => {
      let history = result.solveHistory || [];

      // If a session with same ID exists (e.g. updating same chat), replace it
      const existingIdx = history.findIndex((s) => s.id === sessionId);
      if (existingIdx !== -1) {
        history.splice(existingIdx, 1);
      }

      history.unshift(session);
      history = history.slice(0, 30);
      chrome.storage.local.set({ solveHistory: history });
    });
  }

  async loadAndRenderFullHistory() {
    const historyList = document.getElementById('full-history-list');
    if (!historyList) return;

    chrome.storage.local.get(['solveHistory'], (result) => {
      const history = result.solveHistory || [];
      if (history.length === 0) {
        historyList.innerHTML =
          '<div class="empty-history" style="text-align: center; color: var(--text-secondary); font-size: 13px; margin-top: 40px;"><p>No activity yet.</p></div>';
        return;
      }

      historyList.innerHTML = '';
      history.forEach((session) => {
        const sessionEl = this.createSessionAccordion(session);
        historyList.appendChild(sessionEl);
      });
    });
  }

  /**
   * M3: Refresh button handler — triggers a full Universal Scan cycle.
   *
   * Steps:
   *  1. Invalidate all caches (legacy discovery + SDK detection + FieldRegistry).
   *  2. Trigger sidebarTriggerRescan → content script clears registry and calls
   *     initUniversalScan(). PageScanner emits pageScanComplete when done.
   *  3. Wait 1.2s then sync with retry-backoff to pick up the new results.
   *  4. _resetThrottle is ALWAYS released in the finally block (no permanent lock).
   *
   * If the current context is a manual inspector selection, re-detect on that
   * scope first; fall back to full scan if that fails.
   */
  async handleResetEngine() {
    if (this._resetThrottle) return;
    this._resetThrottle = true;

    this.debug('Resetting engine...');
    this.updateStatus('checking', this.getDomain(), 'Re-scanning page...');

    if (!this.currentTab) {
      this._resetThrottle = false;
      return;
    }

    try {
      const isManualContext =
        this.currentDetection?.source === 'manual_selection' ||
        this.currentDetection?.source === 'manual_scan' ||
        this.currentChatContext?.source === 'manual_selection';

      if (isManualContext) {
        // Try to re-detect the manual inspector scope first
        const response: any = await new Promise((resolve) => {
          chrome.tabs.sendMessage(
            this.currentTab.id,
            { action: 'redetectOnScope', data: {} },
            (r) => resolve(r)
          );
        });

        if (!chrome.runtime.lastError && response?.success && response?.detection?.count > 0) {
          this.debug(`Re-detected on manual scope: ${response.detection?.count ?? 0} fields`);
          this.handleDetectionResult(response.detection, null, null, response.pageTitle);
          return; // Done — skip full rescan
        }
        // Fall through to full Universal Scan
        this.debug('Manual scope re-detect failed, falling back to full rescan.');
      }

      // M3: Full Universal Scan — clear everything and re-scan
      this.clearContext();
      await this.safeSendMessage('sidebarTriggerRescan');

      // Wait for Universal Scan to complete (pageScanComplete listener will also fire)
      // Using retry-based sync as safety net in case pageScanComplete was missed
      await new Promise((r) => setTimeout(r, 1200));
      await this.syncWithRegistry(3, 1000);
    } catch (e) {
      console.error('[Sidebar] handleResetEngine failed:', e);
      this.updateStatus('not-detected', this.getDomain(), 'Re-scan failed');
    } finally {
      // M3 fix: ALWAYS release throttle, even on error
      this._resetThrottle = false;
    }
  }

  createSessionAccordion(session, isOpen = false) {
    const item = document.createElement('div');
    item.className = `session-item ${isOpen ? 'session-item--open' : ''}`;

    const totalCount = session.entries ? session.entries.length : 0;
    const successCount =
      session.type === 'chat'
        ? totalCount
        : session.entries
          ? session.entries.filter((e) => e.success).length
          : 0;

    const badgeClass = session.type === 'chat' ? 'badge--chat' : 'badge--solve';
    const badgeText = session.type === 'chat' ? 'AI Chat' : 'Solve All';
    const statusText =
      session.type === 'chat' ? `${totalCount} msgs` : `${successCount}/${totalCount}`;

    item.innerHTML = `
      <div class="session-header">
        <div class="session-info">
          <span class="session-title">${session.title}</span>
          <span class="session-meta">${session.timestamp}</span>
        </div>
        <div class="session-status">
          <span class="session-badge ${badgeClass}">${badgeText}</span>
          <span style="font-size: 11px; font-weight: 600; color: ${session.type === 'chat' ? '#9b59b6' : 'var(--success-color)'};">${statusText}</span>
          <span class="acc-arrow" style="transform: ${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}"></span>
        </div>
      </div>
      <div class="session-body" style="max-height: ${isOpen ? '350px' : '0'}">
        <div class="session-details">
          ${
            session.type === 'chat'
              ? session.entries
                  .map(
                    (msg) => `
              <div class="history-item" style="border-left: 3px solid ${msg.role === 'user' ? 'var(--accent-color)' : '#9b59b6'}; padding: 8px; margin-bottom: 8px; background: var(--bg-sidebar); border-radius: 4px;">
                <div style="font-size: 9px; text-transform: uppercase; font-weight: 800; color: var(--text-secondary); margin-bottom: 4px;">${msg.role === 'user' ? 'Tú' : 'Cognilot AI'}</div>
                <div style="font-size: 11px; color: var(--text-primary); line-height: 1.4;">${msg.text}</div>
              </div>
            `
                  )
                  .join('')
              : session.entries
                  .map(
                    (entry) => `
            <div class="history-item ${entry.success ? 'history-item--success' : 'history-item--failed'}">
              <div class="history-content">
                <div class="history-q-row">
                  <span class="history-q-num">#${entry.index}</span>
                  <span class="history-q-type">${entry.type || 'TEXT'}</span>
                  <span class="history-q-text" title="${entry.question}">${entry.question}</span>
                </div>
                <div class="history-answer-value">${entry.success ? entry.answer : 'No proporcionado'}</div>
              </div>
            </div>
          `
                  )
                  .join('')
          }
        </div>
      </div>
    `;

    item.querySelector('.session-header').addEventListener('click', () => {
      const currentlyOpen = item.classList.contains('session-item--open');

      // Close all in the SAME list
      item.parentElement.querySelectorAll('.session-item').forEach((el) => {
        el.classList.remove('session-item--open');
        el.querySelector('.session-body').style.maxHeight = '0';
        el.querySelector('.acc-arrow').style.transform = 'rotate(0deg)';
      });

      if (!currentlyOpen) {
        item.classList.add('session-item--open');
        item.querySelector('.session-body').style.maxHeight = '350px';
        item.querySelector('.acc-arrow').style.transform = 'rotate(180deg)';
      }
    });

    return item;
  }

  // ========================================
  // LOCAL PROFILE MANAGEMENT (Phase 4)
  // ========================================

  async loadAndRenderLocalProfile() {
    const list = document.getElementById('profile-data-list');
    const stats = document.getElementById('profile-stats');
    if (!list) return;

    try {
      const data = await chrome.storage.local.get(['Cognilot_profile_cache']);
      let profile = data.Cognilot_profile_cache || {};

      // Fallback for nested legacy structure
      if (
        profile.data_learned &&
        typeof profile.data_learned === 'object' &&
        !Array.isArray(profile.data_learned)
      ) {
        // If it has 'data_learned' key and it's an object, it's likely the legacy ProfileResponse structure
        profile = profile.data_learned;
      }

      const keys = Object.keys(profile).filter(
        (k) => k !== 'id' && k !== 'user_id' && k !== 'preferences'
      );
      if (stats) stats.textContent = `${keys.length} items saved`;

      if (keys.length === 0) {
        list.innerHTML = `
          <div class="empty-state" style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
            <p>No data learned yet. Start filling forms and Cognilot will remember your info!</p>
          </div>
        `;
        return;
      }

      // Sort keys alphabetically
      keys.sort();

      list.innerHTML = keys
        .map((key) => {
          const values = Array.isArray(profile[key]) ? profile[key] : [profile[key]];
          return `
          <div class="profile-item" data-key="${key}">
            <div class="profile-item-header">
              <span class="profile-key">${key.replace(/_/g, ' ')}</span>
              <button class="profile-delete-item" data-key="${key}" title="Delete this entry">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            </div>
            <div class="profile-values">
              ${values.map((val) => `<div class="profile-value">${this.escapeHtml(val)}</div>`).join('')}
            </div>
          </div>
        `;
        })
        .join('');

      // Add event listeners for delete buttons
      list.querySelectorAll('.profile-delete-item').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const key = btn.getAttribute('data-key');
          this.handleDeleteItem(key);
        });
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      list.innerHTML = `<div style="color: var(--danger-color); padding: 20px;">Error loading profile data.</div>`;
    }
  }

  async handleClearProfile() {
    const confirmed = confirm(
      'Are you sure you want to clear your entire local profile? This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await chrome.storage.local.remove([
        'Cognilot_profile_cache',
        'Cognilot_alias_cache',
        'Cognilot_sync_queue',
        'Cognilot_preference_cache',
      ]);
      this.loadAndRenderLocalProfile();
      // Also notify SDK to clear internal caches if needed
      this.debug('Local profile cleared');
    } catch (error) {
      console.error('Error clearing profile:', error);
    }
  }

  async handleDeleteItem(key) {
    try {
      const data = await chrome.storage.local.get(['Cognilot_profile_cache']);
      const profile = data.Cognilot_profile_cache || {};

      if (profile[key]) {
        delete profile[key];
        await chrome.storage.local.set({ Cognilot_profile_cache: profile });
        this.loadAndRenderLocalProfile();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

function startSidebar() {
  if (window.sidebarInstance) return;
  window.sidebarInstance = new CognilotSidebar();
  window.sidebarInstance.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startSidebar);
} else {
  startSidebar();
}
