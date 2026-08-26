/**
 * CONTROLLERS/AUTOCOMPLETE_CONTROLLER.TS
 * The "Brain" of the autocomplete module.
 * Orchestrates events, data managers, and UI painters.
 */

import { CursorUI } from '../ui/autocomplete/cursor_ui';
import * as GhostUI from '../ui/autocomplete/ghost_ui';
import * as HintUI from '../ui/autocomplete/hint_ui';
import * as HelpUI from '../ui/autocomplete/help_ui';
import { fetchSuggestion } from '../services/autocomplete_service';
import { refineText } from '../services/refinement_service';
import { CredentialsService } from '../services/credentials_service';
import { readClipboardDirect } from '../utils/clipboard';

interface ListenerEntry {
  type: string;
  fn: EventListener;
}

let _listeners: ListenerEntry[] = [];
let _lastProcessed: { element: HTMLElement | null; time: number } = {
  element: null,
  time: 0,
};
let _isBatchRunning = false;

function paintSiblingGhostTexts(focusedElement: HTMLElement): void {
  const sdk = window.Cognilot?.SDK;
  if (!sdk || !sdk.registry) return;

  const entry = sdk.registry.findByNode(focusedElement);
  if (entry && entry.formScopeId) {
    const siblings = sdk.registry.getByFormScope(entry.formScopeId);
    for (const sibling of siblings) {
      const siblingEl = sibling.node?.getRawNode?.() as HTMLElement | null;
      if (siblingEl && siblingEl !== focusedElement) {
        if (sibling.resolution && sibling.resolution.value) {
          const siblingSuggestion: SuggestionState = {
            options: sibling.resolution.options || [sibling.resolution.value],
            _allOptions: sibling.resolution.options || [sibling.resolution.value],
            _activeIndex: 0,
            isLoading: false,
            isError: false,
          };
          siblingEl._CognilotSuggestion = siblingSuggestion;
          GhostUI.paint(siblingEl, siblingSuggestion);
        }
      }
    }
  }
}

function clearSiblingGhostTexts(element: HTMLElement): void {
  const sdk = window.Cognilot?.SDK;
  if (!sdk || !sdk.registry) return;

  const entry = sdk.registry.findByNode(element);
  if (entry && entry.formScopeId) {
    const siblings = sdk.registry.getByFormScope(entry.formScopeId);
    for (const sibling of siblings) {
      const siblingEl = sibling.node?.getRawNode?.() as HTMLElement | null;
      if (siblingEl && siblingEl !== element) {
        GhostUI.clear(siblingEl);
      }
    }
  }
}

function updateUI(element: HTMLElement, suggestion: SuggestionState): void {
  if (document.activeElement !== element) return;

  if (suggestion.isHelp) {
    GhostUI.clear(element);
    HintUI.clear(element);
    HelpUI.paint(element);
    return;
  }

  GhostUI.paint(element, suggestion);

  if (!suggestion.isLoading && !suggestion.isError) {
    paintSiblingGhostTexts(element);
  }

  if (!element._blockCognilotTrigger) {
    if (suggestion.isError) {
      element.style.setProperty('caret-color', 'var(--Cognilot-error)', 'important');
    } else {
      const sdk = window.Cognilot?.SDK;
      const matchedField = sdk?.facade?.matchField(element) || null;
      const isFormContext = !!matchedField;
      CursorUI.paint(element, isFormContext);
    }
  }

  const firstOpt = suggestion.options?.[0];
  const currentVal = ((element as HTMLInputElement).value || '').toLowerCase();
  const isExactMatch = firstOpt ? currentVal === firstOpt.toLowerCase() : false;

  if (suggestion._isHintHidden || isExactMatch) {
    HintUI.clear(element);
  } else {
    HintUI.paint(element, suggestion);
  }

  HelpUI.clear(element);
}

function clearUI(element: HTMLElement, keepCache = false, skipSiblings = false): void {
  if (!keepCache) {
    delete element._CognilotSuggestion;
  }
  GhostUI.clear(element);
  HintUI.clear(element);
  HelpUI.clear(element);
  CursorUI.clear();

  if (!skipSiblings) {
    clearSiblingGhostTexts(element);
  }
}

