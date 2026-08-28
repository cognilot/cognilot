/**
 * UI/INSPECTOR/MAIN_UI.TS
 * Visual orchestrator for the Inspector — composes backdrop, painter, and toolbar.
 */

import {
  createSpotlightBackdrop,
  updateSpotlight,
  removeSpotlightBackdrop,
  setSelectedContainerRef as setBackdropRef,
  getSpotlightBackdrop,
} from './backdrop_ui';
import {
  highlight,
  removeHighlight,
  findLabelElement,
  getLastHighlighted,
  setLastHighlighted,
  setSelectedContainerRef as setPainterRef,
} from './painter_ui';
import {
  showToolbar,
  hideToolbar,
  setButtonsDisabled,
  setManualSelectMode,
  updateActionButtons,
  type ToolbarHandlers,
} from './toolbar_ui';
import { CursorUI } from '../autocomplete/cursor_ui';
import { GhostUI } from '../autocomplete/ghost_ui';
import { FormTriggerUI } from './form_trigger_ui';
import { DetectionPayload } from '../../lib/detection_payload';

let _selectedContainer: HTMLElement | null = null;
const _currentMode = 'form_scope';
let _currentBatch: Array<Record<string, unknown>> = [];

// Wire up the container ref for sub-modules
function getSelectedContainer(): HTMLElement | null {
  return _selectedContainer;
}

setBackdropRef(getSelectedContainer);
setPainterRef(getSelectedContainer);

export function setCursor(active: boolean): void {
  document.body.style.cursor = active ? 'crosshair' : '';
}

export function showToast(message: string, type = 'success'): void {
  const toast = (window.Cognilot as Record<string, unknown>)?.Toast as
    | { show(msg: string, type: string): void }
    | undefined;
  if (toast) {
    toast.show(message, type);
  } else {
    console.warn('[InspectorUI] Toast utility not found:', message);
  }
}

