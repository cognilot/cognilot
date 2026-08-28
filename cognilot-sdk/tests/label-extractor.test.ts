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
