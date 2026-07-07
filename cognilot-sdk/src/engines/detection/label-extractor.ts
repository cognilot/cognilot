import { CognilotNode, PlatformAdapter } from '../../platforms/interface';
import { LabelUtil } from '../../core/label-util';

export interface LabelCandidate {
  text: string;
  score: number;
  source: string;
  element?: CognilotNode;
}

export interface LabelMetadata {
  label: string | null;
  labelElement?: CognilotNode | null;
  helper_text: string;
  required: boolean;
  confidence: number;
  source: string | null;
}

/**
 * LabelExtractor
 * Semantic engine for field label extraction using ranked heuristics (TIER scoring).
 * Ported from the original Cognilot JS SDK.
 */
export class LabelExtractor {
  private adapter: PlatformAdapter;

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
  }

  /**
   * RANKED LABEL EXTRACTION ENGINE
   * TIER 1 (90-100) — Formal accessibility attributes
   * TIER 2 (50-85)  — Semantic question-block container scan
   * TIER 3 (30-52)  — Ancestor-walk preceding-sibling traversal
   * TIER 4 (10-28)  — Low-confidence fallbacks
   */
  extractFieldMetadata(element: CognilotNode): LabelMetadata {
    if (!element)
      return { label: null, helper_text: '', required: false, confidence: 0, source: null };

    const candidates: LabelCandidate[] = [];
    let helperText = '';
    let required =
      element.getAttribute('required') === 'true' ||
      element.getAttribute('aria-required') === 'true' ||
      false;

    const className = element.className || '';
    if (!required && /(obligatorio|required|requerido|mandatory)/i.test(className)) {
      required = true;
    }

    const getCleanText = (el: CognilotNode) => (el.textContent || '').trim();
    const containsInteractive = (el: CognilotNode) =>
      el.querySelectorAll(
        'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]'
      ).length > 0;

    // TIER 1: Formal Accessibility
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      labelledBy.split(/\s+/).forEach((id) => {
        const doc = this.adapter.getGlobalContext().document;
        const el = doc.getElementById(id);
        if (el) {
          const node = this.adapter.wrap(el);
          if (
            node &&
            !candidates.some((c) => c.source === 'aria-labelledby' && c.text === getCleanText(node))
          ) {
            candidates.push({
              text: getCleanText(node),
              score: 100,
              source: 'aria-labelledby',
              element: node,
            });
          }
        }
      });
    }

    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      candidates.push({ text: ariaLabel.trim(), score: 95, source: 'aria-label' });
    }

    const inputId = element.id || element.getAttribute('data-Cognilot-id');
    if (inputId) {
      const doc = this.adapter.getGlobalContext().document;
      try {
        const labelEl = doc.querySelector(`label[for="${inputId}"]`);
        if (labelEl) {
          const node = this.adapter.wrap(labelEl);
          if (node) {
            const text = getCleanText(node);
            if (text) candidates.push({ text, score: 90, source: 'label-for', element: node });
          }
        }
      } catch (e) {}
    }

    const parentLabel = element.closest('label');
    if (parentLabel) {
      const text = getCleanText(parentLabel);
      if (text)
        candidates.push({ text, score: 88, source: 'implicit-label', element: parentLabel });
    }

    const fieldset = element.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) {
        const text = getCleanText(legend);
        if (text) candidates.push({ text, score: 80, source: 'legend', element: legend });
      }
    }

    const immediateWrapper = element.getParent();
    if (immediateWrapper) {
      const children = immediateWrapper.getChildren();
      const rawEl = element.getRawNode();
      const inputIndex = children.findIndex((c) => c.id === element.id || c.getRawNode() === rawEl);
      if (inputIndex > 0) {
        for (let i = 0; i < inputIndex; i++) {
          const sibling = children[i];
          if (!sibling || containsInteractive(sibling)) continue;
          const text = getCleanText(sibling);
          if (!text || text.length < 2 || text.length > 160) continue;

          const tag = sibling.tagName.toLowerCase();
          let score = 0;
          if (tag === 'label') score = 92;
          else if (tag === 'p') score = 88;
          else if (/^h[1-6]$/.test(tag)) score = 84;
          else if (tag === 'span' || tag === 'div') score = 76;

          if (text.includes('*')) {
            score += 4;
            required = true;
          }
          if (score > 0) candidates.push({ text, score, source: 'same-wrapper', element: sibling });
        }
      }
    }

    // TIER 2: Semantic Question-Block
    const questionBlockSelector =
      '[data-testid*="question"], [data-field-id], fieldset, [role="group"], .question-item, .form-field, .form-question';
    let questionBlock = element.closest(questionBlockSelector);
    while (questionBlock) {
      const possibleLabels = questionBlock.querySelectorAll(
        'p, h1, h2, h3, h4, h5, h6, legend, label, span, div'
      );
      const hasUsefulText = possibleLabels.some((el) => {
        if (el.id === element.id || el.contains(element) || containsInteractive(el)) return false;
        const txt = getCleanText(el);
        return txt && txt.length >= 2 && txt.length <= 320;
      });
      if (hasUsefulText) break;
      const parent = questionBlock.getParent();
      questionBlock = parent ? parent.closest(questionBlockSelector) : null;
    }

    if (questionBlock) {
      questionBlock
        .querySelectorAll('p, h1, h2, h3, h4, h5, h6, legend, label, span, div')
        .forEach((el) => {
          if (el.id === element.id || el.contains(element) || containsInteractive(el)) return;
          const text = getCleanText(el);
          if (!text || text.length < 2 || text.length > 300) return;

          let score = 0;
          const tag = el.tagName.toLowerCase();
          if (/^h[1-6]$/.test(tag)) score = 72;
          else if (tag === 'legend') score = 78;
          else if (tag === 'p') score = 70;
          else if (tag === 'label') score = 65;
          else score = 48;

          if (el.isBefore(element)) score += 12;
          else score -= 15;
          if (text.length >= 3 && text.length <= 80) score += 8;
          if (text.includes('*')) {
            score += 5;
            required = true;
          }

          const cls = el.getAttribute('class') || '';
          if (/HelperText|helper-text|hint|description/i.test(cls)) {
            score -= 30;
            if (!el.isBefore(element) && !helperText) helperText = this._cleanCandidateText(text);
          }

          if (score > 20) candidates.push({ text, score, source: 'question-block', element: el });
        });
    }

    // TIER 3: Ancestor Sibling Traversal
    let node = element;
    for (let depth = 0; depth < 4; depth++) {
      const parent = node.getParent();
      if (!parent || parent.tagName.toLowerCase() === 'body') break;
      node = parent;

      const interactiveCount = node.querySelectorAll(
        'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]'
      ).length;
      let sibling = node.getPreviousSibling();
      while (sibling) {
        if (containsInteractive(sibling)) {
          sibling = sibling.getPreviousSibling();
          continue;
        }
        const siblingTag = sibling.tagName.toLowerCase();
        if (interactiveCount > 1 && /^h[1-6]$/.test(siblingTag)) {
          sibling = sibling.getPreviousSibling();
          continue;
        }

        const text = getCleanText(sibling);
        if (text && text.length >= 2) {
          let baseScore = 52 - depth * 10;
          if (/^h[1-6]|section|header/i.test(siblingTag)) baseScore -= 12;
          if (baseScore > 10)
            candidates.push({
              text,
              score: baseScore,
              source: `sibling-depth-${depth}`,
              element: sibling,
            });
        }
        sibling = sibling.getPreviousSibling();
      }
    }

    // TIER 4: Fallbacks
    const titleAttr = element.getAttribute('title');
    if (titleAttr && titleAttr.trim() && titleAttr !== element.getAttribute('placeholder')) {
      candidates.push({ text: titleAttr.trim(), score: 28, source: 'title' });
    }
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && !/enter|search|type here|ingresa|buscar/i.test(placeholder)) {
      candidates.push({ text: placeholder.trim(), score: 25, source: 'placeholder' });
    }
    const nameAttr = element.getAttribute('name');
    if (nameAttr && nameAttr.length >= 2 && !/[0-9a-f]{8}-/i.test(nameAttr)) {
      const readable = nameAttr
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .trim();
      if (readable.length >= 2) candidates.push({ text: readable, score: 15, source: 'name' });
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates.find((c) => c.text && c.text.trim().length >= 2);

    return {
      label: best ? this._cleanCandidateText(best.text) : null,
      labelElement: best ? best.element || null : null,
      helper_text: helperText,
      required,
      confidence: best ? Math.min(best.score / 100, 1.0) : 0,
      source: best ? best.source : null,
    };
  }

  extractFieldLabel(element: CognilotNode): string | null {
    return this.extractFieldMetadata(element).label;
  }

  extractIframeFieldLabel(iframeEl: CognilotNode): string {
    if (!iframeEl) return '';
    const explicit = (
      iframeEl.getAttribute('aria-label') ||
      iframeEl.getAttribute('title') ||
      ''
    ).trim();
    if (explicit) return explicit;

    const stripeWrapper = iframeEl.closest('.StripeElement, .__PrivateStripeElement');
    if (stripeWrapper) {
      const parent = stripeWrapper.getParent();
      if (parent) {
        const heading = parent.querySelector('h1, h2, h3, h4, h5, h6, label');
        if (heading) return (heading.textContent || '').trim();
      }
    }

    const src = (iframeEl.getAttribute('src') || '').toLowerCase();
    if (src.includes('elements-inner-payment')) return 'Payment field';
    if (src.includes('elements-inner-address')) return 'Billing address';
    return 'Embedded form field';
  }

  private _cleanCandidateText(text: string): string {
    if (!text) return '';
    let cleaned = text
      .split('*')[0]
      .replace(/:/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    cleaned = cleaned.replace(/^\d+[\.\-\)]\s*/, '');
    cleaned = cleaned.replace(
      /\s*(Texto de una sola línea|Texto de varias líneas|Texto de una sola linea|Texto de varias lineas|Single line text|Multiple line text)\.?$/gi,
      ''
    );

    return LabelUtil.deduplicate(cleaned).trim();
  }

  public collectChoiceOptions(element: CognilotNode): any[] {
    if (element.tagName.toLowerCase() === 'select') {
      return element
        .querySelectorAll('option')
        .map((opt, i) => {
          const text = (opt.textContent || '').trim();
          const value = opt.getAttribute('value') || text;
          return { text, value, index: i };
        })
        .filter((o) => o.text && !/selecciona|elige|choose|select|n\/a|-|--/i.test(o.text));
    }
    return [];
  }

  public buildFallbackSelector(el: CognilotNode): string {
    const escape = (str: string) =>
      typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(str) : str;

    if (el.id) return `#${escape(el.id)}`;

    const CognilotId = el.getAttribute('data-Cognilot-id');
    if (CognilotId) return `[data-Cognilot-id="${escape(CognilotId)}"]`;

    if (el.name) return `[name="${escape(el.name)}"]`;

    const tag = el.tagName.toLowerCase();
    const classes = el.className
      ? String(el.className)
          .split(/\s+/)
          .filter((c) => c)
          .map((c) => `.${escape(c)}`)
          .join('')
      : '';

    return `${tag}${classes}`;
  }
}
