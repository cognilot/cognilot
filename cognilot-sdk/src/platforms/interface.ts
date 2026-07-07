/**
 * CognilotNode
 * A platform-agnostic wrapper for an element in a UI tree.
 * This allows the detection engines to run without direct dependency on HTMLElement.
 */
export interface CognilotNode {
  readonly platform: 'web' | 'mobile';
  readonly tagName: string;
  readonly type?: string; // e.g., 'text', 'password', 'radio'
  readonly id?: string;
  readonly name?: string;
  readonly className?: string;
  readonly value?: string;
  readonly isVisible: boolean;
  readonly isInteractive: boolean;
  readonly textContent?: string;

  getAttribute(name: string): string | null;
  getInnerText(): string;
  getStyle(prop: string): string;
  getParent(): CognilotNode | null;
  getChildren(): CognilotNode[];

  // Traversal helpers
  querySelector(selector: string): CognilotNode | null;
  querySelectorAll(selector: string): CognilotNode[];
  closest(selector: string): CognilotNode | null;
  contains(other: CognilotNode): boolean;

  // Sibling traversal (essential for labels)
  getNextSibling(): CognilotNode | null;
  getPreviousSibling(): CognilotNode | null;

  // Document order
  isBefore(other: CognilotNode): boolean; // Replaces compareDocumentPosition

  // Interaction
  setValue(value: string): Promise<void>;
  click(): Promise<void>;
  triggerEvent(name: string): void;

  // Raw access for platform-specific edge cases (use sparingly)
  getRawNode<T>(): T;
}

/**
 * PlatformAdapter
 * Interface for environment-specific operations.
 */
export interface PlatformAdapter {
  readonly identifier: string;

  // Node Factory
  wrap(element: any): CognilotNode | null;
  getRootNode(): CognilotNode | null;

  // Utilities
  getComputedStyle(node: CognilotNode): Record<string, string>;
  evaluateXPath(xpath: string, context: CognilotNode): CognilotNode[];

  // Global context access
  getGlobalContext(): {
    location: { hostname: string; pathname: string; href: string };
    title: string;
    document: any;
  };
}
