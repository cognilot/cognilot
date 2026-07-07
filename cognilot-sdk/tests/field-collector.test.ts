// Vitest globals enabled in config
import { FieldCollector } from '../src/engines/detection/field-collector';
import { LabelExtractor } from '../src/engines/detection/label-extractor';
import { MockPlatform, MockNode } from './mocks';

describe('FieldCollector', () => {
  const platform = new MockPlatform();
  const extractor = new LabelExtractor(platform);
  const collector = new FieldCollector(platform, extractor);

  it('should collect typical text inputs from a container', () => {
    // 1. Arrange
    const container = new MockNode('DIV');
    const input1 = new MockNode('INPUT', '', {
      name: 'first_name',
      placeholder: 'First Name',
    });
    const input2 = new MockNode('INPUT', '', {
      name: 'last_name',
      placeholder: 'Last Name',
    });
    const select = new MockNode('SELECT', '', { name: 'gender' });

    container.children = [input1, input2, select];
    input1.parent = container;
    input2.parent = container;
    select.parent = container;

    platform.setRoot(container);

    // 2. Act
    const results = collector.collectCandidateFields(container);

    // 3. Assert
    expect(results).toHaveLength(3);
    expect(results[0].text).toBe('First Name');
    expect(results[1].text).toBe('Last Name');
    expect(results[2].tagName).toBe('SELECT');
  });

  it('should ignore hidden inputs', () => {
    // 1. Arrange
    const container = new MockNode('DIV');
    const visible = new MockNode('INPUT', '', {
      name: 'email',
      'aria-label': 'Email',
    });
    const hidden = new MockNode('INPUT', '', { name: 'token', type: 'hidden' });
    const notVisible = new MockNode('INPUT', '', { name: 'invisible' });
    (notVisible as any).isVisible = false;

    container.children = [visible, hidden, notVisible];
    visible.parent = container;
    hidden.parent = container;
    notVisible.parent = container;

    platform.setRoot(container);

    // 2. Act
    const results = collector.collectCandidateFields(container);

    // 3. Assert
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('Email');
  });

  it('should handle choice groups like radio buttons', () => {
    // 1. Arrange
    const container = new MockNode('DIV');
    const radio1 = new MockNode('INPUT', '', {
      name: 'plan',
      type: 'radio',
      value: 'free',
    });
    const radio2 = new MockNode('INPUT', '', {
      name: 'plan',
      type: 'radio',
      value: 'pro',
    });
    const parent1 = new MockNode('LABEL', 'Free Plan');
    const parent2 = new MockNode('LABEL', 'Pro Plan');

    parent1.children = [radio1];
    parent2.children = [radio2];
    radio1.parent = parent1;
    radio2.parent = parent2;

    container.children = [parent1, parent2];
    parent1.parent = container;
    parent2.parent = container;

    // We also need to mock aria-label or something for the group itself if label extractor needs it
    radio1.attributes['aria-label'] = 'Subscription Plan';

    platform.setRoot(container);

    // 2. Act
    const results = collector.collectCandidateFields(container);

    // 3. Assert
    // Radio buttons with same name should be grouped into one field result
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('radio');
    expect(results[0].options).toHaveLength(2);
    expect(results[0].options[0].text).toBe('Free Plan');
    expect(results[0].options[1].text).toBe('Pro Plan');
  });
});
