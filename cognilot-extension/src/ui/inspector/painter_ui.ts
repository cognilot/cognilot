/**
 * UI/INSPECTOR/PAINTER_UI.TS
 * Visual highlighting for detected fields and labels.
 */

let _lastHighlighted: HTMLElement | null = null;
let _selectedContainerRef: () => HTMLElement | null = () => null;

export function setSelectedContainerRef(ref: () => HTMLElement | null): void {
  _selectedContainerRef = ref;
}

export function highlight(el: HTMLElement): void {
  if (_lastHighlighted && _lastHighlighted !== el) {
    removeHighlight(_lastHighlighted);
  }
  if (el) {
    if (_lastHighlighted === el && el._CognilotOriginalBoxShadow !== undefined) return;
    const selectedContainer = _selectedContainerRef();
    if (selectedContainer && el === selectedContainer) {
      _lastHighlighted = el;
      return;
    }

    el.classList.add('aiden-highlight');
    _lastHighlighted = el;

    if (el._CognilotOriginalBoxShadow === undefined) {
      el._CognilotOriginalBoxShadow = el.style.boxShadow;
      el._CognilotOriginalOutline = el.style.outline;
      el._CognilotOriginalBackgroundColor = el.style.backgroundColor;
    }

    el.style.boxShadow = '0 0 0 4px rgba(168, 85, 247, 0.3)';
    el.style.outline = '2px solid #a855f7';
    el.style.backgroundColor = 'rgba(168, 85, 247, 0.08)';
  }
}

export function removeHighlight(el?: HTMLElement | null): void {
  const target = el || _lastHighlighted;
  const selectedContainer = _selectedContainerRef();
  if (target && selectedContainer && target === selectedContainer) return;
  if (target) {
    target.classList.remove('aiden-highlight');
    if (target._CognilotOriginalBoxShadow !== undefined) {
      target.style.boxShadow = target._CognilotOriginalBoxShadow;
      target.style.outline = target._CognilotOriginalOutline!;
      target.style.backgroundColor = target._CognilotOriginalBackgroundColor!;
      delete target._CognilotOriginalBoxShadow;
      delete target._CognilotOriginalOutline;
      delete target._CognilotOriginalBackgroundColor;
    }
    if (_lastHighlighted === target) _lastHighlighted = null;
  }
}

export function findLabelElement(
  el: HTMLElement | null,
  expectedText?: string
): HTMLElement | null {
  if (!el) return null;
  if (expectedText) {
    const cleanExpected = expectedText
      .trim()
      .toLowerCase()
      .replace(/\*|:|\s/g, '');
    if (cleanExpected.length >= 2) {
      let current: HTMLElement | null = el.parentElement;
      let depth = 0;
      while (current && depth < 5 && current.tagName !== 'FORM' && current !== document.body) {
        const containerText = (current.innerText || current.textContent || '')
          .toLowerCase()
          .replace(/\*|:|\s/g, '');
        if (containerText.includes(cleanExpected)) {
          const candidates = Array.from(
            current.querySelectorAll(
              'label, p, span, h1, h2, h3, h4, h5, h6, b, strong, i, [class*="label"], [class*="title"], [data-testid*="label"]'
            )
          ) as HTMLElement[];
          const match = candidates.find((c) => {
            if (c.contains(el)) return false;
            const cText = (c.innerText || c.textContent || '')
              .trim()
              .toLowerCase()
              .replace(/\*|:|\s/g, '');
            return (
              cText &&
              (cText === cleanExpected ||
                cText.includes(cleanExpected) ||
                cleanExpected.includes(cText))
            );
          });
          if (match) return match;
        }
        current = current.parentElement;
        depth++;
      }
    }
  }
  if (el.id) {
    const labelFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (labelFor) return labelFor as HTMLElement;
  }
  const parentLabel = el.closest('label');
  if (parentLabel) return parentLabel as HTMLElement;

  let sib = el.previousElementSibling as HTMLElement | null;
  while (sib) {
    if (/LABEL|SPAN|B|STRONG|H[1-6]/i.test(sib.tagName) && sib.innerText?.trim()) return sib;
    sib = sib.previousElementSibling as HTMLElement | null;
  }
  return null;
}

export function getLastHighlighted(): HTMLElement | null {
  return _lastHighlighted;
}

export function setLastHighlighted(el: HTMLElement | null): void {
  _lastHighlighted = el;
}

export const PainterUI = {
  setSelectedContainerRef,
  highlight,
  removeHighlight,
  findLabelElement,
  getLastHighlighted,
  setLastHighlighted,
};
