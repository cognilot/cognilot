/**
 * UI/AUTOCOMPLETE/HINT_UI.TS
 * Renders the floating hint label with shortcuts and suggestion list.
 */

import { parsePixelValue } from './ghost_ui';

export function paint(element: HTMLElement, suggestion: SuggestionState): void {
  if (!document.body) return;

  const hasOptions = suggestion.options && suggestion.options.length > 0;
  if (!hasOptions && !suggestion.isHelp && !suggestion.isError && !suggestion.isNoMatch) {
    clear(element);
    return;
  }

  let container = element._CognilotHint;
  if (!container) {
    container = document.createElement('div');
    container.className = 'Cognilot-terminal-box';
    Object.assign(container.style, {
      position: 'fixed',
      zIndex: '2147483647',
      background: 'rgba(5, 5, 5, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      color: '#fff',
      fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace',
      fontSize: '12px',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'translateY(-10px) scale(0.98)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
      overflow: 'hidden',
      minWidth: '220px',
      display: 'flex',
      flexDirection: 'column',
    });
    document.body.appendChild(container);
    element._CognilotHint = container;
  }

  container.innerHTML = '';

  // Suggestion list or status message section
  const listWrapper = document.createElement('div');
  listWrapper.style.padding = '4px 0';

  const options = suggestion.options || [];
  const activeIdx = suggestion._activeIndex || 0;
  const isExample = suggestion.type === 'example';

  if (suggestion.isError) {
    const errorItem = document.createElement('div');
    Object.assign(errorItem.style, {
      padding: '6px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#ef4444',
    });
    errorItem.innerHTML = `<span>></span><span>${suggestion.error || 'Connection error'}</span>`;
    listWrapper.appendChild(errorItem);
  } else if (suggestion.isNoMatch) {
    const noMatchItem = document.createElement('div');
    Object.assign(noMatchItem.style, {
      padding: '6px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: 'rgba(255, 255, 255, 0.45)',
    });
    noMatchItem.innerHTML = `<span>></span><span>No match in memory</span>`;
    listWrapper.appendChild(noMatchItem);
  } else if (options.length > 0 && !isExample) {
    options.forEach((opt, index) => {
      const item = document.createElement('div');
      item.className = 'Cognilot-suggestion-item';
      const isActive = index === activeIdx;

      Object.assign(item.style, {
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        color: isActive ? '#00f2ff' : '#fff',
        transition: 'background 0.1s ease',
      });

      const icon = document.createElement('span');
      icon.textContent = isActive ? '◆' : '◇';
      icon.style.color = isActive ? '#00f2ff' : 'rgba(255, 255, 255, 0.15)';
      icon.style.fontSize = '12px';
      icon.style.fontWeight = 'bold';
      item.appendChild(icon);

      const text = document.createElement('span');
      text.textContent = opt;
      text.style.fontWeight = isActive ? '600' : '400';
      item.appendChild(text);

      const meta = document.createElement('span');
      meta.textContent = isActive ? '[TAB]' : '';
      Object.assign(meta.style, {
        marginLeft: 'auto',
        fontSize: '10px',
        color: isActive ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.3)',
        opacity: isActive ? '0.8' : '0',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      });
      item.appendChild(meta);

      listWrapper.appendChild(item);
    });
  }

  container.appendChild(listWrapper);

  // Footer section
  const footer = document.createElement('div');
  footer.className = 'Cognilot-terminal-footer';
  Object.assign(footer.style, {
    padding: '6px 12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(255, 255, 255, 0.02)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: 'bold',
  });

  const leftFooter = document.createElement('div');
  if (suggestion.isError) {
    leftFooter.innerHTML = `// <span style="color:#ef4444">[error]</span>`;
  } else if (suggestion.isNoMatch) {
    leftFooter.innerHTML = `// <span style="color:rgba(255,255,255,0.6)">[no matches]</span>`;
  } else if (isExample) {
    const msg = options[0] || 'Example';
    leftFooter.innerHTML = `// <span style="color:rgba(255,255,255,0.6)">${msg}</span>`;
  } else {
    const placeholder = suggestion.field?.placeholder || 'Write your answer';
    leftFooter.innerHTML = `// <span style="color:rgba(255,255,255,0.6)">${placeholder}</span>`;
  }
  footer.appendChild(leftFooter);

  const rightFooter = document.createElement('div');
  if (suggestion.isError) {
    rightFooter.innerHTML = `<span>Retry <span style="color:rgba(255,255,255,0.6)">[Ctrl+Space]</span></span>`;
  } else if (suggestion.isNoMatch) {
    rightFooter.innerHTML = `<span>Save <span style="color:rgba(255,255,255,0.6)">[Ctrl+Ins]</span></span>`;
  } else {
    rightFooter.innerHTML = `<span>Help <span style="color:rgba(255,255,255,0.6)">[--]</span></span>`;
  }
  footer.appendChild(rightFooter);

  container.appendChild(footer);

  // Dynamic positioning
  const updatePosition = (): void => {
    if (!element._CognilotHint) return;
    const rect = element.getBoundingClientRect();
    const hintHeight = container!.offsetHeight || 60;
    const hintWidth = container!.offsetWidth || 220;
    const styles = window.getComputedStyle(element);

    const borderLeft = parsePixelValue(styles.borderLeftWidth);
    const paddingLeft = parsePixelValue(styles.paddingLeft);
    const textIndent = parsePixelValue(styles.textIndent);

    const viewportPad = 8;
    let top = rect.bottom + 8;
    if (top + hintHeight > window.innerHeight - viewportPad) {
      top = rect.top - hintHeight - 8;
    }

    const rawLeft = rect.left + borderLeft + paddingLeft + Math.max(0, textIndent);
    const left = Math.max(
      viewportPad,
      Math.min(rawLeft, window.innerWidth - hintWidth - viewportPad)
    );

    container!.style.top = `${top}px`;
    container!.style.left = `${left}px`;

    if (container!.style.opacity === '0') {
      requestAnimationFrame(() => {
        container!.style.opacity = '1';
        container!.style.transform = 'translateY(0) scale(1)';
      });
    }
    requestAnimationFrame(updatePosition);
  };

  requestAnimationFrame(updatePosition);
}

export function clear(element: HTMLElement): void {
  if (element._CognilotHint) {
    const hint = element._CognilotHint;
    hint.style.opacity = '0';
    hint.style.transform = 'translateY(10px) scale(0.98)';
    setTimeout(() => {
      if (hint.parentNode) hint.remove();
    }, 200);
    delete element._CognilotHint;
  }
}

export const HintUI = {
  paint,
  clear,
};
