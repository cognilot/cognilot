import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageScanner } from '../src/engines/detection/page-scanner';
import { FieldRegistry } from '../src/core/field-registry';
import { MockSDK, MockNode, MockPlatform } from './mocks';

describe('PageScanner', () => {
  let sdk: any;
  let registry: FieldRegistry;
  let scanner: PageScanner;

  beforeEach(() => {
    sdk = new MockSDK(new MockPlatform());
    registry = new FieldRegistry();
    scanner = new PageScanner(sdk, registry);

    // Mock scanAllFields response
    sdk.detection.scanAllFields = vi.fn().mockReturnValue({
      fields: [],
      formScopes: [],
    });

    sdk.alias.resolve = vi.fn().mockResolvedValue({ success: false });
    sdk.profile.resolve = vi.fn().mockResolvedValue({ success: false });
  });

  it('should scan fields and register them on page load', async () => {
    const node1 = new MockNode('INPUT');
    const field1 = {
      id: 'field-1',
      node: node1,
      type: 'text',
      status: 'pending',
    };

    sdk.detection.scanAllFields.mockReturnValue({
      fields: [field1],
      formScopes: [],
    });

    await scanner.scanOnPageLoad();

    expect(sdk.detection.scanAllFields).toHaveBeenCalled();
    const fields = registry.getAll();
    expect(fields.length).toBe(1);
    expect(fields[0].id).toBe('field-1');
    expect(fields[0].status).toBe('pending');
  });

  it('should resolve fields locally using alias cache', async () => {
    const node1 = new MockNode('INPUT');
    const field1 = {
      id: 'field-1',
      node: node1,
      type: 'text',
      status: 'pending',
    };

    sdk.detection.scanAllFields.mockReturnValue({
      fields: [field1],
      formScopes: [],
    });

    sdk.alias.resolve.mockResolvedValue({
      success: true,
      suggestion: { options: ['john.doe@example.com'] },
    });

    await scanner.scanOnPageLoad();

    const fields = registry.getAll();
    expect(fields.length).toBe(1);
    expect(fields[0].status).toBe('resolved');
    expect(fields[0].resolution?.value).toBe('john.doe@example.com');
    expect(fields[0].resolution?.source).toBe('memory');
  });

  it('should resolve fields from persistent AI cache across page reloads', async () => {
    const node1 = new MockNode('INPUT');
    const field1 = {
      id: 'field-ai-1',
      node: node1,
      type: 'text',
      status: 'pending',
    };

    sdk.adapters.storage = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'Cognilot_suggestions_cache') {
          return {
            'localhost::field-ai-1': {
              value: 'Cached AI Answer',
              options: ['Cached AI Answer'],
              source: 'ai',
            },
          };
        }
        return {};
      }),
      set: vi.fn(),
    };

    sdk.detection.scanAllFields.mockReturnValue({
      fields: [field1],
      formScopes: [],
    });

    await scanner.scanOnPageLoad();

    const fields = registry.getAll();
    expect(fields.length).toBe(1);
    expect(fields[0].status).toBe('resolved');
    expect(fields[0].resolution?.value).toBe('Cached AI Answer');
    expect(fields[0].resolution?.source).toBe('ai');
  });

  it('should mark non-resolvable fields (search, range) as detected and skip local resolution', async () => {
    const searchNode = new MockNode('INPUT', '', { type: 'search' });
    const rangeNode = new MockNode('INPUT', '', { type: 'range' });

    const searchField = { id: 'search-1', node: searchNode, type: 'search', status: 'pending' };
    const rangeField = { id: 'range-1', node: rangeNode, type: 'range', status: 'pending' };

    sdk.detection.scanAllFields.mockReturnValue({
      fields: [searchField, rangeField],
      formScopes: [],
    });

    // Even if alias resolve mock returns success, page scanner must not resolve non-resolvable fields
    sdk.alias.resolve.mockResolvedValue({
      success: true,
      suggestion: { options: ['Learned Value'] },
    });

    await scanner.scanOnPageLoad();

    const fields = registry.getAll();
    expect(fields.length).toBe(2);

    for (const f of fields) {
      expect(f.status).toBe('detected');
      expect(f.resolvable).toBe(false);
      expect(f.resolution).toBeNull();
    }
  });

  it('should resolve file fields locally with fallback CV attachment filename', async () => {
    const fileNode = new MockNode('INPUT', '', { type: 'file' });
    const fileField = { id: 'file-1', node: fileNode, type: 'file', status: 'pending' };

    sdk.detection.scanAllFields.mockReturnValue({
      fields: [fileField],
      formScopes: [],
    });

    await scanner.scanOnPageLoad();

    const fields = registry.getAll();
    expect(fields.length).toBe(1);
    expect(fields[0].status).toBe('resolved');
    expect(fields[0].resolution?.value).toBe('cv_candidato.pdf');
    expect(fields[0].resolution?.memoryKey).toBe('cv_file_name');
  });

  it('should resolve file fields locally using cv_file_name from memory cache', async () => {
    const fileNode = new MockNode('INPUT', '', { type: 'file', accept: '.pdf' });
    const fileField = { id: 'file-2', node: fileNode, type: 'file', status: 'pending' };

    sdk.adapters.storage = {
      get: vi.fn().mockImplementation((key: string | string[]) => {
        const k = Array.isArray(key) ? key[0] : key;
        if (k === 'Cognilot_memory_cache') {
          return {
            Cognilot_memory_cache: {
              data: {
                cv_file_name: ['jack_arana_resume.pdf'],
              },
            },
          };
        }
        return {};
      }),
      set: vi.fn(),
    };

    sdk.detection.scanAllFields.mockReturnValue({
      fields: [fileField],
      formScopes: [],
    });

    await scanner.scanOnPageLoad();

    const fields = registry.getAll();
    expect(fields.length).toBe(1);
    expect(fields[0].status).toBe('resolved');
    expect(fields[0].resolution?.value).toBe('jack_arana_resume.pdf');
    expect(fields[0].resolution?.memoryKey).toBe('cv_file_name');
  });

  it('should resolve multiple autocomplete and combobox fields simultaneously from persistent decisions cache', async () => {
    const node1 = new MockNode('INPUT', '', {
      role: 'combobox',
      'aria-autocomplete': 'list',
    });
    const node2 = new MockNode('INPUT', '', {
      role: 'combobox',
      'aria-autocomplete': 'list',
    });
    const field1 = {
      id: 'country-select',
      node: node1,
      type: 'autocomplete',
      text: 'What country are you located in?',
      options: [],
      status: 'pending',
    };
    const field2 = {
      id: 'auth-select',
      node: node2,
      type: 'autocomplete',
      text: 'Are you legally authorized to work in this country?',
      options: [],
      status: 'pending',
    };

    sdk.adapters.storage = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'Cognilot_decisions_cache') {
          return {
            Cognilot_decisions_cache: {
              'localhost::What country are you located in?': {
                selected_values: ['Peru'],
                selected_indices: [1],
                allChoices: [
                  { text: 'Argentina', value: 'Argentina' },
                  { text: 'Peru', value: 'Peru' },
                  { text: 'USA', value: 'USA' },
                ],
                source: 'openai/gpt-oss-120b',
              },
              'localhost::Are you legally authorized to work in this country?': {
                selected_values: ['Yes'],
                selected_indices: [0],
                allChoices: [
                  { text: 'Yes', value: 'Yes' },
                  { text: 'No', value: 'No' },
                ],
                source: 'openai/gpt-oss-120b',
              },
            },
          };
        }
        return {};
      }),
      set: vi.fn(),
    };

    sdk.detection.scanAllFields.mockReturnValue({
      fields: [field1, field2],
      formScopes: [],
    });

    await scanner.scanOnPageLoad();

    const fields = registry.getAll();
    expect(fields.length).toBe(2);

    expect(fields[0].status).toBe('resolved');
    expect(fields[0].resolution?.value).toBe('Peru');
    expect(fields[0].options.length).toBe(3);

    expect(fields[1].status).toBe('resolved');
    expect(fields[1].resolution?.value).toBe('Yes');
    expect(fields[1].options.length).toBe(2);
  });

  it('should stop observer when stopObserving is called', () => {
    const disconnectSpy = vi.fn();
    (global as any).MutationObserver = class {
      observe = vi.fn();
      disconnect = disconnectSpy;
    };

    // We mock document.body since startObserving relies on it
    sdk.platform.getGlobalContext = vi.fn().mockReturnValue({
      document: { body: {} },
    });

    scanner.startObserving();
    expect((scanner as any)._observer).toBeDefined();

    scanner.stopObserving();
    expect(disconnectSpy).toHaveBeenCalled();
    expect((scanner as any)._observer).toBeNull();
  });
});
