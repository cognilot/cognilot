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
        if (q.selector) {
          const el = document.querySelector(q.selector as string);
          if (el) {
            el.classList.add('Cognilot-detected-field');
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
    if (focused && focused.classList.contains('Cognilot-detected-field')) {
      CursorUI.paint(focused);
    }
  }
}

export function getCurrentBatch(): Array<Record<string, unknown>> {
  return _currentBatch || [];
}

export function setSelectedContainer(el: HTMLElement | null): void {
  if (_selectedContainer && _selectedContainer !== el) {
    restoreSelectedContainer(_selectedContainer);
  }

  _selectedContainer = el || null;
  if (!el) {
    removeSpotlightBackdrop();
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
  document
    .querySelectorAll('.Cognilot-detected-label')
    .forEach((node) => node.classList.remove('Cognilot-detected-label'));

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
};
