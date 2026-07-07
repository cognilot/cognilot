/**
 * UI/AUTOCOMPLETE/HELP_UI.TS
 * Provides a help interface (Command Palette) when the user types '--'.
 */

export function paint(element: HTMLElement): void {
  if (!document.body) return;

  let container = element._CognilotHelp;
  if (!container) {
    container = document.createElement('div');
    container.className = 'Cognilot-terminal-box help-palette';
    Object.assign(container.style, {
      position: 'fixed',
      zIndex: '2147483647',
      background: 'rgba(5, 5, 5, 0.95)',
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
      border: '1px solid rgba(0, 242, 255, 0.3)',
      borderRadius: '8px',
      boxShadow: '0 12px 48px rgba(0, 0, 0, 0.7)',
      color: '#fff',
      fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace',
      fontSize: '11px',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'translateY(-15px) scale(0.98)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
      padding: '12px',
      minWidth: '240px',
    });

    // Title
    const title = document.createElement('div');
    title.innerHTML = '⚡ <span style="color:#00f2ff">Cognilot</span>_COMMANDS';
    title.style.marginBottom = '10px';
    title.style.fontSize = '10px';
    title.style.fontWeight = 'bold';
    title.style.letterSpacing = '1px';
    title.style.opacity = '0.8';
    container.appendChild(title);

    // Command List
    const commands = [
      { key: 'Tab', desc: 'Insert Suggestion' },
      { key: 'Ctrl+Space', desc: 'Toggle / Clear UI' },
      { key: 'Ctrl+Enter', desc: 'Refine (AI)' },
      { key: 'Ctrl+Ins', desc: 'Save / Learn' },
      { key: 'Ctrl+Del', desc: 'Delete Suggestion' },
      { key: '↑↓', desc: 'Navigate Options' },
    ];

    const list = document.createElement('div');
    commands.forEach((cmd) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      });
      row.innerHTML = `
        <span style="color:rgba(255,255,255,0.5)">${cmd.desc}</span>
        <span style="color:#00f2ff; background:rgba(0,242,255,0.1); padding:0 4px; border-radius:3px">${cmd.key}</span>
      `;
      list.appendChild(row);
    });
    container.appendChild(list);

    document.body.appendChild(container);
    element._CognilotHelp = container;
  }

  const rect = element.getBoundingClientRect();
  container.style.top = `${rect.bottom + 10}px`;
  container.style.left = `${rect.left}px`;

  requestAnimationFrame(() => {
    container!.style.opacity = '1';
    container!.style.transform = 'translateY(0) scale(1)';
  });
}

export function clear(element: HTMLElement): void {
  if (element._CognilotHelp) {
    const help = element._CognilotHelp;
    help.style.opacity = '0';
    help.style.transform = 'translateY(10px) scale(0.98)';
    setTimeout(() => {
      if (help.parentNode) help.remove();
    }, 200);
    delete element._CognilotHelp;
  }
}

export const HelpUI = {
  paint,
  clear,
};