export function processDetection(
  detectionResult: DetectionPayload | SDKDetectionResult | null,
  silent = false,
  triggerPrefetch = false,
  forceUseSelector = false
): void {
  if (
    !detectionResult ||
    !('questions' in detectionResult) ||
    !detectionResult.questions ||
    detectionResult.questions.length === 0
  ) {
    _currentBatch = [];
    return;
  }

  _currentBatch = (detectionResult.questions as any[]).map((q: any, idx: number) => ({
    ...q,
    id: (q.id as string) || `q_${idx}`,
  }));

  const engine = window.Cognilot?.SDK?.Engines?.ActionEngine;
  if (triggerPrefetch && engine && typeof (engine as any).prefetchBatchActions === 'function') {
    if (!(engine as any)._prefetchStarted) {
      (engine as any).prefetchBatchActions(window.Cognilot?.SDK?.Core?.Registry, _currentBatch);
    }
  }

  if (silent) return;

  const containerSelector =
    (detectionResult as any).formSelector || (detectionResult as any).form_selector;
  if (containerSelector && (!_selectedContainer || forceUseSelector)) {
    try {
      const containerEl = document.querySelector(containerSelector as string);
      if (containerEl && containerEl !== _selectedContainer) {
        setSelectedContainer(containerEl as HTMLElement);
      }
    } catch (_e) {
      // silently ignore
    }
  }

  const showBorders = true;
  if (showBorders) {
    console.log(`[InspectorUI] Painting ${_currentBatch.length} fields...`);
    _currentBatch.forEach((q) => {
      try {
        if (q.belongsToForm === false) return;

        if (q.selector) {
          const el = document.querySelector(q.selector as string);
          if (el) {
            const resolution = q.resolution;
            const status = q.status;

            const type = (q.type || '').toLowerCase();
            const NON_RESOLVABLE = new Set([
              'autocomplete',
              'file',
              'search',
              'range',
              'color',
              'date',
              'datetime-local',
              'month',
              'week',
              'time',
              'iframe-input',
            ]);
            const isNonResolvable =
              NON_RESOLVABLE.has(type) ||
              q.status === 'detected' ||
              q.status === 'unsupported' ||
              q.resolvable === false;
            const isChoice = type === 'radio' || type === 'checkbox' || type === 'select';

            if (isNonResolvable) {
              // Detection-only field: standard neutral detected style, no AI pending violet outline
              el.classList.add('Cognilot-detected-field');
            } else if (!isChoice) {
              if (resolution?.source === 'existing_value') {
                // Pre-filled: subtle grey outline
                el.classList.add('Cognilot-field-prefilled');
              } else if (status === 'resolved' && resolution?.value) {
                // Resolved locally: no outline, just gradient ghost text
                const suggestionState = {
                  options: [resolution.value],
                  _activeIndex: 0,
                  isLoading: false,
                  isError: false,
                };
                el.classList.add('Cognilot-field-resolved');
                GhostUI.paint(el as HTMLElement, suggestionState);
              } else {
                // Pending/Needing AI/Guide: violet outline
                el.classList.add('Cognilot-field-pending');
              }
            } else if (status === 'resolved' && resolution?.value) {
              GhostUI.paintChoiceGhost(el as HTMLElement, resolution.options || [resolution.value]);
            }

            const labelEl = findLabelElement(el as HTMLElement, q.text as string);
            if (labelEl) labelEl.classList.add('Cognilot-detected-label');
          } else {
            console.warn('[InspectorUI] Field not found for selector:', q.selector);
          }
        } else {
          console.warn('[InspectorUI] Field has no selector:', q);
        }
      } catch (e) {
        console.error('[InspectorUI] Error painting field:', e);
      }
    });

    const focused = document.activeElement as HTMLElement;
    if (
      focused &&
      (focused.classList.contains('Cognilot-field-pending') ||
        focused.classList.contains('Cognilot-field-prefilled') ||
        focused.classList.contains('Cognilot-field-resolved') ||
        focused.classList.contains('Cognilot-detected-field'))
    ) {
      CursorUI.paint(focused);
    }

    if (_selectedContainer && _currentBatch.length > 0) {
      FormTriggerUI.showFormTrigger(_selectedContainer, _currentBatch.length, () => {
        const api = (window as unknown as { CognilotAPI?: { solveAll(): unknown } }).CognilotAPI;
        if (api?.solveAll) {
          api.solveAll();
        }
      });
    }
  }
}

export function getCurrentBatch(): Array<Record<string, unknown>> {
  return _currentBatch || [];
}

/**
 * Second-pass painter: reads the SDK field registry (which has actual
 * resolution data from alias/profile) and applies the correct visual state
 * to every page element inside `container`:
 *
 * - Text inputs with a memory resolution → `Cognilot-field-resolved` class
 *   + GhostUI ghost-text overlay (cyan-to-violet gradient).
 * - Radio/checkbox options matching the resolved value → `Cognilot-radio-mem`
 *   on their wrapper (cyan gradient border + glow).
 * - Labels of resolved fields → `Cognilot-detected-label` (cyan).
 * - Labels of pending fields → `Cognilot-detected-label` + `Cognilot-label-ai`
 *   (violet override).
 *
 * Must be called AFTER processDetection so the initial pending/pre-filled
 * states are already set and we only need to upgrade the resolved ones.
 */
