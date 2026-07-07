/**
 * UI/AUTOCOMPLETE/GHOST_UI.TS
 * Renders the "Ghost Text" inside input fields.
 * Includes text measurement utilities and cursor positioning.
 */

let _measureCanvas: HTMLCanvasElement | null = null;
let _measureCtx: CanvasRenderingContext2D | null = null;

export function parsePixelValue(value: string): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function measureTextWidth(text: string, styles: CSSStyleDeclaration): number {
  if (!_measureCanvas) {
    _measureCanvas = document.createElement('canvas');
    _measureCtx = _measureCanvas.getContext('2d');
  }
  if (!_measureCtx) return Math.max(0, String(text || '').length * 8);

  const fontStyle = styles.fontStyle || 'normal';
  const fontWeight = styles.fontWeight || '400';
  const fontSize = styles.fontSize || '16px';
  const fontFamily = styles.fontFamily || 'sans-serif';
  _measureCtx.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;

  const metrics = _measureCtx.measureText(String(text || ''));
  const rawWidth = Number.isFinite(metrics.width) ? metrics.width : 0;
  const letterSpacing = parsePixelValue(styles.letterSpacing);
  const extraSpacing = Math.max(0, String(text || '').length - 1) * Math.max(0, letterSpacing);
  return rawWidth + extraSpacing;
}

export function getCaretCoordinates(
  element: HTMLInputElement | HTMLTextAreaElement,
  styles: CSSStyleDeclaration
): { x: number; y: number } {
  const selectionStart = typeof element.selectionStart === 'number' ? element.selectionStart : 0;
  const valueBeforeCaret = String(element.value || '').slice(0, selectionStart);
  const fullValue = String(element.value || '');
  const isTextarea = element.tagName && element.tagName.toLowerCase() === 'textarea';

  const mirror = document.createElement('div');
  const mirrorStyle = mirror.style;
  Object.assign(mirrorStyle, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    whiteSpace: isTextarea ? 'pre-wrap' : 'pre',
    overflowWrap: 'break-word',
    wordWrap: 'break-word',
    left: '-99999px',
    top: '0',
  });

  const copiedProps: string[] = [
    'boxSizing',
    'width',
    'height',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'lineHeight',
    'letterSpacing',
    'textAlign',
    'textTransform',
    'textIndent',
    'tabSize',
  ];
  copiedProps.forEach(
    (prop) =>
      ((mirrorStyle as unknown as Record<string, string>)[prop] = (
        styles as unknown as Record<string, string>
      )[prop])
  );

  mirror.textContent = valueBeforeCaret;
  const marker = document.createElement('span');
  marker.textContent = fullValue.slice(selectionStart) || '.';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const markerRect = marker.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();
  const x = markerRect.left - mirrorRect.left - (element.scrollLeft || 0);
  const y = markerRect.top - mirrorRect.top - (element.scrollTop || 0);

  mirror.remove();
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };
}

function supportsGhost(element: HTMLElement): boolean {
  if (!element || !element.tagName) return false;
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'textarea') return true;
  if (tagName !== 'input') return false;
  const type = (element.getAttribute('type') || 'text').toLowerCase();
  return ['text', 'email', 'search', 'url', 'tel', 'password', ''].includes(type);
}

