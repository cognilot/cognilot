import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionEngine } from '../src/engines/action/action-engine';
import { MockSDK, MockNode, MockPlatform } from './mocks';
import { FieldRegistryEntry } from '../src/contracts/field-registry-entry';

describe('ActionEngine', () => {
  let sdk: MockSDK;
  let engine: ActionEngine;

  beforeEach(() => {
    sdk = new MockSDK(new MockPlatform());
    engine = new ActionEngine(sdk as any);
  });

  it('should synchronize batch prefetch cache results to FieldRegistry using domain::identifier keys', async () => {
    const node1 = new MockNode('INPUT', '', { id: 'first_name', name: 'first_name' });
    const node2 = new MockNode('INPUT', '', { id: 'last_name', name: 'last_name' });

    const pendingEntries: FieldRegistryEntry[] = [
      {
        id: 'first_name',
        type: 'text',
        tagName: 'INPUT',
        name: 'first_name',
        text: 'First Name',
        placeholder: '',
        required: false,
        options: [],
        ref_id: '',
        section_ref_id: '',
        metadata: { label: 'First Name' } as any,
        selector: '#first_name',
        node: node1,
        belongsToForm: true,
        formScopeId: 'form-1',
        resolution: null,
        status: 'pending',
      },
      {
        id: 'last_name',
        type: 'text',
        tagName: 'INPUT',
        name: 'last_name',
        text: 'Last Name',
        placeholder: '',
        required: false,
        options: [],
        ref_id: '',
        section_ref_id: '',
        metadata: { label: 'Last Name' } as any,
        selector: '#last_name',
        node: node2,
        belongsToForm: true,
        formScopeId: 'form-1',
        resolution: null,
        status: 'pending',
      },
    ];

    // Mock SuggestionEngine requestCache populated by prefetchBatch
    const requestCache = new Map<string, any>();
    requestCache.set('localhost::first_name', {
      value: 'John',
      options: ['John'],
      source: 'ai',
    });
    requestCache.set('localhost::last_name', {
      value: 'Doe',
      options: ['Doe'],
      source: 'ai',
    });

    (sdk.suggestion as any).requestCache = requestCache;

    // Call the private _syncBatchResultsToRegistry method
    (engine as any)._syncBatchResultsToRegistry(pendingEntries);

    expect(sdk.registry.updateResolution).toHaveBeenCalledWith('first_name', {
      value: 'John',
      options: ['John'],
      source: 'ai',
    });
    expect(sdk.registry.updateResolution).toHaveBeenCalledWith('last_name', {
      value: 'Doe',
      options: ['Doe'],
      source: 'ai',
    });
  });

  it('should skip non-resolvable fields during executeBatch without failure', async () => {
    const searchNode = new MockNode('INPUT', '', { id: 'q', name: 'q', type: 'search' });
    const autoNode = new MockNode('INPUT', '', { id: 'combo', name: 'combo', role: 'combobox' });

    const questions = [
      {
        id: 'q',
        type: 'search',
        text: 'Search Site',
        node: searchNode,
        status: 'detected',
        resolvable: false,
      },
      {
        id: 'combo',
        type: 'autocomplete',
        text: 'Category',
        node: autoNode,
        status: 'detected',
        resolvable: false,
      },
    ];

    const result = await engine.executeBatch(questions);

    expect(result.success).toBe(true);
    expect(result.summary.solved).toBe(2);
    expect(result.results).toEqual([
      { id: 'q', success: true, answer: 'Omitido (Solo detección)' },
      { id: 'combo', success: true, answer: 'Omitido (Solo detección)' },
    ]);
  });

  it('should sanitize and clamp numeric values within min and max in _applySuggestion', async () => {
    const numNode = new MockNode('INPUT', '', {
      type: 'number',
      min: '1000',
      max: '50000',
    });

    // Test sanitization of currency and commas
    await (engine as any)._applySuggestion(numNode, '$35,000 USD');
    expect(numNode.setValue).toHaveBeenCalledWith('35000');

    // Test clamping above max
    await (engine as any)._applySuggestion(numNode, '75000');
    expect(numNode.setValue).toHaveBeenCalledWith('50000');

    // Test clamping below min
    await (engine as any)._applySuggestion(numNode, '500');
    expect(numNode.setValue).toHaveBeenCalledWith('1000');
  });

  it('should defensively truncate values exceeding maxlength in _applySuggestion', async () => {
    const textNode = new MockNode('INPUT', '', {
      type: 'text',
      maxlength: '5',
    });

    await (engine as any)._applySuggestion(textNode, '1234567890');
    expect(textNode.setValue).toHaveBeenCalledWith('12345');
  });

  it('should handle file trigger and apply file with valid pdf extension', async () => {
    const rawInput = {
      type: 'file',
      getAttribute: (attr: string) => (attr === 'accept' ? '.pdf' : null),
      files: null as any,
      dispatchEvent: vi.fn(),
    };

    const fileNode = new MockNode('INPUT', '', { type: 'file', accept: '.pdf' });
    fileNode.getRawNode = vi.fn().mockReturnValue(rawInput);

    class MockDT {
      files: any[] = [];
      items = {
        add: (f: any) => this.files.push(f),
      };
    }
    const originalDT = (global as any).DataTransfer;
    (global as any).DataTransfer = MockDT;

    sdk.registry.findByNode.mockReturnValue({
      id: 'cv-upload',
      type: 'file',
      resolution: {
        value: 'my_resume.pdf',
        options: ['my_resume.pdf'],
        source: 'memory',
        memoryKey: 'cv_file_name',
      },
      status: 'resolved',
    });

    try {
      const result = await engine.handleTrigger(fileNode as any);
      expect(result.success).toBe(true);
      expect(result.value).toBe('my_resume.pdf');
      expect(rawInput.files?.length).toBe(1);
      expect(rawInput.files?.[0].name).toBe('my_resume.pdf');
    } finally {
      (global as any).DataTransfer = originalDT;
    }
  });

  it('should append accept extension if provided filename lacks extension in _applyFileInput', async () => {
    const rawInput = {
      type: 'file',
      getAttribute: (attr: string) => (attr === 'accept' ? '.pdf' : null),
      files: null as any,
      dispatchEvent: vi.fn(),
    };

    const fileNode = new MockNode('INPUT', '', { type: 'file', accept: '.pdf' });
    fileNode.getRawNode = vi.fn().mockReturnValue(rawInput);

    class MockDT {
      files: any[] = [];
      items = {
        add: (f: any) => this.files.push(f),
      };
    }
    const originalDT = (global as any).DataTransfer;
    (global as any).DataTransfer = MockDT;

    try {
      const success = await (engine as any)._applyFileInput(fileNode, {
        name: 'CV (Hoja de vida)',
      });
      expect(success).toBe(true);
      expect(rawInput.files?.length).toBe(1);
      expect(rawInput.files?.[0].name).toBe('CV (Hoja de vida).pdf');
    } finally {
      (global as any).DataTransfer = originalDT;
    }
  });
});
