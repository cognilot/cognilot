/**
 * GhostTextController
 *
 * Renders an inline autocomplete "ghost text" overlay over focused input fields.
 * Mirrors VS Code / Copilot ghost text UX: the suggestion appears greyed out
 * inside the field; Tab accepts it, Escape dismisses it.
 *
 * Architecture:
 * - Creates a transparent <div> positioned absolutely over the input
 * - Renders suggestion text in a muted color using font metrics matching the input
 * - Listens to Tab / Escape / input events on the field
 * - Calls onAccept(value) callback when the user presses Tab
 *
 * Usage:
 * ```ts
 * const ghost = new GhostTextController({ onAccept, onDismiss });
 * ghost.attach(inputElement);
 * ghost.show('john.doe@example.com');
 * ```
 */

export interface GhostTextOptions {
  /** Called with the accepted value when the user presses Tab */
  onAccept: (value: string) => void;
  /** Called when the user presses Escape or starts typing */
  onDismiss?: () => void;
  /** CSS color for the ghost text. Defaults to rgba(150, 150, 150, 0.6) */
  ghostColor?: string;
}

export class GhostTextController {
  private static readonly GHOST_ATTR = 'data-cognilot-ghost';
  private static readonly GHOST_CLASS = 'cognilot-ghost-overlay';

  private options: GhostTextOptions;
  private activeInput: HTMLInputElement | HTMLTextAreaElement | null = null;
  private overlayEl: HTMLElement | null = null;
  private currentSuggestion: string = '';

  // Bound listeners for clean teardown
  private onKeyDown = this.handleKeyDown.bind(this);
  private onInput = this.handleInput.bind(this);

  constructor(options: GhostTextOptions) {
    this.options = options;
    this.injectStyles();
  }

  /**
   * Attaches the ghost text controller to an input element.
   * Detaches from any previously attached element first.
   */
  attach(input: HTMLInputElement | HTMLTextAreaElement): void {
    if (this.activeInput === input) return;
    this.detach();

    this.activeInput = input;
    input.addEventListener('keydown', this.onKeyDown, true);
    input.addEventListener('input', this.onInput);
  }

  /**
   * Detaches from the current input and removes the overlay.
   */
  detach(): void {
    if (this.activeInput) {
      this.activeInput.removeEventListener('keydown', this.onKeyDown, true);
      this.activeInput.removeEventListener('input', this.onInput);
      this.activeInput = null;
    }
    this.hide();
  }

  /**
   * Displays the ghost text suggestion over the attached input.
   * Only shows the portion of the suggestion that doesn't already match the field value.
   */
  show(suggestion: string): void {
    if (!this.activeInput) return;

    const currentValue = this.activeInput.value;

    // Don't show ghost if the field already contains this value
    if (currentValue === suggestion) {
      this.hide();
      return;
    }

    // Compute the "remaining" portion of the suggestion
    const remaining = suggestion.startsWith(currentValue)
      ? suggestion.slice(currentValue.length)
      : suggestion;

    if (!remaining) {
      this.hide();
      return;
    }

    this.currentSuggestion = suggestion;
    this.renderOverlay(remaining);
  }

  /**
   * Hides and removes the ghost text overlay.
   */
  hide(): void {
    this.overlayEl?.remove();
    this.overlayEl = null;
    this.currentSuggestion = '';
  }

  /**
   * Returns whether a ghost text suggestion is currently visible.
   */
  get isVisible(): boolean {
    return this.overlayEl !== null;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isVisible) return;

    if (event.key === 'Tab') {
      event.preventDefault();
      this.accept();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.dismiss();
    }
  }

  private handleInput(): void {
    // If the user types while a ghost is shown, hide it (they diverged from the suggestion)
    if (this.isVisible) {
      this.hide();
      this.options.onDismiss?.();
    }
  }

  private accept(): void {
    if (!this.currentSuggestion || !this.activeInput) return;

    // Fill the input with the full suggestion value
    const nativeInputSetter = Object.getOwnPropertyDescriptor(
      this.activeInput.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeInputSetter) {
      nativeInputSetter.call(this.activeInput, this.currentSuggestion);
    } else {
      this.activeInput.value = this.currentSuggestion;
    }

    // Dispatch React/Vue-compatible change events
    this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    this.activeInput.dispatchEvent(new Event('change', { bubbles: true }));

    this.options.onAccept(this.currentSuggestion);
    this.hide();
  }

  private dismiss(): void {
    this.hide();
    this.options.onDismiss?.();
  }

  private renderOverlay(ghostText: string): void {
    if (!this.activeInput) return;

    // Create overlay if it doesn't exist yet
    if (!this.overlayEl) {
      this.overlayEl = document.createElement('div');
      this.overlayEl.className = GhostTextController.GHOST_CLASS;
      this.overlayEl.setAttribute(GhostTextController.GHOST_ATTR, 'true');
      document.body.appendChild(this.overlayEl);
    }

    // Position the overlay over the input
    const rect = this.activeInput.getBoundingClientRect();
    const inputStyle = window.getComputedStyle(this.activeInput);

    const textWidth = this.getTextWidth(this.activeInput.value, inputStyle.font);

    const paddingLeft = parseFloat(inputStyle.paddingLeft);
    const paddingTop = parseFloat(inputStyle.paddingTop);

    Object.assign(this.overlayEl.style, {
      position: 'fixed',
      left: `${rect.left + paddingLeft + textWidth}px`,
      top: `${rect.top + paddingTop}px`,
      height: inputStyle.lineHeight,
      font: inputStyle.font,
      color: this.options.ghostColor ?? 'rgba(160, 160, 160, 0.65)',
      pointerEvents: 'none',
      zIndex: '2147483646',
      whiteSpace: 'pre',
      display: 'flex',
      alignItems: 'center',
    });

    this.overlayEl.textContent = ghostText;
  }

  /**
   * Measures the pixel width of a text string in a given font.
   * Uses a canvas to avoid DOM reflow.
   */
  private getTextWidth(text: string, font: string): number {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    ctx.font = font;
    return ctx.measureText(text).width;
  }

  /**
   * Injects the minimal CSS needed for the ghost overlay.
   * Uses a unique attribute to avoid conflicts with site styles.
   */
  private injectStyles(): void {
    const styleId = 'cognilot-ghost-text-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .${GhostTextController.GHOST_CLASS} {
        user-select: none;
        line-height: inherit;
        letter-spacing: inherit;
      }
    `;
    document.head.appendChild(style);
  }
}
