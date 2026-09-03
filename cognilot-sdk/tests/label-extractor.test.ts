// Vitest globals enabled in config
import { LabelExtractor } from '../src/engines/detection/label-extractor';
import { MockPlatform, MockNode } from './mocks';

describe('LabelExtractor', () => {
  const platform = new MockPlatform();
  const extractor = new LabelExtractor(platform);

  it('should extract label from aria-label', () => {
    const node = new MockNode('INPUT', '', { 'aria-label': 'Full Name' });

    const meta = extractor.extractFieldMetadata(node);
    expect(meta.label).toBe('Full Name');
    expect(meta.source).toBe('aria-label');
  });

  it('should extract label from placeholder', () => {
    const node = new MockNode('INPUT', '', { placeholder: 'Email address' });

    const meta = extractor.extractFieldMetadata(node);
    expect(meta.label).toBe('Email address');
    expect(meta.source).toBe('placeholder');
  });

  it('should extract label from siblings', () => {
    const parent = new MockNode('DIV', '', { id: 'parent' });
    const labelNode = new MockNode('LABEL', 'Email Address', { id: 'labelnode' });
    const inputNode = new MockNode('INPUT', '', { id: 'inputnode' });

    parent.appendChild(labelNode);
    parent.appendChild(inputNode);

    const meta = extractor.extractFieldMetadata(inputNode);
    expect(meta.label).toBe('Email Address');
    expect(meta.source).toBe('same-wrapper');
  });

  it('should clean asterisk and required parentheses without leaving orphaned open brackets', () => {
    const parent1 = new MockNode('DIV', '', { id: 'parent1' });
    const label1 = new MockNode('LABEL', 'Nombre (*)', { id: 'l1' });
    const input1 = new MockNode('INPUT', '', { id: 'i1' });
    parent1.appendChild(label1);
    parent1.appendChild(input1);

    expect(extractor.extractFieldMetadata(input1).label).toBe('Nombre');

    const parent2 = new MockNode('DIV', '', { id: 'parent2' });
    const label2 = new MockNode('LABEL', '¿A qué cargo aplicas? (*)', { id: 'l2' });
    const input2 = new MockNode('INPUT', '', { id: 'i2' });
    parent2.appendChild(label2);
    parent2.appendChild(input2);

    expect(extractor.extractFieldMetadata(input2).label).toBe('¿A qué cargo aplicas?');

    const parent3 = new MockNode('DIV', '', { id: 'parent3' });
    const label3 = new MockNode('LABEL', 'Correo electrónico (obligatorio):', { id: 'l3' });
    const input3 = new MockNode('INPUT', '', { id: 'i3' });
    parent3.appendChild(label3);
    parent3.appendChild(input3);

    expect(extractor.extractFieldMetadata(input3).label).toBe('Correo electrónico');

    const parent4 = new MockNode('DIV', '', { id: 'parent4' });
    const label4 = new MockNode(
      'LABEL',
      '¿A cuál oficina de Whitestack pertenece tu postulación en caso de ser seleccionado? (*)',
      { id: 'l4' }
    );
    const input4 = new MockNode('INPUT', '', { id: 'i4' });
    parent4.appendChild(label4);
    parent4.appendChild(input4);

    expect(extractor.extractFieldMetadata(input4).label).toBe(
      '¿A cuál oficina de Whitestack pertenece tu postulación en caso de ser seleccionado?'
    );
  });

  it('should extract HTML5 validation constraints (min, max, step, maxlength, pattern)', () => {
    const node = new MockNode('INPUT', '', {
      placeholder: 'Salary',
      min: '1000',
      max: '50000',
      step: '500',
      maxlength: '10',
      pattern: '[0-9]+',
    });

    const meta = extractor.extractFieldMetadata(node);
    expect(meta.min).toBe(1000);
    expect(meta.max).toBe(50000);
    expect(meta.step).toBe(500);
    expect(meta.maxlength).toBe(10);
    expect(meta.pattern).toBe('[0-9]+');
  });

  describe('buildFallbackSelector', () => {
    it('should generate standard name selector for non-array names', () => {
      const node = new MockNode('INPUT', '', { name: 'user_email' });
      expect(extractor.buildFallbackSelector(node)).toBe('[name="user_email"]');
    });

    it('should combine array name with aria-label to create unique selectors', () => {
      const node1 = new MockNode('INPUT', '', {
        name: 'user[profile_social_accounts][][url]',
        'aria-label': 'Link to social profile 1',
      });
      const node2 = new MockNode('INPUT', '', {
        name: 'user[profile_social_accounts][][url]',
        'aria-label': 'Link to social profile 2',
      });

      const sel1 = extractor.buildFallbackSelector(node1);
      const sel2 = extractor.buildFallbackSelector(node2);

      expect(sel1).toContain('Link to social profile 1');
      expect(sel2).toContain('Link to social profile 2');
      expect(sel1).not.toBe(sel2);
    });

    it('should combine array name with placeholder if aria-label is missing', () => {
      const node = new MockNode('INPUT', '', {
        name: 'items[][price]',
        placeholder: 'Enter Price',
      });
      expect(extractor.buildFallbackSelector(node)).toBe(
        '[name="items[][price]"][placeholder="Enter Price"]'
      );
    });
  });
});
