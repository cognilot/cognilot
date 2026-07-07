/**
 * UI/INSPECTOR/TOOLBAR_UI.TS
 * Floating toolbar management for the Inspector.
 */

export interface ToolbarHandlers {
  onManualSelectClick?: () => void;
  onSolveClick?: () => void;
  onCaptureClick?: () => void;
  onMarkdownClick?: () => void;
}

let _toolbar: HTMLDivElement | null = null;
let _btnSolve: HTMLButtonElement | null = null;
let _btnCapture: HTMLButtonElement | null = null;
let _btnMarkdown: HTMLButtonElement | null = null;
let _btnSelectManu: HTMLButtonElement | null = null;

function styleToolbarBtn(btn: HTMLButtonElement, isActive: boolean, isIcon = false): void {
  Object.assign(btn.style, {
    background: isActive ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
    color: isActive ? '#ffffff' : '#94a3b8',
    border: 'none',
    borderRadius: '8px',
    padding: isIcon ? '6px 10px' : '8px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  });

  if (!isActive) {
    btn.onmouseover = (): void => {
      btn.style.background = 'rgba(255, 255, 255, 0.1)';
    };
    btn.onmouseout = (): void => {
      btn.style.background = 'transparent';
    };
  } else {
    btn.onmouseover = null;
    btn.onmouseout = null;
  }
}

function createIconButton(
  id: string,
  title: string,
  svg: string,
  handler?: () => void
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = `inspector-btn-${id}`;
  btn.title = title;
  btn.innerHTML = svg;
  btn.style.display = 'flex';
  btn.style.position = 'relative';
  styleToolbarBtn(btn, false, true);
  btn.onclick = (e): void => {
    e.stopPropagation();
    if (handler) handler();
  };
  return btn;
}

function createDivider(): HTMLDivElement {
  const div = document.createElement('div');
  div.style.width = '1px';
  div.style.background = 'rgba(255, 255, 255, 0.1)';
  div.style.margin = '4px';
  return div;
}

function createToolbar(
  onModeChange: (mode: string) => void,
  onSolveClick: () => void,
  onManualSelectClick: () => void,
  onCaptureClick: () => void,
  onMarkdownClick: () => void,
  disableCallback: () => void
): void {
  const toolbar = document.createElement('div');
  toolbar.className = 'Cognilot-inspector-toolbar';

  Object.assign(toolbar.style, {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translate(-50%, -10px)',
    opacity: '0',
    zIndex: '2147483647',
    display: 'none',
    gap: '8px',
    padding: '6px 8px',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  });

  const btnSolve = createIconButton(
    'solve',
    'Resolver campos',
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    onSolveClick
  );

  const btnCapture = createIconButton(
    'capture',
    'Screenshot',
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
    onCaptureClick
  );

  const btnMarkdown = createIconButton(
    'markdown',
    'Markdown',
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    onMarkdownClick
  );

  const btnSelectManu = createIconButton(
    'select-manual',
    'Selección manual',
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>`,
    onManualSelectClick
  );

  const btnClose = document.createElement('button');
  btnClose.innerHTML = '✕';
  styleToolbarBtn(btnClose, false, true);
  btnClose.onclick = (e): void => {
    e.stopPropagation();
    disableCallback();
  };

  toolbar.appendChild(btnSelectManu);
  toolbar.appendChild(createDivider());
  toolbar.appendChild(btnSolve);
  toolbar.appendChild(btnCapture);
  toolbar.appendChild(btnMarkdown);
  toolbar.appendChild(createDivider());
  toolbar.appendChild(btnClose);

  _toolbar = toolbar;
  _btnSolve = btnSolve;
  _btnCapture = btnCapture;
  _btnMarkdown = btnMarkdown;
  _btnSelectManu = btnSelectManu;
}

export function showToolbar(
  onModeChange: (mode: string) => void,
  onSolveClick: () => void,
  onManualSelectClick: () => void,
  onCaptureClick: () => void,
  onMarkdownClick: () => void,
  disableCallback: () => void
): void {
  if (!_toolbar) {
    createToolbar(
      onModeChange,
      onSolveClick,
      onManualSelectClick,
      onCaptureClick,
      onMarkdownClick,
      disableCallback
    );
  }
  document.body.appendChild(_toolbar!);
  _toolbar!.style.display = 'flex';

  requestAnimationFrame(() => {
    _toolbar!.style.opacity = '1';
    _toolbar!.style.transform = 'translate(-50%, 0)';
  });
}

export function setButtonsDisabled(disabled: boolean): void {
  const actionBtns = [_btnSolve, _btnCapture, _btnMarkdown];
  actionBtns.forEach((btn) => {
    if (!btn) return;
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.35' : '1';
    btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    btn.style.pointerEvents = disabled ? 'none' : 'auto';
  });
}

export function setManualSelectMode(isActive: boolean): void {
  if (_btnSelectManu) styleToolbarBtn(_btnSelectManu, isActive, true);
}

export function hideToolbar(): void {
  if (_toolbar && _toolbar.parentNode) {
    _toolbar.style.opacity = '0';
    _toolbar.style.transform = 'translate(-50%, -10px)';
    const t = _toolbar;
    setTimeout(() => {
      if (t && t.parentNode) t.remove();
    }, 300);
  }
  _toolbar = null;
  _btnSolve = null;
  _btnCapture = null;
  _btnMarkdown = null;
  _btnSelectManu = null;
}

export function updateActionButtons(fieldCount: number, handlers: ToolbarHandlers): void {
  if (!_btnSolve || !_btnCapture || !_btnMarkdown || !_btnSelectManu) return;

  const { onManualSelectClick, onSolveClick, onCaptureClick, onMarkdownClick } = handlers || {};

  if (fieldCount > 0) {
    setButtonsDisabled(false);

    _btnSolve.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
      <span style="position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; padding: 2px 5px; border-radius: 10px; font-size: 10px; font-weight: bold; line-height: 1;">${fieldCount}</span>
    `;

    _btnSolve.onclick = (e): void => {
      e.stopPropagation();
      if (onSolveClick) onSolveClick();
    };
    _btnCapture.onclick = (e): void => {
      e.stopPropagation();
      if (onCaptureClick) onCaptureClick();
    };
    _btnMarkdown.onclick = (e): void => {
      e.stopPropagation();
      if (onMarkdownClick) onMarkdownClick();
    };
  } else {
    setButtonsDisabled(true);
    _btnSolve.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
    `;
  }

  _btnSelectManu.onclick = (e): void => {
    e.stopPropagation();
    if (onManualSelectClick) onManualSelectClick();
  };
  if (_toolbar) _toolbar.style.display = 'flex';
}

export const ToolbarUI = {
  showToolbar,
  setButtonsDisabled,
  setManualSelectMode,
  hideToolbar,
  updateActionButtons,
};
