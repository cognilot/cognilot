import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { WebNode } from '../src/platforms/web-node';

/**
 * Unit tests for WebNode.isVisible ancestor-aware visibility.
 *
 * The registry cleanup pass (PageScanner) and field detection rely on `isVisible`
 * returning false for controls that live inside hidden containers (aria-hidden
 * modals, `hidden` wrappers, closed <dialog>). These tests pin that behaviour.
 */
describe('WebNode.isVisible', () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    globalThis.window = dom.window as any;
    globalThis.document = dom.window.document as any;
    globalThis.HTMLElement = dom.window.HTMLElement as any;
    globalThis.HTMLInputElement = dom.window.HTMLInputElement as any;
    globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement as any;
    globalThis.HTMLSelectElement = dom.window.HTMLSelectElement as any;
    globalThis.Node = dom.window.Node as any;
    globalThis.Event = dom.window.Event as any;
  });

  const wrapInput = (html: string): WebNode => {
    dom.window.document.body.innerHTML = html;
    const input = dom.window.document.querySelector('input') as HTMLInputElement;
    return new WebNode(input);
  };

  it('is visible for a plain form control', () => {
    expect(wrapInput('<div><input type="text" /></div>').isVisible).toBe(true);
  });

  it('is not visible when display is none', () => {
    expect(wrapInput('<input type="text" style="display:none" />').isVisible).toBe(false);
  });

  it('is not visible when an ancestor is aria-hidden', () => {
    expect(wrapInput('<div aria-hidden="true"><input type="text" /></div>').isVisible).toBe(false);
  });

  it('is not visible when an ancestor carries the hidden attribute', () => {
    expect(wrapInput('<div hidden><input type="text" /></div>').isVisible).toBe(false);
  });

  it('is not visible inside a closed dialog', () => {
    expect(wrapInput('<dialog><input type="text" /></dialog>').isVisible).toBe(false);
  });

  it('is visible inside an open dialog', () => {
    expect(wrapInput('<dialog open><input type="text" /></dialog>').isVisible).toBe(true);
  });
});
