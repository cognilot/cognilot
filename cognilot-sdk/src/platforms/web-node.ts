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

    if (!isVisibleCSS) return false;

    // Check for CSS clipping / clip-path hiding techniques (common in visually-hidden accessibility classes)
    if (
      style.clip === 'rect(0px, 0px, 0px, 0px)' ||
      style.clip === 'rect(0, 0, 0, 0)' ||
      style.clip === 'rect(1px, 1px, 1px, 1px)' ||
      style.clipPath === 'inset(50%)' ||
      style.clipPath === 'inset(100%)'
    ) {
      return false;
    }

    // Check if ANY ancestor hides this element via modal/dialog/aria patterns.
    // This covers cases like the Cobrix WhatsApp modal where fields inside
    // <div aria-hidden="true" ...> pass the CSS check but are not user-facing.
    let ancestor = this.element.parentElement;
    while (ancestor && ancestor !== document.body) {
      if (
        ancestor.getAttribute('aria-hidden') === 'true' ||
        ancestor.hasAttribute('hidden') ||
        (ancestor.tagName.toLowerCase() === 'dialog' && !ancestor.hasAttribute('open')) ||
        (ancestor.getAttribute('role') === 'dialog' &&
          ancestor.getAttribute('aria-hidden') === 'true')
      ) {
        return false;
      }
      ancestor = ancestor.parentElement;
    }

    // In test runners (Node.js / JSDOM), elements do not have a layout box engine, so offsetWidth/Height and getBoundingClientRect() are 0 by default.
    // In real browser extension environments, visible form controls must have positive dimensions and be inside the renderable area.
    const isNodeOrJSDOM =
      (typeof globalThis !== 'undefined' && !!(globalThis as any).process?.versions?.node) ||
      (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || ''));

    if (!isNodeOrJSDOM) {
      const rect = this.element.getBoundingClientRect();

      // Off-screen honeypot checks (placed far to the left or top)
      if (rect.right < -50 || rect.bottom < -50 || rect.left < -50) {
        return false;
      }

      const hasDimensions =
        (rect.width > 0 && rect.height > 0) ||
        (this.element.offsetWidth > 0 && this.element.offsetHeight > 0) ||
        this.element.getClientRects().length > 0;

      if (!hasDimensions) {
        return false;
      }
    }

    return true;
  }

  get isInteractive(): boolean {
    const tag = this.tagName.toLowerCase();
    return (
      ['input', 'textarea', 'select', 'button'].includes(tag) ||
      this.element.getAttribute('contenteditable') === 'true'
    );
  }

  get textContent() {
    const raw = this.element as HTMLElement;
    const inner = raw.innerText;
    if (inner !== undefined && inner !== null && inner.trim().length > 0) {
      return inner;
    }
    return this.element.textContent || '';
  }

  getAttribute(name: string): string | null {
    return this.element.getAttribute(name);
  }

  getInnerText(): string {
    const raw = this.element as HTMLElement;
    const inner = raw.innerText;
    if (inner !== undefined && inner !== null && inner.trim().length > 0) {
      return inner;
    }
    return this.element.textContent || '';
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
      let proto: object | null = HTMLInputElement.prototype;
      if (this.element instanceof HTMLTextAreaElement) proto = HTMLTextAreaElement.prototype;
      const descriptor = proto ? Object.getOwnPropertyDescriptor(proto, 'value') : null;
      if (descriptor?.set) {
        descriptor.set.call(this.element, value);
      } else {
        this.element.value = value;
      }
      this.triggerEvent('input');
      this.triggerEvent('change');
    } else if (this.element instanceof HTMLSelectElement) {
      this.element.value = value;
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
