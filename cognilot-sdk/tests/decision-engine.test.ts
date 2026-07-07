// Vitest globals enabled in config
import { DecisionEngine } from '../src/engines/autocomplete/decision-engine';
import { MockSDK, MockNode, MockPlatform } from './mocks';

describe('DecisionEngine', () => {
  let sdk: MockSDK;
  let engine: DecisionEngine;

  beforeEach(() => {
    sdk = new MockSDK(new MockPlatform());
    engine = new DecisionEngine(sdk as any);
  });

  it('should select an option in a SELECT element (simulated success)', async () => {
    // 1. Arrange
    const select = new MockNode('SELECT', '', { name: 'country', id: 'select-1' });
    const opt1 = new MockNode('OPTION', 'United States', { value: 'US' });
    const opt2 = new MockNode('OPTION', 'Spain', { value: 'ES' });
    select.appendChild(opt1);
    select.appendChild(opt2);

    // Mock detection result so engine "sees" the node
    (sdk.detection.detect as any).mockResolvedValue({
      questions: [
        {
          id: 'select-1',
          node: select,
          text: 'Country',
          type: 'select',
          options: [
            { text: 'United States', value: 'US' },
            { text: 'Spain', value: 'ES' },
          ],
        },
      ],
    });

    // Mock API response for the decision
    (sdk.apiClient.request as any).mockResolvedValue({
      ok: true,
      results: {
        'select-1': { selected_indices: [1], selected_values: ['ES'] },
      },
    });

    // 2. Act
    const result = await engine.handleTrigger(select);

    // 3. Assert
    expect(result).toBeDefined();
    expect((result as any).selected_values).toContain('ES');
  });

  it('should return null when API fails (Error 500)', async () => {
    // 1. Arrange
    const select = new MockNode('SELECT', '', { name: 'plan', id: 'id-2' });

    (sdk.detection.detect as any).mockResolvedValue({
      questions: [{ id: 'id-2', node: select, text: 'Plan', options: [{ value: 'free' }] }],
    });

    // Mock API failure
    (sdk.apiClient.request as any).mockResolvedValue({ ok: false });

    // 2. Act
    const result = await engine.handleTrigger(select);

    // 3. Assert
    expect(result).toBeNull();
  });

  it('should refuse to handle non-choice fields', async () => {
    // 1. Arrange
    const textInput = new MockNode('INPUT', '', { type: 'text', name: 'user' });

    // 2. Act
    const result = await engine.handleTrigger(textInput);

    // 3. Assert
    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('handles only choices');
  });
});
