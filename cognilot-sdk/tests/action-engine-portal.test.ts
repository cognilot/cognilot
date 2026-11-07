import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { WebPlatform } from '../src/platforms/web-platform';
import { FieldRegistry } from '../src/core/field-registry';
import { ActionEngine } from '../src/engines/action/action-engine';

/**
 * Unit tests for the ActionEngine "search proxy inside a portal" resolution path.
 *
 * Custom selects (Headless UI / Radix / Reka / Nuxt UI) render their search input
 * inside a portal that is detached from the trigger button. The DOM link between
 * them is `aria-controls` on the trigger pointing at the listbox. This suite pins
 * the behaviour that the proxy input inherits the trigger's registry entry.
 */
describe('ActionEngine — portal search proxy resolution', () => {
  let dom: JSDOM;
  let platform: WebPlatform;
  let registry: FieldRegistry;
  let engine: ActionEngine;

  beforeEach(() => {
    dom = new JSDOM(`<!DOCTYPE html><html><body>
      <input id="trigger" type="search" placeholder="Selecciona" aria-controls="listbox-1" />
      <div id="portal" role="dialog">
        <ul role="listbox" id="listbox-1">
          <input id="proxy" type="search" placeholder="Buscar" />
          <li role="option">Perú</li>
        </ul>
      </div>
    </body></html>`);

    globalThis.window = dom.window as any;
    globalThis.document = dom.window.document as any;
    globalThis.HTMLElement = dom.window.HTMLElement as any;
    globalThis.HTMLInputElement = dom.window.HTMLInputElement as any;
    globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement as any;
    globalThis.HTMLSelectElement = dom.window.HTMLSelectElement as any;
    globalThis.HTMLButtonElement = dom.window.HTMLButtonElement as any;
    globalThis.Node = dom.window.Node as any;
    globalThis.Event = dom.window.Event as any;
    globalThis.CSS = { escape: (s: string) => s } as any;

    platform = new WebPlatform();
    registry = new FieldRegistry();
    engine = new ActionEngine({ platform, registry } as any);
  });

  it('inherits the registry entry of the aria-controls trigger when the proxy input lives in a portal', async () => {
    const triggerEl = dom.window.document.getElementById('trigger') as HTMLInputElement;

    registry.register({
      id: 'field-location',
      type: 'text',
      tagName: 'INPUT',
      name: 'location',
      text: '¿Dónde vives actualmente?',
      placeholder: '',
      required: false,
      options: ['Perú'],
      ref_id: '',
      section_ref_id: '',
      metadata: { label: '¿Dónde vives actualmente?' } as any,
      selector: '#trigger',
      node: platform.wrap(triggerEl)!,
      belongsToForm: false,
      resolution: { value: 'Perú', options: ['Perú'], source: 'memory' },
      status: 'resolved',
    });

    const proxyEl = dom.window.document.getElementById('proxy') as HTMLInputElement;
    const proxyNode = platform.wrap(proxyEl)!;

    const result: any = await engine.handleTrigger(proxyNode);

    expect(result.success).toBe(true);
    expect(result.value).toBe('Perú');
    expect(result.options).toContain('Perú');
  });
});
