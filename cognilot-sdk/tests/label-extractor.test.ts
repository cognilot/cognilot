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
});