export function paintResolvedFieldsFromRegistry(container: HTMLElement | null): void {
  const registry = (window.Cognilot as any)?.SDK?.registry;
  if (!registry || typeof registry.getAll !== 'function') return;

  const allFields: SDKFieldRegistryEntry[] = registry.getAll();
  if (!allFields.length) return;

  allFields.forEach((field) => {
    if (!field.selector) return;

    let el: HTMLElement | null = null;
    try {
      el = document.querySelector(field.selector);
    } catch (_e) {
      return;
    }
    if (!el) return;
    if (container && !container.contains(el)) return;

    const resolution = field.resolution;
    const isPreFilled = resolution?.source === 'existing_value';
    const isResolved = field.status === 'resolved' && !!resolution?.value && !isPreFilled;

    const NON_RESOLVABLE = new Set([
      'autocomplete',
      'file',
      'search',
      'range',
      'color',
      'date',
      'datetime-local',
      'month',
      'week',
      'time',
      'iframe-input',
    ]);
    const isNonResolvable =
      NON_RESOLVABLE.has(type) ||
      field.status === 'detected' ||
      field.status === 'unsupported' ||
      field.resolvable === false;

    // ── Paint the label with the correct semantic color ───────────────
    const labelEl = findLabelElement(el, field.text);
    if (labelEl) {
      labelEl.classList.add('Cognilot-detected-label'); // cyan baseline
      if (isResolved || isNonResolvable) {
        labelEl.classList.remove('Cognilot-label-ai');
      } else if (!isPreFilled) {
        // Pending field — needs AI → violet
        labelEl.classList.add('Cognilot-label-ai');
      }
    }

    if (!isResolved) return;

    const type = (field.type || '').toLowerCase();
    const isChoice = type === 'radio' || type === 'checkbox' || type === 'select';

    // Remove pending class — this field has a memory resolution
    el.classList.remove('Cognilot-field-pending');

    if (isChoice) {
      // Collect resolved values to match against option inputs
      const resolvedVals =
        Array.isArray(resolution!.options) && resolution!.options.length > 0
          ? resolution!.options.map(String)
          : [String(resolution!.value)];

      GhostUI.paintChoiceGhost(el, resolvedVals);
    } else {
      // Text-like input: subtle cyan border + ghost-text gradient overlay
      el.classList.add('Cognilot-field-resolved');
      const suggestionState: SuggestionState = {
        options: [String(resolution!.value)],
        _activeIndex: 0,
        isLoading: false,
        isError: false,
        type: 'memory',
      };
      GhostUI.paint(el, suggestionState);
    }
  });
}

export function setSelectedContainer(el: HTMLElement | null): void {
  if (_selectedContainer && _selectedContainer !== el) {
    restoreSelectedContainer(_selectedContainer);
  }

  _selectedContainer = el || null;
  if (!el) {
    removeSpotlightBackdrop();
    FormTriggerUI.removeFormTrigger();
    return;
  }

  if (el._CognilotOriginalBoxShadow !== undefined) {
    el.style.boxShadow = el._CognilotOriginalBoxShadow;
    el.style.outline = el._CognilotOriginalOutline!;
    el.style.backgroundColor = el._CognilotOriginalBackgroundColor!;
    delete el._CognilotOriginalBoxShadow;
    delete el._CognilotOriginalOutline;
    delete el._CognilotOriginalBackgroundColor;
  }
  el.classList.remove('aiden-highlight');

  el._CognilotSelectedOutline = el.style.outline;
  el._CognilotSelectedBoxShadow = el.style.boxShadow;
  el._CognilotSelectedBackground = el.style.backgroundColor;
  el._CognilotSelectedZIndex = el.style.zIndex;
  el._CognilotSelectedPosition = el.style.position;

  el.style.outline = '2px dashed #0ea5e9';
  el.style.boxShadow = '0 0 0 4px rgba(14, 165, 233, 0.20)';
  el.style.backgroundColor = 'rgba(14, 165, 233, 0.06)';

  const currentPos = window.getComputedStyle(el).position;
  if (currentPos === 'static') el.style.position = 'relative';
  el.style.zIndex = '2147483641';

  setLastHighlighted(el);
  createSpotlightBackdrop();
  updateSpotlight();
  requestAnimationFrame(() => {
    const backdrop = getSpotlightBackdrop();
    if (backdrop) backdrop.style.opacity = '1';
  });

  if (_currentBatch.length > 0) {
    FormTriggerUI.showFormTrigger(el, _currentBatch.length, () => {
      const api = (window as unknown as { CognilotAPI?: { solveAll(): unknown } }).CognilotAPI;
      if (api?.solveAll) {
        api.solveAll();
      }
    });
  }
}

