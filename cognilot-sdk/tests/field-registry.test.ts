import { describe, it, expect, beforeEach } from 'vitest';
import { FieldRegistry } from '../src/core/field-registry';
import type { FieldRegistryEntry } from '../src/contracts/field-registry-entry';
import { MockNode } from './mocks';

describe('FieldRegistry', () => {
  let registry: FieldRegistry;

  beforeEach(() => {
    registry = new FieldRegistry();
  });

  it('should register and retrieve a field', () => {
    const node = new MockNode('INPUT');
    const entry: FieldRegistryEntry = {
      id: 'test-id',
      type: 'text',
      tagName: 'INPUT',
      name: 'test-name',
      text: 'Test Label',
      placeholder: '',
      required: false,
      options: [],
      ref_id: '',
      section_ref_id: '',
      metadata: {} as any,
      selector: '#test',
      node: node as any,
      belongsToForm: true,
      formScopeId: 'form-1',
      resolution: null,
      status: 'pending',
    };

    registry.register(entry);

    expect(registry.findById('test-id')).toEqual(entry);
    expect(registry.findByNode(node as any)).toEqual(entry);
    expect(registry.getAll().length).toBe(1);
  });

  it('should update an existing field entry', () => {
    const node = new MockNode('INPUT');
    const entry: FieldRegistryEntry = {
      id: 'test-id',
      type: 'text',
      tagName: 'INPUT',
      name: 'test-name',
      text: 'Test Label',
      placeholder: '',
      required: false,
      options: [],
      ref_id: '',
      section_ref_id: '',
      metadata: {} as any,
      selector: '#test',
      node: node as any,
      belongsToForm: true,
      formScopeId: 'form-1',
      resolution: null,
      status: 'pending',
    };

    registry.register(entry);

    const update: Partial<FieldRegistryEntry> = {
      status: 'resolved',
      resolution: { value: 'Jane', options: [], source: 'ai' },
    };

    registry.updateResolution('test-id', update.resolution!);

    const updated = registry.findById('test-id');
    expect(updated?.status).toBe('resolved');
    expect(updated?.resolution?.value).toBe('Jane');
  });

  it('should retrieve pending fields by form scope', () => {
    const node1 = new MockNode('INPUT');
    const node2 = new MockNode('INPUT');

    const entry1: FieldRegistryEntry = {
      id: 'id-1',
      type: 'text',
      tagName: 'INPUT',
      name: 'test-1',
      text: '',
      placeholder: '',
      required: false,
      options: [],
      ref_id: '',
      section_ref_id: '',
      metadata: {} as any,
      selector: '',
      node: node1 as any,
      belongsToForm: true,
      formScopeId: 'form-1',
      resolution: null,
      status: 'pending',
    };

    const entry2: FieldRegistryEntry = {
      id: 'id-2',
      type: 'text',
      tagName: 'INPUT',
      name: 'test-2',
      text: '',
      placeholder: '',
      required: false,
      options: [],
      ref_id: '',
      section_ref_id: '',
      metadata: {} as any,
      selector: '',
      node: node2 as any,
      belongsToForm: true,
      formScopeId: 'form-1',
      resolution: { value: 'Resolved', options: [], source: 'ai' },
      status: 'resolved',
    };

    registry.register(entry1);
    registry.register(entry2);

    const pending = registry.getPendingFieldsByFormScope('form-1');
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe('id-1');
  });

  it('should clear the registry', () => {
    const node = new MockNode('INPUT');
    const entry: FieldRegistryEntry = {
      id: 'test-id',
      type: 'text',
      tagName: 'INPUT',
      name: '',
      text: '',
      placeholder: '',
      required: false,
      options: [],
      ref_id: '',
      section_ref_id: '',
      metadata: {} as any,
      selector: '',
      node: node as any,
      belongsToForm: true,
      formScopeId: 'form-1',
      resolution: null,
      status: 'pending',
    };

    registry.register(entry);
    expect(registry.getAll().length).toBe(1);

    registry.clear();
    expect(registry.getAll().length).toBe(0);
    expect(registry.findById('test-id')).toBeNull();
  });
});
