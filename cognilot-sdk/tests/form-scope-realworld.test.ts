import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { DetectionEngine } from '../src/engines/detection/detection-engine';
import { WebPlatform } from '../src/platforms/web-platform';
import { WebNode } from '../src/platforms/web-node';

describe('Real-World SPA Form Detection & Scope Resolution', () => {
  let dom: JSDOM;
  let platform: WebPlatform;
  let engine: DetectionEngine;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    globalThis.window = dom.window as any;
    globalThis.document = dom.window.document as any;
    globalThis.HTMLElement = dom.window.HTMLElement as any;
    globalThis.HTMLInputElement = dom.window.HTMLInputElement as any;
    globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement as any;
    globalThis.HTMLSelectElement = dom.window.HTMLSelectElement as any;
    globalThis.HTMLButtonElement = dom.window.HTMLButtonElement as any;
    globalThis.Node = dom.window.Node as any;
    globalThis.Event = dom.window.Event as any;

    platform = new WebPlatform();
    engine = new DetectionEngine(platform);
  });

  it('detects an SPA form inside a generic div when header/nav buttons precede it and submit button follows', () => {
    dom.window.document.body.innerHTML = `
      <header class="site-header">
        <button class="nav-button">Menú</button>
        <button class="cart-button">Carrito</button>
      </header>
      <main class="page-content">
        <nav class="breadcrumb">
          <button>Atrás</button>
        </nav>
        <div class="application-container" id="job-apply-section">
          <h2>Postula con nosotros</h2>
          <div class="form-group">
            <label for="applicant_name">Nombre completo</label>
            <input id="applicant_name" name="name" type="text" />
          </div>
          <div class="form-group">
            <label for="applicant_email">Correo electrónico</label>
            <input id="applicant_email" name="email" type="email" />
          </div>
          <div class="form-group">
            <label for="applicant_phone">Teléfono</label>
            <input id="applicant_phone" name="phone" type="tel" />
          </div>
          <div class="form-actions">
            <button type="submit" id="btn-submit">Enviar Solicitud</button>
          </div>
        </div>
      </main>
    `;

    const nameInput = dom.window.document.getElementById('applicant_name') as HTMLElement;
    const node = new WebNode(nameInput);

    const result = engine.detect(node);

    expect(result.questions.length).toBeGreaterThanOrEqual(3);
    expect(result.questions.map((q) => q.text)).toEqual(
      expect.arrayContaining(['Nombre completo', 'Correo electrónico', 'Teléfono'])
    );
    expect(result.metadata.strategy).toBe('radial-expansion');
    expect(result.is_likely_form).toBe(true);
  });

  it('detects a multi-field SPA form even if button has type="button" and no explicit form tag', () => {
    dom.window.document.body.innerHTML = `
      <div class="checkout-wrapper">
        <div class="step-card">
          <label for="ship_address">Dirección de entrega</label>
          <input id="ship_address" type="text" />

          <label for="ship_city">Ciudad</label>
          <input id="ship_city" type="text" />

          <label for="ship_zip">Código postal</label>
          <input id="ship_zip" type="text" />

          <button type="button" class="btn-primary">Continuar al pago</button>
        </div>
      </div>
    `;

    const addressInput = dom.window.document.getElementById('ship_address') as HTMLElement;
    const node = new WebNode(addressInput);

    const result = engine.detect(node);

    expect(result.questions.length).toBe(3);
    expect(result.questions.map((q) => q.text)).toEqual(
      expect.arrayContaining(['Dirección de entrega', 'Ciudad', 'Código postal'])
    );
    expect(result.metadata.strategy).toBe('radial-expansion');
  });

  it('filters out CSS-clipped honeypot inputs', () => {
    dom.window.document.body.innerHTML = `
      <form id="contact-form">
        <label for="real_email">Email</label>
        <input id="real_email" type="email" />

        <!-- Honeypot hidden via clip -->
        <label for="bot_trap">Do not fill</label>
        <input id="bot_trap" type="text" style="clip: rect(0px, 0px, 0px, 0px);" />

        <button type="submit">Enviar</button>
      </form>
    `;

    const emailInput = dom.window.document.getElementById('real_email') as HTMLElement;
    const node = new WebNode(emailInput);

    const result = engine.detect(node);

    expect(result.questions.length).toBe(1);
    expect(result.questions[0].text).toBe('Email');
  });
});
