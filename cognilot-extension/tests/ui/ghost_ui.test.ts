import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as GhostUI from '../../src/ui/autocomplete/ghost_ui';

describe('GhostUI', () => {
  let input1: HTMLInputElement;
  let input2: HTMLInputElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    input1 = document.createElement('input');
    input1.type = 'text';
    input1.id = 'input-1';
    input1.value = '';
    document.body.appendChild(input1);

    input2 = document.createElement('input');
    input2.type = 'text';
    input2.id = 'input-2';
    input2.value = '';
    document.body.appendChild(input2);
  });

  afterEach(() => {
    GhostUI.clear(input1);
    GhostUI.clear(input2);
    document.body.innerHTML = '';
  });

  it('should render ghost text and display Tab badge when element has active focus', () => {
    input1.focus();
    expect(document.activeElement).toBe(input1);

    GhostUI.paint(input1, {
      options: ['john.doe@example.com'],
      _activeIndex: 0,
      isLoading: false,
      isError: false,
    });

    const overlay = (input1 as any)._CognilotGhost as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(overlay.classList.contains('Cognilot-ghost-overlay')).toBe(true);

    const textSpan = overlay.querySelector('.Cognilot-ghost-text') as HTMLElement;
    const tabBadge = overlay.querySelector('.Cognilot-ghost-tab-badge') as HTMLElement;

    expect(textSpan).toBeTruthy();
    expect(textSpan.textContent).toBe('john.doe@example.com');
    expect(textSpan.style.webkitMaskImage || textSpan.style.maskImage || '').toBe('');

    expect(tabBadge).toBeTruthy();
    expect(tabBadge.textContent).toBe('Tab');
    expect(tabBadge.style.display).toBe('inline-flex');
  });

  it('should render ghost text WITHOUT Tab badge when element is not focused (sibling field)', () => {
    // input1 has focus, input2 is an unfocused sibling
    input1.focus();
    expect(document.activeElement).toBe(input1);

    GhostUI.paint(input2, {
      options: ['Doe'],
      _activeIndex: 0,
      isLoading: false,
      isError: false,
    });

    const overlay = (input2 as any)._CognilotGhost as HTMLElement;
    expect(overlay).toBeTruthy();

    const textSpan = overlay.querySelector('.Cognilot-ghost-text') as HTMLElement;
    const tabBadge = overlay.querySelector('.Cognilot-ghost-tab-badge') as HTMLElement;

    expect(textSpan).toBeTruthy();
    expect(textSpan.textContent).toBe('Doe');

    expect(tabBadge).toBeTruthy();
    expect(tabBadge.style.display).toBe('none');
  });

  it('should dynamically show Tab badge when focus shifts to the element', () => {
    input1.focus();

    GhostUI.paint(input2, {
      options: ['Doe'],
      _activeIndex: 0,
      isLoading: false,
      isError: false,
    });

    const overlay2 = (input2 as any)._CognilotGhost as HTMLElement;
    const tabBadge2 = overlay2.querySelector('.Cognilot-ghost-tab-badge') as HTMLElement;
    expect(tabBadge2.style.display).toBe('none');

    // Shift focus to input2
    input2.focus();
    expect(document.activeElement).toBe(input2);

    GhostUI.paint(input2, {
      options: ['Doe'],
      _activeIndex: 0,
      isLoading: false,
      isError: false,
    });

    const activeOverlay2 = (input2 as any)._CognilotGhost as HTMLElement;
    const activeTabBadge2 = activeOverlay2.querySelector(
      '.Cognilot-ghost-tab-badge'
    ) as HTMLElement;
    expect(activeTabBadge2.style.display).toBe('inline-flex');
  });

  it('should render · · · ghost text with loading class on unfocused sibling field during prefetch', () => {
    input1.focus();

    GhostUI.paint(input2, {
      options: ['· · ·'],
      _activeIndex: 0,
      isLoading: true,
      isError: false,
    });

    const overlay = (input2 as any)._CognilotGhost as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(overlay.classList.contains('Cognilot-ghost-loading')).toBe(true);
    expect(input2.classList.contains('Cognilot-field-loading')).toBe(true);

    const textSpan = overlay.querySelector('.Cognilot-ghost-text') as HTMLElement;
    const tabBadge = overlay.querySelector('.Cognilot-ghost-tab-badge') as HTMLElement;

    expect(textSpan.textContent).toBe('· · ·');
    expect(tabBadge.style.display).toBe('none');
  });

  it('should highlight only the matching radio/checkbox input (and not the label) with paintChoiceGhost', () => {
    const radioContainer = document.createElement('div');
    radioContainer.innerHTML = `
      <label id="lbl-es"><input type="radio" name="lang" value="Spanish" id="radio-es"> Español</label>
      <label id="lbl-en"><input type="radio" name="lang" value="English" id="radio-en"> English</label>
    `;
    document.body.appendChild(radioContainer);

    const radioEs = document.getElementById('radio-es') as HTMLInputElement;
    const radioEn = document.getElementById('radio-en') as HTMLInputElement;
    const lblEs = document.getElementById('lbl-es') as HTMLElement;
    const lblEn = document.getElementById('lbl-en') as HTMLElement;

    GhostUI.paintChoiceGhost(radioContainer, ['Spanish']);

    // Only input should be highlighted, label remains clean
    expect(radioEs.classList.contains('Cognilot-ghost-choice-highlight')).toBe(true);
    expect(lblEs.classList.contains('Cognilot-ghost-choice-label-highlight')).toBe(false);

    expect(radioEn.classList.contains('Cognilot-ghost-choice-highlight')).toBe(false);
    expect(lblEn.classList.contains('Cognilot-ghost-choice-label-highlight')).toBe(false);

    GhostUI.clearChoiceGhost(radioContainer);

    expect(radioEs.classList.contains('Cognilot-ghost-choice-highlight')).toBe(false);
    expect(lblEs.classList.contains('Cognilot-ghost-choice-label-highlight')).toBe(false);
  });

  it('should highlight matching OPTION with Cognilot-ghost-choice-highlight and not the select container', () => {
    const select = document.createElement('select');
    select.id = 'pronouns-select';
    select.innerHTML = `
      <option value="">Don't specify</option>
      <option value="they/them" id="opt-they">they/them</option>
      <option value="she/her" id="opt-she">she/her</option>
      <option value="he/him" id="opt-he">he/him</option>
    `;
    document.body.appendChild(select);

    const optThey = document.getElementById('opt-they') as HTMLOptionElement;
    const optShe = document.getElementById('opt-she') as HTMLOptionElement;

    GhostUI.paintChoiceGhost(select, ['they/them']);

    // Select container should remain clean, option gets the choice highlight
    expect(select.classList.contains('Cognilot-ghost-choice-highlight')).toBe(false);
    expect(optThey.classList.contains('Cognilot-ghost-choice-highlight')).toBe(true);
    expect(optShe.classList.contains('Cognilot-ghost-choice-highlight')).toBe(false);

    GhostUI.clearChoiceGhost(select);

    expect(select.classList.contains('Cognilot-ghost-choice-highlight')).toBe(false);
    expect(optThey.classList.contains('Cognilot-ghost-choice-highlight')).toBe(false);
  });

  it('should remove ghost overlay and clean up on clear()', () => {
    input1.focus();
    GhostUI.paint(input1, {
      options: ['test@example.com'],
      _activeIndex: 0,
      isLoading: false,
      isError: false,
    });

    expect((input1 as any)._CognilotGhost).toBeTruthy();
    expect(document.querySelector('.Cognilot-ghost-overlay')).toBeTruthy();

    GhostUI.clear(input1);

    expect((input1 as any)._CognilotGhost).toBeUndefined();
    expect(document.querySelector('.Cognilot-ghost-overlay')).toBeNull();
    expect(input1.classList.contains('Cognilot-ghost-active')).toBe(false);
  });
});
