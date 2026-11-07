import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { WebPlatform } from '../src/platforms/web-platform';
import { FieldCollector } from '../src/engines/detection/field-collector';
import { LabelExtractor } from '../src/engines/detection/label-extractor';
import { CognilotSDK } from '../src/index';

describe('Choice Option Harvesting & Search Proxy Resolution', () => {
  let dom: JSDOM;
  let platform: WebPlatform;
  let extractor: LabelExtractor;
  let collector: FieldCollector;
  let sdk: CognilotSDK;

  beforeEach(() => {
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
      <body>
        <form id="cobrix-form">
          <!-- Question 2: Searchable select with search input -->
          <div class="form-group mb-4" data-field-id="field_where_do_you_live">
            <label id="lbl-location">¿Dónde vives actualmente? *</label>
            <div class="v-select relative" label="¿Dónde vives actualmente?">
              <div class="vs__dropdown-toggle">
                <div class="vs__selected-options">
                  <input placeholder="Buscar" aria-autocomplete="list" type="search" role="combobox" class="vs__search" />
                </div>
              </div>
              <ul class="vs__dropdown-menu" role="listbox">
                <li class="vs__dropdown-option" role="option">Argentina</li>
                <li class="vs__dropdown-option" role="option">Colombia</li>
                <li class="vs__dropdown-option" role="option">Perú</li>
                <li class="vs__dropdown-option" role="option">Chile</li>
              </ul>
            </div>
          </div>

          <!-- Question 3: Custom select trigger button without search input -->
          <div class="form-group mb-4" data-field-id="field_remote_availability">
            <label id="lbl-remote">¿Tienes disponibilidad para trabajar remoto full time de 9am a 6pm...? *</label>
            <div class="v-select relative vs--single" label="¿Tienes disponibilidad para trabajar remoto full time de 9am a 6pm...?">
              <button type="button" role="combobox" aria-haspopup="listbox" aria-expanded="true" class="vs__dropdown-toggle">
                <div>Selecciona una opción</div>
              </button>
              <ul class="vs__dropdown-menu" role="listbox">
                <li class="vs__dropdown-option" role="option">Sí</li>
                <li class="vs__dropdown-option" role="option">No</li>
                <li class="vs__dropdown-option" role="option">Depende del horario</li>
              </ul>
            </div>
          </div>
        </form>
      </body>
      </html>
    `,
      { url: 'https://form.cobrix.co/forms/dev-fullstack' }
    );

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
    extractor = new LabelExtractor(platform);
    collector = new FieldCollector(platform, extractor);
    sdk = new CognilotSDK({ platform });
  });

  it('should harvest options from vue-select .vs__dropdown-menu when element is active/expanded', () => {
    const button = dom.window.document.querySelector('button[aria-haspopup="listbox"]')!;
    const buttonNode = platform.wrap(button)!;

    const options = extractor.collectChoiceOptions(buttonNode);

    expect(options.length).toBe(3);
    expect(options[0].text).toBe('Sí');
    expect(options[1].text).toBe('No');
    expect(options[2].text).toBe('Depende del horario');
  });

  it('should harvest options from search input in .v-select', () => {
    const searchInput = dom.window.document.querySelector('input.vs__search')!;
    const inputNode = platform.wrap(searchInput)!;

    const options = extractor.collectChoiceOptions(inputNode);

    expect(options.length).toBe(4);
    expect(options[0].text).toBe('Argentina');
    expect(options[2].text).toBe('Perú');
  });

  it('should inherit registry entry and resolve for search proxy inputs in ActionEngine', async () => {
    // 1. Proactively scan page
    const { fields } = sdk.detection.scanAllFields();
    expect(fields.length).toBe(2);

    for (const f of fields) {
      sdk.registry.register(f);
    }

    // Set resolution for field 1 (location -> Perú)
    sdk.registry.updateResolution(fields[0].id, {
      value: 'Perú',
      options: ['Perú'],
      source: 'memory',
    });

    const searchInput = dom.window.document.querySelector('input.vs__search')!;
    const inputNode = platform.wrap(searchInput)!;

    const result = await sdk.action.handleTrigger(inputNode);

    expect(result).toBeDefined();
    expect(result.value).toBe('Perú');
    expect(result.options).toContain('Perú');
  });

  it('should trigger DecisionEngine with harvested options on custom select button click', async () => {
    const button = dom.window.document.querySelector('button[aria-haspopup="listbox"]')!;
    const buttonNode = platform.wrap(button)!;

    // Mock API client response for DecisionEngine
    vi.spyOn(sdk.apiClient, 'request').mockResolvedValueOnce({
      ok: true,
      results: {
        field_remote_availability: {
          selected_indices: [0],
          selected_values: ['Sí'],
        },
      },
      meta: { model: 'mock-llm' },
    });

    const result = await sdk.decision.handleTrigger(buttonNode);

    expect(result).toBeDefined();
    expect(result?.selected_values).toEqual(['Sí']);
    expect(result?.ghost_indices).toEqual([0]);
  });
});