export function paint(element: HTMLElement, suggestion: SuggestionState): void {
  clear(element);

  const activeText = Array.isArray(suggestion.options)
    ? suggestion.options[suggestion._activeIndex || 0] || ''
    : '';

  const inputEl = element as HTMLInputElement;
  const userText = inputEl.value || '';
  const hasUserText = userText.trim().length > 0;

  const isMatch = activeText.toLowerCase().startsWith(userText.toLowerCase());
  const shouldShowGhost =
    isMatch &&
    !suggestion.isLoading &&
    !suggestion.isError &&
    suggestion.type !== 'example' &&
    !!activeText;

  if (!shouldShowGhost || !supportsGhost(element)) return;

  element.classList.add('Cognilot-ghost-active');

  const ghost = document.createElement('div');
  ghost.className = 'Cognilot-ghost-overlay';

  ghost.textContent = hasUserText ? activeText.slice(userText.length) : activeText;

  document.body.appendChild(ghost);
  element._CognilotGhost = ghost;

  const syncGhost = (): void => {
    if (!element._CognilotGhost) return;

    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);

    const borderLeft = parsePixelValue(styles.borderLeftWidth || styles.borderInlineStartWidth);
    const borderRight = parsePixelValue(styles.borderRightWidth || styles.borderInlineEndWidth);
    const borderTop = parsePixelValue(styles.borderTopWidth || styles.borderBlockStartWidth);
    const borderBottom = parsePixelValue(styles.borderBottomWidth || styles.borderBlockEndWidth);
    const paddingLeft = parsePixelValue(styles.paddingLeft || styles.paddingInlineStart);
    const paddingRight = parsePixelValue(styles.paddingRight || styles.paddingInlineEnd);
    const paddingTop = parsePixelValue(styles.paddingTop || styles.paddingBlockStart);
    const paddingBottom = parsePixelValue(styles.paddingBottom || styles.paddingBlockEnd);
    const textIndent = parsePixelValue(styles.textIndent);
    const lineHeight = parsePixelValue(styles.lineHeight);

    const availableWidth = Math.max(
      20,
      rect.width - borderLeft - borderRight - paddingLeft - paddingRight - Math.max(0, textIndent)
    );
    const contentHeight = Math.max(
      20,
      rect.height - borderTop - borderBottom - paddingTop - paddingBottom
    );
    const safeLineHeight = Math.max(
      14,
      lineHeight || parsePixelValue(styles.fontSize) * 1.35 || 18
    );
    const maxLines = Math.max(1, Math.floor(contentHeight / safeLineHeight));
    const isTextarea = element.tagName.toLowerCase() === 'textarea';

    const caret = getCaretCoordinates(element as HTMLInputElement | HTMLTextAreaElement, styles);
    const caretLeft = rect.left + window.scrollX + caret.x;
    const caretTop = rect.top + window.scrollY + caret.y;

    const liveText = Array.isArray(suggestion.options)
      ? suggestion.options[suggestion._activeIndex || 0] || ''
      : '';
    const userTextLength = (inputEl.value || '').length;
    const displayGhostPart = userTextLength > 0 ? liveText.slice(userTextLength) : liveText;

    ghost.textContent = displayGhostPart;

    const measuredTextWidth = measureTextWidth(displayGhostPart, styles);
    const gradientWidth = Math.min(availableWidth, Math.max(96, measuredTextWidth));

    const ghostTop = isTextarea
      ? Math.max(rect.top + window.scrollY + borderTop + paddingTop, caretTop)
      : rect.top +
        window.scrollY +
        borderTop +
        paddingTop +
        Math.max(0, (contentHeight - safeLineHeight) / 2);

    Object.assign(ghost.style, {
      left: `${Math.max(rect.left + window.scrollX + borderLeft + paddingLeft + Math.max(0, textIndent), caretLeft)}px`,
      top: `${ghostTop}px`,
      width: `${Math.max(20, availableWidth - Math.max(0, caret.x - (borderLeft + paddingLeft + Math.max(0, textIndent))))}px`,
      maxHeight: isTextarea ? `${maxLines * safeLineHeight}px` : `${safeLineHeight}px`,
      fontFamily: styles.fontFamily,
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      fontStyle: styles.fontStyle,
      letterSpacing: styles.letterSpacing,
      lineHeight: styles.lineHeight,
      textAlign: styles.textAlign,
      whiteSpace: isTextarea ? 'pre-wrap' : 'nowrap',
      wordBreak: isTextarea ? 'break-word' : 'normal',
      overflowWrap: isTextarea ? 'anywhere' : 'normal',
      backgroundSize: `${gradientWidth}px 100%`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'left top',
      WebkitMaskImage: isTextarea
        ? 'linear-gradient(to bottom, #000 80%, transparent 100%)'
        : 'linear-gradient(to right, #000 82%, transparent 100%)',
      maskImage: isTextarea
        ? 'linear-gradient(to bottom, #000 80%, transparent 100%)'
        : 'linear-gradient(to right, #000 82%, transparent 100%)',
    });

    element._CognilotGhostRaf = requestAnimationFrame(syncGhost);
  };

  element._CognilotGhostRaf = requestAnimationFrame(syncGhost);
}

export function clear(element: HTMLElement): void {
  if (element._CognilotGhostRaf) {
    cancelAnimationFrame(element._CognilotGhostRaf);
    delete element._CognilotGhostRaf;
  }

  if (element._CognilotGhost) {
    if (element._CognilotGhost.parentNode) element._CognilotGhost.remove();
    delete element._CognilotGhost;
  }

  element.classList.remove('Cognilot-ghost-active');
}

export const GhostUI = {
  parsePixelValue,
  measureTextWidth,
  getCaretCoordinates,
  paint,
  clear,
};