async function handleAutocomplete(element: HTMLElement): Promise<void> {
  if (element._blockCognilotTrigger) return;

  const now = Date.now();
  if (_lastProcessed.element === element && now - _lastProcessed.time < 300) return;
  _lastProcessed = { element, time: now };

  const sdk = window.Cognilot?.SDK;
  const settingsAdapter = sdk?.Core?.Registry?.getAdapter('settings');
  const settings = settingsAdapter ? await settingsAdapter.getSettings() : {};
  const showFloatingBox = settings?.copilotSuggestions?.showFloatingBox !== false;

  const loadingTimeout: any = setTimeout(() => {
    updateUI(element, { isLoading: true, options: [], _isHintHidden: !showFloatingBox });
  }, 150);

  try {
    const suggestion = await fetchSuggestion(null, element, _isBatchRunning);
    clearTimeout(loadingTimeout);

    if ((suggestion as unknown as Record<string, unknown>)?._batchStarted) {
      _isBatchRunning = true;
      setTimeout(() => {
        _isBatchRunning = false;
      }, 3000);
    }

    const domainCreds = await CredentialsService.getCredentialsForDomain();
    const savedEmails = domainCreds.map((c) => c.email);
    const isPassword = (element as HTMLInputElement).type === 'password';

    if (suggestion) {
      if ((suggestion as any).error) {
        throw new Error((suggestion as any).error);
      }

      let options = suggestion.options || [];
      if (!isPassword && savedEmails.length > 0) {
        options = Array.from(new Set([...savedEmails, ...options]));
      }

      const hasValidOption = options.length > 0 && options[0].trim().length > 0;
      const state: SuggestionState = {
        ...suggestion,
        options,
        _allOptions: isPassword
          ? suggestion.options || []
          : Array.from(new Set([...savedEmails, ...(suggestion._allOptions || options)])),
        _isHintHidden: !showFloatingBox,
        isNoMatch: !hasValidOption,
      } as any;
      element._CognilotSuggestion = state;
      updateUI(element, state);

      if (hasValidOption) {
        try {
          chrome.runtime
            .sendMessage({
              action: 'fieldSuggestionResolved',
              data: {
                fieldId: (element as HTMLInputElement).id,
                fieldName: (element as HTMLInputElement).name,
                value: options[0],
                source: suggestion.source || 'suggestion',
              },
            })
            .catch(() => {
              // silently ignore
            });
        } catch (_e) {
          // silently ignore
        }
      }
    } else {
      const options = !isPassword ? savedEmails : [];
      const emptyState: SuggestionState = {
        isNoMatch: options.length === 0,
        options,
        _allOptions: options,
        _isHintHidden: !showFloatingBox,
      };
      element._CognilotSuggestion = emptyState;
      updateUI(element, emptyState);
    }
  } catch (error) {
    clearTimeout(loadingTimeout);
    const errorState: SuggestionState = {
      isError: true,
      error: (error as Error).message || 'Error de red',
      options: [],
      _isHintHidden: !showFloatingBox,
    };
    element._CognilotSuggestion = errorState;
    updateUI(element, errorState);
  }
}

async function handleRefine(element: HTMLElement): Promise<void> {
  const inputEl = element as HTMLInputElement;
  const currentText = inputEl.value;
  if (!currentText || currentText.trim().length === 0) return;

  GhostUI.clear(element);
  updateUI(element, { isLoading: true, options: ['Committing...'] });

  try {
    const refinedResult = await refineText(element, currentText);
    const refinedText = refinedResult?.value;

    if (refinedText && inputEl.value !== refinedText) {
      inputEl.value = refinedText;
      element.dispatchEvent(new Event('input', { bubbles: true }));

      element._blockCognilotTrigger = true;
      setTimeout(() => {
        delete element._blockCognilotTrigger;
      }, 100);
    }

    if (refinedText) {
      const suggestion: SuggestionState = element._CognilotSuggestion || {
        options: [],
      };
      const filteredOptions = (suggestion.options || []).filter((opt) => opt !== refinedText);
      suggestion.options = [refinedText, ...filteredOptions];
      suggestion._activeIndex = 0;
      suggestion.field =
        ((refinedResult as Record<string, unknown>)?.field as SuggestionState['field']) ||
        suggestion.field;
      element._CognilotSuggestion = suggestion;
    }

    GhostUI.clear(element);
    HintUI.clear(element);

    if (inputEl.value && inputEl.value.trim().length > 0) {
      updateUI(element, element._CognilotSuggestion || {});
    }
  } catch (error) {
    updateUI(element, {
      isError: true,
      error: (error as Error).message || 'Error IA',
    });
  }
}

