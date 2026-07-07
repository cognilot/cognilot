/**
 * UI/AUTOCOMPLETE/CURSOR_UI.TS
 * Renders a terminal-style block cursor that follows the native insertion point.
 */

let _cursor: HTMLDivElement | null = null;
let _activeElement: HTMLElement | null = null;
let _rafId: number | null = null;

function supportsCursor(element: HTMLElement): boolean {
  if (!element || !element.tagName) return false;
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'textarea') return true;
  if (tagName !== 'input') return false;
  const type = (element.getAttribute('type') || 'text').toLowerCase();
  return ['text', 'email', 'search', 'url', 'tel', 'password', ''].includes(type);
}

function createCursor(className = 'Cognilot-terminal-cursor'): void {
  if (_cursor && _cursor.parentNode) {
    _cursor.className = className;
    return;
  }

  _cursor = document.createElement('div');
  _cursor.className = className;
  Object.assign(_cursor.style, {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: '2147483647',
    display: 'none',
  });
  document.body.appendChild(_cursor);
}

export function paint(element: HTMLElement, isFormContext = true): void {
  if (!supportsCursor(element)) return;
  if (!element || element._blockCognilotTrigger) return;

  const cursorClass = isFormContext
    ? 'Cognilot-terminal-cursor'
    : 'Cognilot-terminal-cursor Cognilot-terminal-cursor--secondary';
  const caretColor = isFormContext
    ? 'var(--Cognilot-main-primary)'
    : 'var(--Cognilot-main-secondary)';

  const inputEl = element as HTMLInputElement;
  const isCommandMode = inputEl.value && (inputEl.value.startsWith('> ') || inputEl.value === '>');

  if (!isCommandMode) {
    if (_activeElement === element) {
      clear();
    }
    element.style.setProperty('caret-color', caretColor, 'important');
    return;
  }

  if (_activeElement === element) return;
  clear();

  _activeElement = element;
  createCursor(cursorClass);

  element.style.setProperty('caret-color', 'transparent', 'important');

  const sync = (): void => {
    if (!_activeElement || !_cursor) return;
    if (document.activeElement !== _activeElement) {
      clear();
      return;
    }

    const rect = _activeElement.getBoundingClientRect();
    const styles = window.getComputedStyle(_activeElement);

    // Use GhostUI's getCaretCoordinates for consistent positioning
    const ghostUI = (window.Cognilot as Record<string, unknown>)?.Autocomplete as
      | Record<
          string,
          {
            getCaretCoordinates?(
              el: HTMLElement,
              styles: CSSStyleDeclaration
            ): { x: number; y: number };
          }
        >
      | undefined;
    const ghostUiModule = ghostUI?.GhostUI;

    if (!ghostUiModule || typeof ghostUiModule.getCaretCoordinates !== 'function') {
      clear();
      return;
    }

    const caret = ghostUiModule.getCaretCoordinates(_activeElement, styles);

    const fontSize = parseFloat(styles.fontSize) || 14;
    const lineHeight = parseFloat(styles.lineHeight) || fontSize * 1.2;
    const borderTop = parseFloat(styles.borderTopWidth) || 0;

    const cursorWidth = Math.max(8, fontSize * 0.55);
    const cursorHeight = Math.min(rect.height - borderTop * 2, lineHeight);

    Object.assign(_cursor.style, {
      display: 'block',
      position: 'fixed',
      left: `${rect.left + caret.x}px`,
      top: `${rect.top + caret.y}px`,
      height: `${cursorHeight}px`,
      width: `${cursorWidth}px`,
      zIndex: '2147483647',
    });

    _rafId = requestAnimationFrame(sync);
  };

  _rafId = requestAnimationFrame(sync);
}

export function clear(): void {
  if (_rafId) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }

  if (_cursor) {
    _cursor.style.display = 'none';
  }

  if (_activeElement) {
    _activeElement.style.caretColor = '';
    _activeElement = null;
  }
}

export const CursorUI = {
  paint,
  clear,
};
