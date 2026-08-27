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

  const inputEl = element as HTMLInputElement;
  const userText = inputEl.value || '';
  const hasUserText = userText.trim().length > 0;

  const activeText = suggestion.isLoading
    ? hasUserText
      ? ''
      : '· · ·'
    : Array.isArray(suggestion.options)
      ? suggestion.options[suggestion._activeIndex || 0] || ''
      : '';

  const isMatch = suggestion.isLoading
    ? !hasUserText
    : activeText.toLowerCase().startsWith(userText.toLowerCase());

  const shouldShowGhost = isMatch && !suggestion.isError && !!activeText;

  if (!shouldShowGhost || !supportsGhost(element)) return;

  element.classList.add('Cognilot-ghost-active');

  const ghost = document.createElement('div');
  ghost.className = 'Cognilot-ghost-overlay';
  if (suggestion.type === 'example') {
    ghost.classList.add('Cognilot-ghost-example');
  }
  if (suggestion.isLoading) {
    ghost.classList.add('Cognilot-ghost-loading');
    element.classList.add('Cognilot-field-loading');
  } else {
    element.classList.remove('Cognilot-field-loading');
  }

  const textSpan = document.createElement('span');
  textSpan.className = 'Cognilot-ghost-text';
  ghost.appendChild(textSpan);

  const tabBadge = document.createElement('span');
  tabBadge.className = 'Cognilot-ghost-tab-badge';
  tabBadge.textContent = 'Tab';
  tabBadge.style.display = 'none';
  ghost.appendChild(tabBadge);

  const isPassword =
    (element as HTMLInputElement).type === 'password' ||
    element.getAttribute('type') === 'password';

  const rawGhostPart = hasUserText ? activeText.slice(userText.length) : activeText;
  textSpan.textContent =
    isPassword && rawGhostPart && !suggestion.isLoading
      ? '•'.repeat(Math.max(1, rawGhostPart.length))
      : rawGhostPart;

  document.body.appendChild(ghost);
  element._CognilotGhost = ghost;

  const syncGhost = (): void => {
    if (!element._CognilotGhost) return;

    const isFocused = document.activeElement === element;
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

    const liveText = suggestion.isLoading
      ? (inputEl.value || '').trim().length > 0
        ? ''
        : '· · ·'
      : Array.isArray(suggestion.options)
        ? suggestion.options[suggestion._activeIndex || 0] || ''
        : '';
    const userTextLength = (inputEl.value || '').length;
    const displayGhostPart = userTextLength > 0 ? liveText.slice(userTextLength) : liveText;

    const maskedOrRealGhost =
      isPassword && displayGhostPart && !suggestion.isLoading
        ? '•'.repeat(Math.max(1, displayGhostPart.length))
        : displayGhostPart;

    textSpan.textContent = maskedOrRealGhost;

    // Show Tab badge only on focused input when suggestion has non-empty text
    const showBadge = isFocused && !suggestion.isLoading && maskedOrRealGhost.trim().length > 0;
    tabBadge.style.display = showBadge ? 'inline-flex' : 'none';

    const measuredTextWidth = measureTextWidth(maskedOrRealGhost, styles);
    const gradientWidth = Math.min(availableWidth, Math.max(96, measuredTextWidth));

    const ghostTop = isTextarea
      ? Math.max(rect.top + window.scrollY + borderTop + paddingTop, caretTop)
      : rect.top +
        window.scrollY +
        borderTop +
        paddingTop +
        Math.max(0, (contentHeight - safeLineHeight) / 2);

    Object.assign(textSpan.style, {
      backgroundSize: `${gradientWidth}px 100%`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'left top',
    });

    Object.assign(ghost.style, {
      left: `${Math.max(rect.left + window.scrollX + borderLeft + paddingLeft + Math.max(0, textIndent), caretLeft)}px`,
      top: `${ghostTop}px`,
      maxWidth: `${Math.max(20, availableWidth - Math.max(0, caret.x - (borderLeft + paddingLeft + Math.max(0, textIndent))))}px`,
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
    });

    element._CognilotGhostRaf = requestAnimationFrame(syncGhost);
  };

  syncGhost();
}

export function paintChoiceGhost(element: HTMLElement, resolvedValues: string[]): void {
  if (!element || !Array.isArray(resolvedValues) || resolvedValues.length === 0) return;
  const doc = element.ownerDocument || document;
  const tagName = (element.tagName || '').toLowerCase();
  const type = (element.getAttribute('type') || '').toLowerCase();

  let inputs: HTMLInputElement[] = [];
  if (tagName === 'input' && (type === 'radio' || type === 'checkbox')) {
    const name = element.getAttribute('name');
    if (name) {
      const form = element.closest('form') || doc;
      inputs = Array.from(form.querySelectorAll(`input[name="${CSS.escape(name)}"]`));
    } else {
      inputs = [element as HTMLInputElement];
    }
  } else {
    inputs = Array.from(element.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
  }

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const normTargetVals = resolvedValues.map((v) => normalize(String(v)));

  for (const input of inputs) {
    const val = input.value || '';
    const labelEl =
      (input.closest('label') as HTMLElement | null) ??
      (input.id
        ? (doc.querySelector(`label[for="${CSS.escape(input.id)}"]`) as HTMLElement | null)
        : null) ??
      input.parentElement;

    const labelText = labelEl?.textContent || '';
    const normVal = normalize(val);
    const normLabel = normalize(labelText);

    const isMatch = normTargetVals.some(
      (tv) =>
        tv === normVal ||
        tv === normLabel ||
        (tv.length >= 3 && normLabel.includes(tv)) ||
        (normLabel.length >= 3 && tv.includes(normLabel))
    );

    if (isMatch && !input.checked) {
      input.classList.add('Cognilot-ghost-choice-highlight');
      if (labelEl) labelEl.classList.add('Cognilot-ghost-choice-label-highlight');
    } else {
      input.classList.remove('Cognilot-ghost-choice-highlight');
      if (labelEl) labelEl.classList.remove('Cognilot-ghost-choice-label-highlight');
    }
  }
}

export function clearChoiceGhost(element: HTMLElement): void {
  if (!element) return;
  const doc = element.ownerDocument || document;
  const tagName = (element.tagName || '').toLowerCase();
  const type = (element.getAttribute('type') || '').toLowerCase();

  let container: HTMLElement = element;
  if (tagName === 'input' && (type === 'radio' || type === 'checkbox')) {
    const name = element.getAttribute('name');
    if (name) {
      container = (element.closest('form') as HTMLElement) || (doc.body as HTMLElement);
    }
  }

  const highlightedInputs = container.querySelectorAll('.Cognilot-ghost-choice-highlight');
  highlightedInputs.forEach((el) => el.classList.remove('Cognilot-ghost-choice-highlight'));

  const highlightedLabels = container.querySelectorAll('.Cognilot-ghost-choice-label-highlight');
  highlightedLabels.forEach((el) => el.classList.remove('Cognilot-ghost-choice-label-highlight'));
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

  clearChoiceGhost(element);
  element.classList.remove('Cognilot-ghost-active');
  element.classList.remove('Cognilot-field-loading');
}

export const GhostUI = {
  parsePixelValue,
  measureTextWidth,
  getCaretCoordinates,
  paint,
  paintChoiceGhost,
  clearChoiceGhost,
  clear,
};