async function handleLearn(element: HTMLElement): Promise<void> {
  const inputEl = element as HTMLInputElement;

  // Search DOM/Form for password and email inputs to save credential pair
  const form = element.closest('form') || element.ownerDocument;
  const passwordInput = (
    inputEl.type === 'password' ? inputEl : form.querySelector('input[type="password"]')
  ) as HTMLInputElement | null;

  const emailInput = (
    inputEl.type !== 'password' &&
    (inputEl.type === 'email' ||
      inputEl.name?.toLowerCase().includes('user') ||
      inputEl.name?.toLowerCase().includes('email') ||
      inputEl.id?.toLowerCase().includes('email'))
      ? inputEl
      : (form.querySelector(
          'input[type="email"], input[name*="email" i], input[name*="user" i], input[id*="email" i], input[id*="user" i], input[autocomplete="username"]'
        ) as HTMLInputElement | null) ||
        (inputEl.type !== 'password'
          ? inputEl
          : (form.querySelector(
              'input:not([type="password"]):not([type="hidden"]):not([type="submit"]):not([type="button"])'
            ) as HTMLInputElement | null))
  ) as HTMLInputElement | null;

  if (passwordInput && passwordInput.value && emailInput && emailInput.value) {
    updateUI(element, { isLoading: true, options: ['Saving credentials...'] });
    try {
      await CredentialsService.saveCredential(emailInput.value, passwordInput.value);
      updateUI(element, {
        options: ['🔑 Credenciales guardadas!'],
        _isFeedback: true,
      });

      setTimeout(() => {
        if (document.activeElement === element) {
          updateUI(element, element._CognilotSuggestion || {});
        }
      }, 1500);
      return;
    } catch (_error) {
      updateUI(element, { isError: true, error: 'Failed to save credentials' });
      return;
    }
  }

  const textToLearn = inputEl.value;
  if (!textToLearn || textToLearn.trim().length === 0) return;

  const sdk = window.Cognilot?.SDK;
  if (!sdk || !sdk.suggestion || !sdk.suggestion.confirmSuggestion) return;

  updateUI(element, { isLoading: true, options: ['Learning...'] });

  try {
    const node = sdk.wrap(element);
    if (!node) return;
    await sdk.suggestion.confirmSuggestion(node, textToLearn);

    // Merge learned value into the current suggestion options
    const suggestion = element._CognilotSuggestion;
    if (suggestion) {
      if (!suggestion.options.includes(textToLearn)) {
        suggestion.options.unshift(textToLearn);
      }
      if (suggestion._allOptions && !suggestion._allOptions.includes(textToLearn)) {
        suggestion._allOptions.unshift(textToLearn);
      }
      suggestion._activeIndex = 0;
    }

    updateUI(element, {
      options: ['Saved to knowledge!'],
      _isFeedback: true,
    });

    setTimeout(() => {
      if (document.activeElement === element) {
        updateUI(element, element._CognilotSuggestion || {});
      }
    }, 1500);
  } catch (_error) {
    updateUI(element, { isError: true, error: 'Failed to save' });
  }
}

async function handleSmartPaste(element: HTMLElement): Promise<void> {
  const isTextField = ['INPUT', 'TEXTAREA'].includes(element.tagName);
  if (!isTextField) return;

  updateUI(element, { isLoading: true, options: ['Leyendo portapapeles...'] });

  try {
    const clipboardData = await readClipboardDirect();

    if (!clipboardData || clipboardData.type === 'empty') {
      updateUI(element, { isError: true, error: 'Portapapeles vacío o no accesible' });
      return;
    }

    updateUI(element, { isLoading: true, options: ['Generando sugerencia contextual...'] });

    const suggestion = await fetchSuggestion(null, element, false, { clipboard: clipboardData });
    if (suggestion) {
      if ((suggestion as any).error) {
        throw new Error((suggestion as any).error);
      }
      const options = suggestion.options || [];
      const state: SuggestionState = {
        ...suggestion,
        options,
        _allOptions: options,
        _isHintHidden: false,
      } as any;
      element._CognilotSuggestion = state;
      updateUI(element, state);
    } else {
      updateUI(element, { isNoMatch: true, options: [] });
    }
  } catch (error) {
    updateUI(element, { isError: true, error: (error as Error).message || 'Error IA' });
  }
}

