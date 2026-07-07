import { CognilotNode, PlatformAdapter } from '../../platforms/interface';
import { FieldDetectionResponse } from '../../contracts/field-detection-response';
import { LabelExtractor, LabelMetadata } from './label-extractor';
import { FormScopeResolver } from './form-scope-resolver';

/**
 * FieldCollector
 * Logic for scanning and collecting form fields, iframes, and choice groups.
 * Ported from the original Cognilot JS SDK.
 */
export class FieldCollector {
  private adapter: PlatformAdapter;
  private labelExtractor: LabelExtractor;
  private readonly signatureBase =
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="image"]), textarea, [contenteditable="true"], [role="textbox"], select';

  constructor(adapter: PlatformAdapter, labelExtractor: LabelExtractor) {
    this.adapter = adapter;
    this.labelExtractor = labelExtractor;
  }

  /**
   * Main scan for candidate fields in a given container scope.
   */
  public collectCandidateFields(
    scope: CognilotNode,
    radialContext?: any
  ): FieldDetectionResponse[] {
    const detectedFields: FieldDetectionResponse[] = [];
    const seenFieldLabels = new Set<string>();
    const root = scope || this.adapter.getRootNode();
    const processedChoiceGroups = new Set<string>();

    const baseQuery = this.signatureBase;
    const items = root.querySelectorAll(baseQuery);
    const iframes = this.findLikelyFormIframes(root);

    const inputsArray = [...items, ...iframes];

    inputsArray.forEach((element) => {
      const isIframe = element.tagName.toLowerCase() === 'iframe';
      if (!isIframe && !element.isVisible) return;

      // Skip ignored fields (placeholder for IgnoreRules)
      const isCombobox = !isIframe && element.getAttribute('role') === 'combobox'; // Simple check

      const metadata: LabelMetadata = isIframe
        ? {
            label: this.labelExtractor.extractIframeFieldLabel(element),
            labelElement: null,
            required: false,
            confidence: 0.5,
            source: 'iframe',
            helper_text: '',
          }
        : this.labelExtractor.extractFieldMetadata(element);

      const fieldLabel = metadata?.label;
      if (!fieldLabel?.trim()) return;

      const fieldRef = this.resolveFieldRefForElement(element, radialContext);
      const dedupeKey = fieldRef
        ? `ref:${fieldRef.refId}`
        : `label:${fieldLabel.toLowerCase().trim()}`;
      if (seenFieldLabels.has(dedupeKey)) return;
      seenFieldLabels.add(dedupeKey);

      let cleanType = isIframe
        ? 'iframe-input'
        : element.getAttribute('contenteditable') === 'true'
          ? 'text'
          : isCombobox
            ? 'select'
            : element.type || element.tagName.toLowerCase();

      // Choice Group Handling (Radio / Checkbox)
      if (cleanType === 'radio' || cleanType === 'checkbox') {
        const groupKey = this._resolveChoiceGroupKey(element, cleanType, root, fieldRef);
        if (processedChoiceGroups.has(groupKey)) return;
        processedChoiceGroups.add(groupKey);

        const groupElements = this._collectChoiceGroupElements(
          element,
          cleanType,
          root,
          fieldRef,
          radialContext
        );
        const groupOptions = groupElements
          .map((optEl: CognilotNode, idx: number) => {
            const val = String(optEl.value || optEl.id || '').trim() || `option_${idx + 1}`;
            const txt = (optEl.getParent()?.getInnerText() || optEl.getInnerText() || val)
              .split('\n')[0]
              .trim();
            return txt ? { text: txt, value: val, index: idx } : null;
          })
          .filter((o: any) => !!o);

        if (groupOptions.length === 0) return;

        const primary = groupElements[0] || element;
        detectedFields.push(
          this._buildFieldDTO(primary, fieldLabel, fieldRef, cleanType, groupOptions, metadata)
        );
        return;
      }

      // Select Handling
      let options: any[] = [];
      if (cleanType.startsWith('select')) {
        cleanType = 'select';
        options = this.labelExtractor.collectChoiceOptions(element);
      }

      detectedFields.push(
        this._buildFieldDTO(element, fieldLabel, fieldRef, cleanType, options, metadata)
      );
    });

    return detectedFields;
  }

  /**
   * Extracts a single field from a node, ONLY if it's a valid text-like field.
   * This is used for the Single-Field Fallback when no form container is found.
   */
  public extractSingleTextField(element: CognilotNode): FieldDetectionResponse | null {
    if (!element || !element.isVisible) return null;

    const tagName = element.tagName.toLowerCase();
    const rawType = (element.getAttribute('type') || '').toLowerCase();
    const isContentEditable = element.getAttribute('contenteditable') === 'true';
    const isTextbox = element.getAttribute('role') === 'textbox';
    const isTextarea = tagName === 'textarea';
    const isInput = tagName === 'input';

    // Restriction: only text-like fields (no radio, checkbox, select, file)
    const textTypes = ['text', 'email', 'password', 'tel', 'url', 'number', 'search', ''];
    const isTextLike =
      (isInput && textTypes.includes(rawType)) || isTextarea || isContentEditable || isTextbox;

    if (!isTextLike) return null;

    const metadata = this.labelExtractor.extractFieldMetadata(element);
    const label = metadata?.label;
    if (!label?.trim()) return null;

    const cleanType = isContentEditable || isTextbox || isTextarea ? 'text' : rawType || 'text';

    return this._buildFieldDTO(element, label, null, cleanType, [], metadata);
  }

  private _buildFieldDTO(
    el: CognilotNode,
    label: string,
    fieldRef: any,
    type: string,
    options: any[],
    metadata: LabelMetadata
  ): FieldDetectionResponse {
    return {
      text: label,
      type: type,
      placeholder: el.getAttribute('placeholder') || '',
      options: options,
      id: el.id || '',
      name: el.name || '',
      tagName: el.tagName,
      required: metadata.required,
      ref_id: fieldRef ? fieldRef.refId : '',
      section_ref_id: (fieldRef && fieldRef.sectionRefId) || '',
      metadata: metadata,
      selector: this.labelExtractor.buildFallbackSelector(el),
      node: el,
    };
  }

  public collectFieldBlocks(container: CognilotNode, seedElement: CognilotNode): any[] {
    const inputs = [
      ...container.querySelectorAll(this.signatureBase),
      ...this.findLikelyFormIframes(container),
    ].filter((el) => el.isVisible || el.tagName.toLowerCase() === 'iframe');
    if (inputs.length === 0) return [];

    const blockSet = new Set<any>();
    const blocks: any[] = [];
    const resolver = new FormScopeResolver(this.adapter);

    const seedBlock = this.findNearestFieldBlock(seedElement, container);
    const seedSig = seedBlock ? resolver.buildStructuralSignature(seedBlock) : '';

    inputs.forEach((input) => {
      const isIframe = input.tagName.toLowerCase() === 'iframe';
      const block = this.findNearestFieldBlock(input, container);
      if (!block || blockSet.has(block.getRawNode())) return;
      blockSet.add(block.getRawNode());

      const sig = resolver.buildStructuralSignature(block);
      const similarity = this.computeSignatureSimilarity(seedSig, sig);
      const fieldCount = block.querySelectorAll(this.signatureBase + ', iframe').length;

      if (
        (fieldCount <= 12 && (similarity >= 0.5 || fieldCount <= 2)) ||
        (isIframe && fieldCount <= 3)
      ) {
        blocks.push({ block, signature: sig, similarity, isIframe, refId: '' });
      }
    });

    blocks
      .sort((a, b) => b.similarity - a.similarity)
      .forEach((item, idx) => {
        item.refId = `field-${idx + 1}`;
      });
    return blocks;
  }

  public collectSectionRefs(container: CognilotNode, fieldBlocks: any[]): any[] {
    const byParent = new Map<any, any[]>();
    fieldBlocks.forEach((f) => {
      const p = f.block?.getParent();
      if (!p || p.getRawNode() === container.getRawNode()) return;
      if (!byParent.has(p.getRawNode())) byParent.set(p.getRawNode(), []);
      byParent.get(p.getRawNode())?.push(f);
    });
    const sections: any[] = [];
    let idx = 1;
    byParent.forEach((fields, elRaw) => {
      if (fields.length < 2) return;
      const refId = `section-${idx++}`;
      sections.push({ refId, sectionEl: this.adapter.wrap(elRaw), fieldCount: fields.length });
      fields.forEach((f) => {
        f.sectionRefId = refId;
      });
    });
    return sections;
  }

  public resolveFieldRefForElement(element: CognilotNode, radialContext: any): any {
    if (!radialContext?.fieldRefs || !element) return null;
    let best: { refId: string; sectionRefId: string | null; depth: number } | null = null;

    for (const f of radialContext.fieldRefs) {
      if (!f.block?.contains(element)) continue;
      const depth = this.getNodeDepth(element, f.block);
      if (!best || depth < best.depth) {
        best = { refId: f.refId, sectionRefId: f.sectionRefId || null, depth };
      }
    }
    return best;
  }

  public findNearestFieldBlock(element: CognilotNode, boundary: CognilotNode): CognilotNode | null {
    let node: CognilotNode | null = element;
    const rootRaw = boundary.getRawNode();
    const bodyRaw = this.adapter.getRootNode()?.getRawNode();

    while (node && node.getRawNode() !== rootRaw && node.getRawNode() !== bodyRaw) {
      const count = node.querySelectorAll(this.signatureBase).length;
      if (count >= 1 && count <= 12) return node;
      node = node.getParent();
    }
    return boundary || null;
  }

  public computeSignatureSimilarity(sig1: string, sig2: string): number {
    if (!sig1 || !sig2) return 0;
    if (sig1 === sig2) return 1;
    const p1 = new Set(sig1.split('.')),
      p2 = new Set(sig2.split('.'));
    let inter = 0;
    p1.forEach((p) => {
      if (p2.has(p)) inter++;
    });
    const union = new Set([...p1, ...p2]).size;
    return union === 0 ? 0 : inter / union;
  }

  private getNodeDepth(node: CognilotNode, ancestor: CognilotNode): number {
    let d = 0;
    let curr: CognilotNode | null = node;
    const ancRaw = ancestor.getRawNode();
    while (curr && curr.getRawNode() !== ancRaw) {
      d++;
      curr = curr.getParent();
    }
    return d;
  }

  public findLikelyFormIframes(scope: CognilotNode): CognilotNode[] {
    return scope.querySelectorAll('iframe').filter((el) => {
      const src = (el.getAttribute('src') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      const name = (el.getAttribute('name') || '').toLowerCase();
      return (
        el.isVisible &&
        (src.includes('stripe') ||
          name.includes('stripe') ||
          /card|payment|billing|address|checkout/i.test(title))
      );
    });
  }

  private _resolveChoiceGroupKey(
    el: CognilotNode,
    type: string,
    root: CognilotNode,
    fieldRef: any
  ) {
    const name = String(el.name || '').trim();
    if (name) return `${type}|name:${name}`;
    if (fieldRef?.refId) return `${type}|ref:${fieldRef.refId}`;
    const group = el.closest('fieldset, [role="group"]');
    if (group) return `${type}|group:${this.labelExtractor.buildFallbackSelector(group)}`;
    return `${type}|single:${this.labelExtractor.buildFallbackSelector(el)}`;
  }

  private _collectChoiceGroupElements(
    el: CognilotNode,
    type: string,
    root: CognilotNode,
    fieldRef: any,
    radialContext: any
  ) {
    const name = String(el.name || '').trim();
    if (name) return root.querySelectorAll(`input[type="${type}"][name="${name}"]`);
    if (fieldRef?.refId) {
      const block = radialContext?.fieldRefs.find((f: any) => f.refId === fieldRef.refId)?.block;
      if (block) return block.querySelectorAll(`input[type="${type}"]`);
    }
    return [el];
  }
}
