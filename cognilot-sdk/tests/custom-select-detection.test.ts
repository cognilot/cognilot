import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { WebPlatform } from '../src/platforms/web-platform';
import { FieldCollector } from '../src/engines/detection/field-collector';
import { LabelExtractor } from '../src/engines/detection/label-extractor';
import { DetectionEngine } from '../src/engines/detection/detection-engine';

describe('Custom Select & Dropdown Detection (Cobrix / OpnForm / Nuxt UI)', () => {
  let dom: JSDOM;
  let platform: WebPlatform;
  let extractor: LabelExtractor;
  let collector: FieldCollector;
  let engine: DetectionEngine;

  beforeEach(() => {
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
      <body>
        <form id="job-application-form">
          <!-- Text input -->
          <div class="form-group mb-4">
            <label id="lbl-name">Indica cómo quieres que nos dirijamos a ti. *</label>
            <input type="text" id="input-name" placeholder="Ej. Ana, ella / Carlos, él" name="dirigir" aria-labelledby="lbl-name" />
          </div>

          <!-- Cobrix / OpnForm custom dropdown with aria-haspopup="listbox" and .v-select[label] -->
          <div class="form-group mb-4">
            <label id="listbox-label-location">¿Dónde vives actualmente? *</label>
            <div class="v-select relative" dusk="d36301c2-location" label="¿Dónde vives actualmente?">
              <button type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="listbox-label-location" class="cursor-pointer">
                <div>Selecciona una opción</div>
              </button>
            </div>
          </div>

          <!-- Reka UI / Radix Vue select trigger with data-reka-select-trigger -->
          <div class="form-group mb-4">
            <label for="remote-select">¿Tienes disponibilidad para trabajar remoto full-time en horario compatible con Venezuela? *</label>
            <div class="v-select relative" label="¿Tienes disponibilidad para trabajar remoto full-time en horario compatible con Venezuela?">
              <button type="button" id="remote-select" role="combobox" aria-haspopup="listbox" data-reka-select-trigger="" aria-expanded="false" class="cursor-pointer">
                <div>Selecciona una opción</div>
              </button>
            </div>
          </div>

          <!-- Dropdown with associated native select in container -->
          <div class="form-group mb-4">
            <label for="experience-select">¿Cuál de las siguientes afirmaciones describe mejor tu experiencia como desarrollador/a full-stack? *</label>
            <div class="v-select relative">
              <select id="experience-select" class="sr-only" aria-hidden="true" tabindex="-1">
                <option value="">Selecciona una opción</option>
                <option value="junior">Junior (1-2 años)</option>
                <option value="mid">Mid-level (3-5 años)</option>
                <option value="senior">Senior (5+ años)</option>
              </select>
              <button type="button" aria-haspopup="listbox" aria-expanded="false" class="cursor-pointer">
                <div>Selecciona una opción</div>
              </button>
            </div>
          </div>

          <!-- Textarea -->
          <div class="form-group mb-4">
            <label id="lbl-bio">Cuéntanos brevemente sobre ti *</label>
            <textarea id="textarea-bio" name="bio" aria-labelledby="lbl-bio"></textarea>
          </div>
        </form>
      </body>
      </html>
    `,
      { url: 'https://form.cobrix.co/forms/test-job' }
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
    engine = new DetectionEngine(platform);
  });

  it('should detect custom select buttons via FieldCollector.collectCandidateFields', () => {
    const formEl = dom.window.document.getElementById('job-application-form')!;
    const rootNode = platform.wrap(formEl)!;

    const fields = collector.collectCandidateFields(rootNode);

    expect(fields.length).toBe(5);

    // 1. Text input
    expect(fields[0].type).toBe('text');
    expect(fields[0].text).toContain('Indica cómo quieres');

    // 2. Cobrix / OpnForm button[aria-haspopup="listbox"]
    expect(fields[1].type).toBe('select');
    expect(fields[1].text).toContain('Dónde vives actualmente');

    // 3. Reka UI combobox button
    expect(fields[2].type).toBe('select');
    expect(fields[2].text).toContain('disponibilidad para trabajar remoto');

    // 4. Custom select with native options
    expect(fields[3].type).toBe('select');
    expect(fields[3].text).toContain('afirmaciones describe mejor tu experiencia');
    expect(fields[3].options.length).toBe(3);
    expect(fields[3].options[0].text).toBe('Junior (1-2 años)');
    expect(fields[3].options[1].text).toBe('Mid-level (3-5 años)');
    expect(fields[3].options[2].text).toBe('Senior (5+ años)');

    // 5. Textarea
    expect(fields[4].type).toBe('textarea');
    expect(fields[4].text).toContain('Cuéntanos brevemente sobre ti');
  });

  it('should register custom select fields in scanAllFields and assign belongsToForm', () => {
    const scanResult = engine.scanAllFields();

    expect(scanResult.fields.length).toBe(5);

    const selectFields = scanResult.fields.filter((f) => f.type === 'select');
    expect(selectFields.length).toBe(3);

    expect(scanResult.formScopes.length).toBeGreaterThanOrEqual(1);
    expect(selectFields.every((f) => f.belongsToForm)).toBe(true);
  });

  it('should extract label from container [label] attribute when child button has no text', () => {
    const vSelect = dom.window.document.querySelector('.v-select[label*="Dónde vives"]')!;
    const button = vSelect.querySelector('button')!;
    const buttonNode = platform.wrap(button)!;

    const meta = extractor.extractFieldMetadata(buttonNode);
    expect(meta.label).toContain('Dónde vives actualmente');
  });
});
