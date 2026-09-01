import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isResolvableFieldType } from '../src/contracts/field-registry-entry';
import { DecisionEngine } from '../src/engines/autocomplete/decision-engine';
import { SuggestionEngine } from '../src/engines/autocomplete/suggestion-engine';
import { ActionEngine } from '../src/engines/action/action-engine';
import { MockSDK, MockNode, MockPlatform } from './mocks';

describe('Autocomplete & Combobox On-Demand AI Resolution', () => {
  let sdk: MockSDK;
  let decisionEngine: DecisionEngine;
  let actionEngine: ActionEngine;

  beforeEach(() => {
    sdk = new MockSDK(new MockPlatform());
    decisionEngine = new DecisionEngine(sdk as any);
    actionEngine = new ActionEngine(sdk as any);
    sdk.decision = decisionEngine;
  });

  it('should treat autocomplete as a resolvable field type in contracts', () => {
    expect(isResolvableFieldType('autocomplete')).toBe(true);
    expect(isResolvableFieldType('text')).toBe(true);
    expect(isResolvableFieldType('search')).toBe(false);
  });

  it('should extract live options from a portal listbox for role="combobox"', () => {
    // 1. Arrange a Material-UI style combobox
    const input = new MockNode('INPUT', '', {
      id: 'country-input',
      role: 'combobox',
      'aria-expanded': 'true',
      'aria-controls': 'country-input-listbox',
    });

    const listbox = new MockNode('UL', '', {
      id: 'country-input-listbox',
      role: 'listbox',
    });
    const opt1 = new MockNode('LI', 'Colombia', { role: 'option', 'data-value': 'CO' });
    const opt2 = new MockNode('LI', 'United States', { role: 'option', 'data-value': 'US' });
    const opt3 = new MockNode('LI', 'Spain', { role: 'option', 'data-value': 'ES' });
    listbox.appendChild(opt1);
    listbox.appendChild(opt2);
    listbox.appendChild(opt3);

    // Attach to mock DOM document
    const doc = (sdk.platform.getGlobalContext() as any).document;
    doc.getElementById = (id: string) => {
      if (id === 'country-input-listbox') return listbox;
      return null;
    };

    // 2. Act
    const options = (decisionEngine as any).labelExtractor.collectChoiceOptions(input);

    // 3. Assert
    expect(options).toHaveLength(3);
    expect(options[0]).toEqual({ text: 'Colombia', value: 'CO', index: 0 });
    expect(options[1]).toEqual({ text: 'United States', value: 'US', index: 1 });
    expect(options[2]).toEqual({ text: 'Spain', value: 'ES', index: 2 });
  });

  it('should resolve combobox via local memory match when options are harvested live', async () => {
    // 1. Arrange combobox with memory match for "Colombia"
    const input = new MockNode('INPUT', '', {
      id: 'country-input',
      role: 'combobox',
      name: 'country',
    });

    const listbox = new MockNode('UL', '', {
      id: 'country-input-listbox',
      role: 'listbox',
    });
    listbox.appendChild(new MockNode('LI', 'Argentina', { role: 'option', 'data-value': 'AR' }));
    listbox.appendChild(new MockNode('LI', 'Colombia', { role: 'option', 'data-value': 'CO' }));
    listbox.appendChild(new MockNode('LI', 'Peru', { role: 'option', 'data-value': 'PE' }));

    const doc = (sdk.platform.getGlobalContext() as any).document;
    doc.getElementById = (id: string) => {
      if (id === 'country-input-listbox') return listbox;
      return null;
    };

    (sdk.detection.detect as any).mockResolvedValue({
      questions: [
        {
          id: 'country-input',
          node: input,
          text: 'What country are you located in?',
          type: 'autocomplete',
          options: [], // initially empty at page load
        },
      ],
    });

    // Mock memory returning Colombia
    sdk.memory = {
      resolve: vi.fn().mockResolvedValue({
        success: true,
        suggestion: {
          value: 'Colombia',
          options: ['Colombia'],
        },
      }),
    } as any;

    // 2. Act
    const result = await decisionEngine.handleTrigger(input);

    // 3. Assert
    expect(result).toBeDefined();
    expect((result as any).source).toBe('memory');
    expect((result as any).selected_values).toContain('CO');
    expect((result as any).selected_indices).toContain(1);
  });

  it('should query AI decision when memory does not match for combobox', async () => {
    const input = new MockNode('INPUT', '', {
      id: 'auth-work',
      role: 'combobox',
      name: 'authorized_to_work',
    });

    const listbox = new MockNode('UL', '', {
      id: 'auth-work-listbox',
      role: 'listbox',
    });
    listbox.appendChild(new MockNode('LI', 'Yes', { role: 'option', 'data-value': 'true' }));
    listbox.appendChild(new MockNode('LI', 'No', { role: 'option', 'data-value': 'false' }));

    const doc = (sdk.platform.getGlobalContext() as any).document;
    doc.getElementById = (id: string) => {
      if (id === 'auth-work-listbox') return listbox;
      return null;
    };

    (sdk.detection.detect as any).mockResolvedValue({
      questions: [
        {
          id: 'auth-work',
          node: input,
          text: 'Are you legally authorized to work in this country?',
          type: 'autocomplete',
          options: [],
        },
      ],
    });

    sdk.memory = {
      resolve: vi.fn().mockResolvedValue({ success: false }),
    } as any;

    (sdk.apiClient.request as any).mockResolvedValue({
      ok: true,
      results: {
        'auth-work': { selected_indices: [0], selected_values: ['true'] },
      },
    });

    // 2. Act
    const result = await decisionEngine.handleTrigger(input);

    // 3. Assert
    expect(result).toBeDefined();
    expect((result as any).selected_values).toContain('true');
    expect((result as any).selected_indices).toContain(0);
  });

  it('should allow ActionEngine to trigger and resolve a combobox field cleanly', async () => {
    const input = new MockNode('INPUT', '', {
      id: 'country-test',
      role: 'combobox',
      name: 'country',
    });

    const listbox = new MockNode('UL', '', {
      id: 'country-test-listbox',
      role: 'listbox',
    });
    listbox.appendChild(new MockNode('LI', 'Colombia', { role: 'option', 'data-value': 'CO' }));

    const doc = (sdk.platform.getGlobalContext() as any).document;
    doc.getElementById = (id: string) => {
      if (id === 'country-test-listbox') return listbox;
      return null;
    };

    (sdk.detection.detect as any).mockResolvedValue({
      questions: [
        {
          id: 'country-test',
          node: input,
          text: 'Country',
          type: 'autocomplete',
          options: [],
        },
      ],
    });

    (sdk.apiClient.request as any).mockResolvedValue({
      ok: true,
      results: {
        'country-test': { selected_indices: [0], selected_values: ['CO'] },
      },
    });

    // Act
    const result: any = await actionEngine.handleTrigger(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.value).toBe('CO');
    expect(result.options).toContain('CO');
  });

  it('should allow sequential clicks on multiple autocomplete fields to query AI independently', async () => {
    const input1 = new MockNode('INPUT', '', {
      id: 'country-input-seq',
      role: 'combobox',
      name: 'country',
    });
    const input2 = new MockNode('INPUT', '', {
      id: 'auth-input-seq',
      role: 'combobox',
      name: 'auth_work',
    });

    const listbox1 = new MockNode('UL', '', { id: 'country-input-seq-listbox', role: 'listbox' });
    listbox1.appendChild(new MockNode('LI', 'Peru', { role: 'option', 'data-value': 'Peru' }));

    const listbox2 = new MockNode('UL', '', { id: 'auth-input-seq-listbox', role: 'listbox' });
    listbox2.appendChild(new MockNode('LI', 'Yes', { role: 'option', 'data-value': 'Yes' }));

    const doc = (sdk.platform.getGlobalContext() as any).document;
    doc.getElementById = (id: string) => {
      if (id === 'country-input-seq-listbox') return listbox1;
      if (id === 'auth-input-seq-listbox') return listbox2;
      return null;
    };

    (sdk.detection.detect as any).mockImplementation(async (node: any) => {
      if (node === input1) {
        return {
          questions: [
            {
              id: 'country-input-seq',
              node: input1,
              text: 'Country',
              type: 'autocomplete',
              options: [],
            },
          ],
        };
      }
      return {
        questions: [
          {
            id: 'auth-input-seq',
            node: input2,
            text: 'Auth Work',
            type: 'autocomplete',
            options: [],
          },
        ],
      };
    });

    (sdk.apiClient.request as any).mockImplementation((path: string, payload: any) => {
      if (path === '/api/decision/batch') {
        const qId = payload.questions?.[0]?.id;
        if (qId === 'country-input-seq') {
          return {
            ok: true,
            results: { 'country-input-seq': { selected_values: ['Peru'], selected_indices: [0] } },
          };
        }
        if (qId === 'auth-input-seq') {
          return {
            ok: true,
            results: { 'auth-input-seq': { selected_values: ['Yes'], selected_indices: [0] } },
          };
        }
      }
      return { ok: true, results: {} };
    });

    // 1. Click Field 1 (Country)
    const result1: any = await actionEngine.handleTrigger(input1);
    expect(result1).toBeDefined();
    expect(result1.value).toBe('Peru');

    // 2. Click Field 2 (Auth Work)
    const result2: any = await actionEngine.handleTrigger(input2);
    expect(result2).toBeDefined();
    expect(result2.value).toBe('Yes');
  });
});
