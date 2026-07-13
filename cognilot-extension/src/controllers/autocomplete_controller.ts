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

function updateUI(element: HTMLElement, suggestion: SuggestionState): void {
  if (document.activeElement !== element) return;

  if (suggestion.isHelp) {
    GhostUI.clear(element);
    HintUI.clear(element);
    HelpUI.paint(element);
    return;
  }

  GhostUI.paint(element, suggestion);

  if (!element._blockCognilotTrigger) {
    CursorUI.paint(element);
  }

  const firstOpt = (suggestion.options?.[0] || '').toLowerCase();
  const currentVal = ((element as HTMLInputElement).value || '').toLowerCase();
  const isExactMatch = currentVal === firstOpt;

  if (suggestion._isHintHidden || isExactMatch) {
    HintUI.clear(element);
  } else {
    HintUI.paint(element, suggestion);
  }

  HelpUI.clear(element);
}

function clearUI(element: HTMLElement): void {
  delete element._CognilotSuggestion;
  GhostUI.clear(element);
  HintUI.clear(element);
  HelpUI.clear(element);
  CursorUI.clear();
}

async function handleAutocomplete(element: HTMLElement): Promise<void> {
  if (element._blockCognilotTrigger) return;

  const now = Date.now();
  if (_lastProcessed.element === element && now - _lastProcessed.time < 300) return;
  _lastProcessed = { element, time: now };

  updateUI(element, { isLoading: true, options: [] });

  try {
    const suggestion = await fetchSuggestion(null, element, _isBatchRunning);

    if ((suggestion as unknown as Record<string, unknown>)?._batchStarted) {
      _isBatchRunning = true;
      setTimeout(() => {
        _isBatchRunning = false;
      }, 3000);
    }

    if (suggestion) {
      const state: SuggestionState = {
        ...suggestion,
        _allOptions: [...(suggestion.options || [])],
        _isHintHidden: true,
      } as any;
      element._CognilotSuggestion = state;
      updateUI(element, state);

      if (suggestion.options && suggestion.options.length > 0) {
        try {
          chrome.runtime
            .sendMessage({
              action: 'fieldSuggestionResolved',
              data: {
                fieldId: (element as HTMLInputElement).id,
                fieldName: (element as HTMLInputElement).name,
                value: suggestion.options[0],
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
      clearUI(element);
    }
  } catch (error) {
    updateUI(element, {
      isError: true,
      error: (error as Error).message || 'Error de red',
    });
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
  const textToLearn = inputEl.value;
  if (!textToLearn || textToLearn.trim().length === 0) return;

  const sdk = window.Cognilot?.SDK;
  if (!sdk || !sdk.suggestion || !sdk.suggestion.confirmSuggestion) return;

  updateUI(element, { isLoading: true, options: ['Learning...'] });

  try {
    const node = sdk.wrap(element);
    if (!node) return;
    await sdk.suggestion.confirmSuggestion(node, textToLearn);

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

function handleKeyboard(e: KeyboardEvent): void {
  const element = e.target as HTMLElement;
  const suggestion = element._CognilotSuggestion;

  // TOGGLE HINT UI: Ctrl + Space
  if (e.code === 'Space' && e.ctrlKey) {
    e.preventDefault();
    if (suggestion) {
      suggestion._isHintHidden = !suggestion._isHintHidden;
      updateUI(element, suggestion);
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
    if (suggestion.isLoading || suggestion.isError) {
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
        const inputEl = el as HTMLInputElement;
        if (!inputEl.value || inputEl.value.trim().length === 0) {
          handleAutocomplete(el);
        } else {
          updateUI(el, {});
        }
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
      clearUI(element);
      delete (element as HTMLInputElement)._CognilotFocusValue;
    }
  }) as EventListener;

  document.addEventListener('focus', focusHandler, true);
  document.addEventListener('keydown', keydownHandler, true);
  document.addEventListener('input', inputHandler, true);
  document.addEventListener('blur', learningHandler, true);

  _listeners.push(
    { type: 'focus', fn: focusHandler },
    { type: 'keydown', fn: keydownHandler },
    { type: 'input', fn: inputHandler },
    { type: 'blur', fn: learningHandler }
  );
}

export function dispose(): void {
  _listeners.forEach((l) => document.removeEventListener(l.type, l.fn, true));
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