function restoreSelectedContainer(el: HTMLElement): void {
  if (!el) return;
  if (el._CognilotSelectedOutline !== undefined) {
    el.style.outline = el._CognilotSelectedOutline;
    el.style.boxShadow = el._CognilotSelectedBoxShadow!;
    el.style.backgroundColor = el._CognilotSelectedBackground!;
    el.style.zIndex = el._CognilotSelectedZIndex!;
    el.style.position = el._CognilotSelectedPosition!;
    delete el._CognilotSelectedOutline;
    delete el._CognilotSelectedBoxShadow;
    delete el._CognilotSelectedBackground;
    delete el._CognilotSelectedZIndex;
    delete el._CognilotSelectedPosition;
  }
}

export function clear(): void {
  setCursor(false);
  const selected = _selectedContainer;

  document.querySelectorAll('.aiden-highlight').forEach((node) => {
    if (node !== selected) removeHighlight(node as HTMLElement);
  });

  document
    .querySelectorAll('.Cognilot-detected-field')
    .forEach((node) => node.classList.remove('Cognilot-detected-field'));
  document.querySelectorAll('.Cognilot-detected-label').forEach((node) => {
    node.classList.remove('Cognilot-detected-label');
    node.classList.remove('Cognilot-label-ai');
  });
  document
    .querySelectorAll('.Cognilot-field-pending')
    .forEach((node) => node.classList.remove('Cognilot-field-pending'));
  document
    .querySelectorAll('.Cognilot-field-prefilled')
    .forEach((node) => node.classList.remove('Cognilot-field-prefilled'));
  document.querySelectorAll('.Cognilot-field-resolved').forEach((node) => {
    node.classList.remove('Cognilot-field-resolved');
    GhostUI.clear(node as HTMLElement);
  });
  document
    .querySelectorAll('.Cognilot-radio-mem')
    .forEach((node) => node.classList.remove('Cognilot-radio-mem'));
  document
    .querySelectorAll('.Cognilot-radio-label-mem')
    .forEach((node) => node.classList.remove('Cognilot-radio-label-mem'));
  document
    .querySelectorAll('.Cognilot-ghost-choice-highlight')
    .forEach((node) => node.classList.remove('Cognilot-ghost-choice-highlight'));
  document
    .querySelectorAll('.Cognilot-ghost-choice-label-highlight')
    .forEach((node) => node.classList.remove('Cognilot-ghost-choice-label-highlight'));
  document
    .querySelectorAll('.Cognilot-ghost-active')
    .forEach((node) => GhostUI.clear(node as HTMLElement));

  const lastHighlighted = getLastHighlighted();
  if (lastHighlighted && lastHighlighted !== selected) removeHighlight(lastHighlighted);

  if (selected) {
    selected.classList.remove('aiden-highlight');
    restoreSelectedContainer(selected);
  }

  _selectedContainer = null;
  setLastHighlighted(null);
  removeSpotlightBackdrop();
  hideToolbar();
  FormTriggerUI.removeFormTrigger();
}

// Re-export sub-module functions for unified access
export {
  highlight,
  removeHighlight,
  showToolbar,
  hideToolbar,
  setButtonsDisabled,
  setManualSelectMode,
  updateActionButtons,
  updateSpotlight,
};

export type { ToolbarHandlers };

export const InspectorUI = {
  setCursor,
  showToast,
  processDetection,
  paintResolvedFieldsFromRegistry,
  getCurrentBatch,
  setSelectedContainer,
  clear,
  highlight,
  removeHighlight,
  showToolbar,
  hideToolbar,
  setButtonsDisabled,
  setManualSelectMode,
  updateActionButtons,
  FormTriggerUI,
};