function handleKeyboard(e: KeyboardEvent): void {
  const element = e.target as HTMLElement;
  const suggestion = element._CognilotSuggestion;

  // SMART PASTE (CLIPBOARD CONTEXT): Ctrl + Shift + V (or Cmd + Shift + V)
  if (
    (e.code === 'KeyV' || e.key === 'V' || e.key === 'v') &&
    (e.ctrlKey || e.metaKey) &&
    e.shiftKey
  ) {
    e.preventDefault();
    handleSmartPaste(element);
    return;
  }

  // TOGGLE HINT UI: Ctrl + Space
  if (e.code === 'Space' && e.ctrlKey) {
    e.preventDefault();
    const sdk = window.Cognilot?.SDK;
    const matchedField = sdk?.facade?.matchField(element) || null;
    const isFormContext = !!matchedField;

    if (isFormContext) {
      if (suggestion) {
        if (suggestion.isError) {
          handleAutocomplete(element);
        } else {
          suggestion._isHintHidden = !suggestion._isHintHidden;
          updateUI(element, suggestion);
        }
      } else {
        handleAutocomplete(element);
      }
    } else {
      clearUI(element);
    }
    return;
  }

  // REFINE: Ctrl + Enter
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    handleRefine(element);
    return;
  }

  // LEARN: Ctrl + Insert
  if (e.key === 'Insert' && e.ctrlKey) {
    e.preventDefault();
    handleLearn(element);
    return;
  }

  // DELETE: Ctrl + Delete
  if (e.key === 'Delete' && e.ctrlKey && suggestion?.options && suggestion.options.length > 0) {
    e.preventDefault();
    const idx = suggestion._activeIndex || 0;
    const removedOption = suggestion.options[idx];

    suggestion.options.splice(idx, 1);

    if (suggestion._allOptions) {
      const masterIdx = suggestion._allOptions.indexOf(removedOption);
      if (masterIdx !== -1) suggestion._allOptions.splice(masterIdx, 1);
    }

    if ((suggestion._activeIndex || 0) >= suggestion.options.length) {
      suggestion._activeIndex = Math.max(0, suggestion.options.length - 1);
    }
    if (suggestion.options.length === 0) {
      clearUI(element);
    } else {
      updateUI(element, suggestion);
    }
    return;
  }

  if (!suggestion) return;

  // NAVIGATE: Arrow keys
  if (
    (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
    suggestion.options &&
    suggestion.options.length > 1
  ) {
    e.preventDefault();
    const len = suggestion.options.length;
    const currentIdx = suggestion._activeIndex || 0;

    suggestion._activeIndex =
      e.key === 'ArrowUp' ? (currentIdx - 1 + len) % len : (currentIdx + 1) % len;

    updateUI(element, suggestion);
    return;
  }

  // ACCEPT: Tab
  if (e.key === 'Tab' && !e.shiftKey) {
    if (suggestion.isLoading || suggestion.isError || suggestion.isNoMatch) {
      clearUI(element);
      return;
    }

    const options = suggestion.options || [];
    if (options.length > 0) {
      e.preventDefault();
      const acceptedValue = options[suggestion._activeIndex || 0];
      const inputEl = element as HTMLInputElement;

      element._isTabCompletion = true;
      inputEl.value = acceptedValue;
      element.classList.add('Cognilot-suggested');
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      // Autocomplete corresponding password field if matching saved credential exists
      CredentialsService.getCredentialForEmail(acceptedValue).then((cred) => {
        if (cred && cred.password) {
          const form = element.closest('form') || element.ownerDocument;
          const pwdInput = form.querySelector('input[type="password"]') as HTMLInputElement | null;
          if (pwdInput) {
            pwdInput.value = cred.password;
            pwdInput.classList.add('Cognilot-suggested');
            pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
            pwdInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });

      const isInput = element.tagName && element.tagName.toLowerCase() === 'input';
      const sdk = window.Cognilot?.SDK;
      if (isInput && sdk && sdk.suggestion && sdk.suggestion.confirmSuggestion) {
        const node = sdk.wrap(element);
        if (node) {
          sdk.suggestion.confirmSuggestion(node, acceptedValue).catch(() => {
            // silently ignore
          });
        }
      }

      GhostUI.clear(element);
      HintUI.clear(element);

      _lastProcessed.time = 0;
    } else {
      clearUI(element);
    }
    return;
  }

  // ESC: Clear
  if (e.key === 'Escape') {
    e.preventDefault();
    clearUI(element);
  }
}

export function init(): void {
  if (_listeners.length > 0) dispose();

  const focusHandler = ((e: FocusEvent): void => {
    const el = e.target as HTMLElement;
    const isTextField = ['INPUT', 'TEXTAREA'].includes(el.tagName);

    if (isTextField && !el._blockCognilotTrigger) {
      const sdk = window.Cognilot?.SDK;
      const matchedField = sdk?.facade?.matchField(el) || null;
      const isFormContext = !!matchedField;

      CursorUI.paint(el, isFormContext);

      (el as HTMLInputElement)._CognilotFocusValue = (el as HTMLInputElement).value;

      if (isFormContext) {
        if (el._CognilotSuggestion) {
          updateUI(el, el._CognilotSuggestion);
        }
        handleAutocomplete(el);
      }
    }
  }) as EventListener;

  const keydownHandler = ((e: KeyboardEvent): void => handleKeyboard(e)) as EventListener;

  const inputHandler = ((e: Event): void => {
    const element = e.target as HTMLElement;
    const inputEl = element as HTMLInputElement;
    const suggestion = element._CognilotSuggestion;

    if (element._isTabCompletion) {
      delete element._isTabCompletion;
      return;
    }

    element.classList.remove('Cognilot-suggested');

    if (inputEl.value && inputEl.value.endsWith('--')) {
      updateUI(element, { isHelp: true });
      return;
    } else {
      HelpUI.clear(element);
    }

    if (inputEl.value && inputEl.value.trim().length > 0) {
      CursorUI.paint(element);

      if (suggestion && suggestion._allOptions) {
        const query = inputEl.value.toLowerCase();
        suggestion.options = suggestion._allOptions.filter((opt) =>
          opt.toLowerCase().includes(query)
        );
        suggestion._activeIndex = 0;
      }

      updateUI(element, suggestion || {});
    } else {
      CursorUI.paint(element);

      if (suggestion) {
        if (suggestion._allOptions) {
          suggestion.options = [...suggestion._allOptions];
          suggestion._activeIndex = 0;
        }
        updateUI(element, suggestion);
      } else {
        const matchedField = window.Cognilot?.SDK?.facade?.matchField(element);
        if (matchedField) {
          handleAutocomplete(element);
        }
      }
    }
  }) as EventListener;

  const learningHandler = ((e: FocusEvent): void => {
    const element = e.target as HTMLElement;

    if (e.type === 'blur') {
      const newActive = e.relatedTarget as HTMLElement | null;
      const sdk = window.Cognilot?.SDK;
      const oldEntry = sdk?.registry?.findByNode(element);
      const newEntry = newActive ? sdk?.registry?.findByNode(newActive) : null;

      const inSameForm = !!(
        oldEntry &&
        newEntry &&
        oldEntry.formScopeId &&
        oldEntry.formScopeId === newEntry.formScopeId
      );

      clearUI(element, true, inSameForm);
      delete (element as HTMLInputElement)._CognilotFocusValue;
    }
  }) as EventListener;

  document.addEventListener('focus', focusHandler, true);
  document.addEventListener('keydown', keydownHandler, true);
  document.addEventListener('input', inputHandler, true);
  document.addEventListener('blur', learningHandler, true);

  const prefetchCompleteHandler = ((e: CustomEvent): void => {
    const formScopeId = e.detail?.formScopeId;
    if (!formScopeId) return;

    const activeEl = document.activeElement as HTMLElement;
    if (activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName)) {
      const sdk = window.Cognilot?.SDK;
      const activeEntry = sdk?.registry?.findByNode(activeEl);
      if (activeEntry && activeEntry.formScopeId === formScopeId) {
        paintSiblingGhostTexts(activeEl);
      }
    }
  }) as EventListener;

  window.addEventListener('cognilot-prefetch-complete', prefetchCompleteHandler);

  _listeners.push(
    { type: 'focus', fn: focusHandler },
    { type: 'keydown', fn: keydownHandler },
    { type: 'input', fn: inputHandler },
    { type: 'blur', fn: learningHandler },
    { type: 'cognilot-prefetch-complete', fn: prefetchCompleteHandler }
  );
}

export function dispose(): void {
  _listeners.forEach((l) => {
    if (l.type === 'cognilot-prefetch-complete') {
      window.removeEventListener(l.type, l.fn);
    } else {
      document.removeEventListener(l.type, l.fn, true);
    }
  });
  _listeners = [];
  _isBatchRunning = false;
}

export const AutocompleteController = {
  init,
  dispose,
  handleAutocomplete,
  handleRefine,
  handleLearn,
};
