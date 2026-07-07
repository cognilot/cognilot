import { vi } from 'vitest';
import type { CognilotNode, PlatformAdapter } from '../src/platforms/interface';

export class MockNode implements CognilotNode {
  readonly platform = 'web' as const;
  tagName: string;
  type?: string;
  id?: string;
  name?: string;
  className?: string;
  value?: string;
  isVisible = true;
  isInteractive = true;

  get textContent(): string {
    return this.getInnerText();
  }
  set textContent(val: string) {
    this._textContent = val;
  }
  private _textContent?: string;

  attributes: Record<string, string> = {};
  parent: MockNode | null = null;
  children: MockNode[] = [];
  styles: Record<string, string> = {};

  constructor(tag: string, text = '', attrs: Record<string, string> = {}) {
    this.tagName = tag.toUpperCase();
    this._textContent = text;
    this.attributes = { ...attrs };
    this.id = attrs.id || this.attributes.id;
    this.name = attrs.name || this.attributes.name;
    this.type = attrs.type || this.attributes.type;
    this.className = attrs.class || this.attributes.class;
    this.value = attrs.value || this.attributes.value;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] || null;
  }

  getInnerText(): string {
    if (this._textContent) return this._textContent;
    return this.children
      .map((c) => c.getInnerText())
      .join(' ')
      .trim();
  }

  getStyle(prop: string): string {
    return this.styles[prop] || '';
  }

  getParent(): CognilotNode | null {
    return this.parent;
  }

  getChildren(): CognilotNode[] {
    return this.children;
  }

  // Improved matching for complex CSS selectors
  private matches(selector: string): boolean {
    const s = selector.toLowerCase().trim();
    if (s === '*' || s === '') return true;

    // 1. Handle multiple selectors (comma separated)
    if (s.includes(',')) {
      return s.split(',').some((part) => this.matches(part));
    }

    // 2. Handle :not() recursively
    if (s.includes(':not(')) {
      const parts = s.split(':not(');
      const base = parts[0].trim();
      if (base && !this.matches(base)) return false;

      for (let i = 1; i < parts.length; i++) {
        const closingIdx = parts[i].indexOf(')');
        const notSelector = parts[i].slice(0, closingIdx);
        if (this.matches(notSelector)) return false;

        // Check if there's more after the ) (like another selector or attr)
        const remaining = parts[i].slice(closingIdx + 1).trim();
        if (remaining && !this.matches(remaining)) return false;
      }
      return true;
    }

    // 3. Handle attribute selectors [attr="val"] or [attr*="val"]
    if (s.includes('[')) {
      // Match tag part if first
      const tagMatch = s.match(/^[a-z0-9*]+/i);
      const tag = tagMatch ? tagMatch[0].toUpperCase() : '';
      if (tag && tag !== '*' && this.tagName !== tag) return false;

      const attrMatches = s.match(/\[([^\]]+)\]/g);
      if (attrMatches) {
        for (const am of attrMatches) {
          const expr = am.slice(1, -1);
          if (expr.includes('*=')) {
            const [k, v] = expr.split('*=').map((x) => x.replace(/["']/g, '').trim());
            if (!(this.getAttribute(k) || '').toLowerCase().includes(v.toLowerCase())) return false;
          } else if (expr.includes('=')) {
            const [k, v] = expr.split('=').map((x) => x.replace(/["']/g, '').trim());
            const actualValue = (this.getAttribute(k) || '').toLowerCase();
            if (actualValue !== v.toLowerCase()) return false;
          } else {
            if (this.getAttribute(expr) === null) return false;
          }
        }
      }
      return true;
    }

    // 4. Base Case: Tag name
    return this.tagName === s.toUpperCase();
  }

  querySelector(selector: string): CognilotNode | null {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      if (this.id === id) return this;
      for (const child of this.children) {
        const found = child.querySelector(selector);
        if (found) return found;
      }
      return null;
    }

    if (this.matches(selector)) return this;
    for (const child of this.children) {
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(selector: string): CognilotNode[] {
    const results: CognilotNode[] = [];
    const walk = (node: MockNode) => {
      if (node.matches(selector)) results.push(node);
      for (const child of node.children) {
        walk(child);
      }
    };
    for (const child of this.children) {
      walk(child);
    }
    return results;
  }

  closest(selector: string): CognilotNode | null {
    let current: MockNode | null = this;
    while (current) {
      if (current.matches(selector)) return current;
      current = current.parent;
    }
    return null;
  }

  contains(other: CognilotNode): boolean {
    let current: MockNode | null = other as MockNode;
    while (current) {
      if (current === this) return true;
      current = current.parent;
    }
    return false;
  }

  getNextSibling(): CognilotNode | null {
    if (!this.parent) return null;
    const idx = this.parent.children.indexOf(this);
    return this.parent.children[idx + 1] || null;
  }

  getPreviousSibling(): CognilotNode | null {
    if (!this.parent) return null;
    const idx = this.parent.children.indexOf(this);
    return this.parent.children[idx - 1] || null;
  }

  isBefore(other: CognilotNode): boolean {
    return true;
  }

  setValue = vi.fn().mockResolvedValue(undefined);
  click = vi.fn().mockResolvedValue(undefined);
  triggerEvent = vi.fn();

  getRawNode<T>(): T {
    return this as unknown as T;
  }

  appendChild(node: MockNode) {
    node.parent = this;
    this.children.push(node);
    return node;
  }
}

export class MockPlatform implements PlatformAdapter {
  readonly identifier = 'mock';
  private root: MockNode | null = null;

  globalContext: any;

  constructor() {
    this.globalContext = {
      location: {
        hostname: 'localhost',
        pathname: '/',
        href: 'http://localhost/',
      },
      title: 'Mock Page',
      document: {
        getElementById: (id: string) => {
          if (!this.root) return null;
          return this.root.querySelector(`#${id}`);
        },
        querySelector: (selector: string) => {
          if (!this.root) return null;
          return this.root.querySelector(selector);
        },
      },
    };
  }

  wrap(element: any): CognilotNode | null {
    return element as CognilotNode;
  }

  setRoot(node: MockNode) {
    this.root = node;
  }

  getRootNode(): CognilotNode | null {
    return this.root;
  }

  getComputedStyle(node: CognilotNode): Record<string, string> {
    return (node as MockNode).styles;
  }

  evaluateXPath(xpath: string, context: CognilotNode): CognilotNode[] {
    return [];
  }

  getGlobalContext() {
    return this.globalContext;
  }
}

export class MockSDK {
  public platform: PlatformAdapter;
  public detection: any;
  public suggestion: any;
  public apiClient: any;
  public alias: any;
  public profile: any;
  public adapters: any;
  public registry: any;
  public decision: any;

  constructor(platform: PlatformAdapter) {
    this.platform = platform;
    this.detection = {
      lastResult: null,
      detect: vi.fn().mockResolvedValue({ questions: [] }),
      getFieldMetadata: vi.fn(),
    };
    this.suggestion = {
      handleTrigger: vi.fn(),
    };
    this.decision = {
      handleDecision: vi.fn(),
      _resolveBestOption: vi.fn(),
    };
    this.apiClient = {
      request: vi.fn().mockResolvedValue({ ok: true }),
    };
    this.alias = {
      resolve: vi.fn().mockResolvedValue({ success: false }),
      persistAlias: vi.fn().mockResolvedValue(undefined),
      clearSyncQueue: vi.fn(),
    };
    this.profile = {
      resolve: vi.fn().mockResolvedValue({ success: false }),
      updateFromStandardizedData: vi.fn(),
    };
    this.adapters = {
      storage: { get: vi.fn().mockResolvedValue({}), set: vi.fn() },
      settings: { getSettings: vi.fn().mockResolvedValue({}) },
      auth: { getActiveProfile: vi.fn().mockResolvedValue({}) },
    };
    this.registry = {
      findByNode: vi.fn().mockReturnValue(undefined),
      register: vi.fn(),
      updateResolution: vi.fn(),
      getPendingFieldsByFormScope: vi.fn().mockReturnValue([]),
      getAllFields: vi.fn().mockReturnValue([]),
    };
  }
}
