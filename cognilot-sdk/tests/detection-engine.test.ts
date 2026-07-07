import { describe, it, expect, beforeEach } from 'vitest';
import { DetectionEngine } from '../src/engines/detection/detection-engine';
import { MockPlatform, MockNode } from './mocks';

describe('DetectionEngine - Single-Field Fallback', () => {
  let platform: MockPlatform;
  let engine: DetectionEngine;

  beforeEach(() => {
    platform = new MockPlatform();
    engine = new DetectionEngine(platform);
  });

  it('should trigger radial expansion when a seed (input) is provided as scope', () => {
    // Arrange: Input inside a form
    const form = new MockNode('FORM');
    const input = new MockNode('INPUT', '', { name: 'email_address', id: 'email-1' });
    const label = new MockNode('LABEL', 'Email Address');
    const button = new MockNode('BUTTON', 'Submit');

    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(button);
    platform.setRoot(form);

    // Act
    const result = engine.detect(input);

    // Assert
    expect(result.questions).toHaveLength(1);
    // It found the form via expansion
    expect(result.metadata.strategy).toBe('radial-expansion');
    expect(result.metadata.is_virtual_form).toBeFalsy();
  });

  it('should fallback to single-field detection when an isolated input is provided', () => {
    // Arrange: Isolated input
    const input = new MockNode('INPUT', '', {
      name: 'full_name',
      placeholder: 'Your Full Name',
      id: 'user-1',
    });
    platform.setRoot(input);

    // Act
    const result = engine.detect(input);

    // Assert
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].text).toBe('Your Full Name');
    expect(result.metadata.strategy).toBe('single-field-fallback');
    expect(result.metadata.is_virtual_form).toBe(true);
    expect(result.metadata.isolated_field).toBe(true);
  });

  it('should NOT fallback for non-text fields (e.g. radio)', () => {
    // Arrange: Isolated radio
    const radio = new MockNode('INPUT', '', { type: 'radio', name: 'option1', id: 'r1' });
    platform.setRoot(radio);

    // Act
    const result = engine.detect(radio);

    // Assert
    expect(result.questions).toHaveLength(0);
    expect(result.metadata.strategy).toBe('none');
  });
});
