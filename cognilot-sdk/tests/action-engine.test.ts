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
});
