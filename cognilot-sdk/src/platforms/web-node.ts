import { CognilotNode } from './interface';

/**
 * WebNode
 * Implementation of CognilotNode for the Browser environment.
 */
export class WebNode implements CognilotNode {
  readonly platform = 'web';
  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  get tagName() {
    return this.element.tagName;
  }
  get type() {
    return (this.element as any).type;
  }
  get id() {
    return this.element.id;
  }
  get name() {
    return (this.element as any).name;
  }
  get className() {
    return this.element.className;
  }
  get value() {
    return (this.element as any).value;
  }

  get isVisible(): boolean {
    const style = window.getComputedStyle(this.element);
    const isVisibleCSS =
      style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    // Extra check: If it has 0 dimensions and is not a special input, it's likely a hidden mirror
    const hasDimensions =
      this.element.offsetWidth > 0 ||
      this.element.offsetHeight > 0 ||
      this.element.getClientRects().length > 0;

    // For ChatGPT specifically: textarea.wcDTda_fallbackTextarea is always display:none, but just in case
    return isVisibleCSS && (hasDimensions || this.tagName.toLowerCase() === 'input');
  }

  get isInteractive(): boolean {
    const tag = this.tagName.toLowerCase();
    return (
      ['input', 'textarea', 'select', 'button'].includes(tag) ||
      this.element.getAttribute('contenteditable') === 'true'
    );
  }

  get textContent() {
    return this.element.textContent || '';
  }

  getAttribute(name: string): string | null {
    return this.element.getAttribute(name);
  }

  getInnerText(): string {
    return (this.element as any).innerText || this.element.textContent || '';
  }

  getStyle(prop: string): string {
    return window.getComputedStyle(this.element).getPropertyValue(prop);
  }

  getParent(): CognilotNode | null {
    return this.element.parentElement ? new WebNode(this.element.parentElement) : null;
  }

  getChildren(): CognilotNode[] {
    return Array.from(this.element.children).map((child) => new WebNode(child as HTMLElement));
  }

  querySelector(selector: string): CognilotNode | null {
    const el = this.element.querySelector(selector);
    return el ? new WebNode(el as HTMLElement) : null;
  }

  querySelectorAll(selector: string): CognilotNode[] {
    return Array.from(this.element.querySelectorAll(selector)).map(
      (el) => new WebNode(el as HTMLElement)
    );
  }

  closest(selector: string): CognilotNode | null {
    const el = this.element.closest(selector);
    return el ? new WebNode(el as HTMLElement) : null;
  }

  contains(other: CognilotNode): boolean {
    const otherEl = other.getRawNode<Node>();
    return this.element.contains(otherEl);
  }

  getNextSibling(): CognilotNode | null {
    const sib = this.element.nextElementSibling;
    return sib ? new WebNode(sib as HTMLElement) : null;
  }

  getPreviousSibling(): CognilotNode | null {
    const sib = this.element.previousElementSibling;
    return sib ? new WebNode(sib as HTMLElement) : null;
  }

  isBefore(other: CognilotNode): boolean {
    const otherEl = other.getRawNode<Node>();
    return !!(this.element.compareDocumentPosition(otherEl) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  async setValue(value: string): Promise<void> {
    if (this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement) {
      this.element.value = value;
      this.triggerEvent('input');
      this.triggerEvent('change');
    } else if (this.element.getAttribute('contenteditable') === 'true') {
      this.element.textContent = value;
      this.triggerEvent('input');
    }
  }

  async click(): Promise<void> {
    this.element.click();
  }

  triggerEvent(name: string): void {
    const event = new Event(name, { bubbles: true, cancelable: true });
    this.element.dispatchEvent(event);
  }

  getRawNode<T>(): T {
    return this.element as unknown as T;
  }
}
