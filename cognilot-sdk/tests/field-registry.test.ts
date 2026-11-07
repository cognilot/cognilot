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

  it('should find entries by secondary nodes in groupNodes', () => {
    const primaryNode = new MockNode('INPUT', '', {
      type: 'radio',
      name: 'office',
      value: 'mexico',
    });
    const secondaryNode1 = new MockNode('INPUT', '', {
      type: 'radio',
      name: 'office',
      value: 'colombia',
    });
    const secondaryNode2 = new MockNode('INPUT', '', {
      type: 'radio',
      name: 'office',
      value: 'peru',
    });

    const entry: FieldRegistryEntry = {
      id: 'radio-office-id',
      type: 'radio',
      tagName: 'INPUT',
      name: 'office',
      text: 'Oficina',
      placeholder: '',
      required: false,
      options: [
        { text: 'México', value: 'mexico', index: 0 },
        { text: 'Colombia', value: 'colombia', index: 1 },
        { text: 'Perú', value: 'peru', index: 2 },
      ],
      ref_id: '',
      section_ref_id: '',
      metadata: {} as any,
      selector: '#mexico',
      node: primaryNode as any,
      groupNodes: [primaryNode, secondaryNode1, secondaryNode2] as any[],
      belongsToForm: true,
      formScopeId: 'form-1',
      resolution: { value: 'peru', options: ['peru'], source: 'memory_cache' },
      status: 'resolved',
    };

    registry.register(entry);

    expect(registry.findByNode(primaryNode as any)).toEqual(entry);
    expect(registry.findByNode(secondaryNode1 as any)).toEqual(entry);
    expect(registry.findByNode(secondaryNode2 as any)).toEqual(entry);
  });

  it('should fallback to name matching for unregistered radio nodes of the same group', () => {
    const primaryNode = new MockNode('INPUT', '', {
      type: 'radio',
      name: 'country',
      value: 'mexico',
    });
    const unindexedNode = new MockNode('INPUT', '', {
      type: 'radio',
      name: 'country',
      value: 'argentina',
    });

    const entry: FieldRegistryEntry = {
      id: 'radio-country-id',
      type: 'radio',
      tagName: 'INPUT',
      name: 'country',
      text: 'Country',
      placeholder: '',
      required: false,
      options: [],
      ref_id: '',
      section_ref_id: '',
      metadata: {} as any,
      selector: '#mexico',
      node: primaryNode as any,
      belongsToForm: true,
      formScopeId: 'form-1',
      resolution: null,
      status: 'pending',
    };

    registry.register(entry);

    expect(registry.findByNode(unindexedNode as any)).toEqual(entry);
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

  it('should unregister a field by id', () => {
    const node = new MockNode('INPUT');
    const entry: FieldRegistryEntry = {
      id: 'test-unregister-id',
      type: 'text',
      tagName: 'INPUT',
      name: 'test',
      text: 'Test',
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
    expect(registry.findById('test-unregister-id')).toBeDefined();

    const removed = registry.unregister('test-unregister-id');
    expect(removed).toBe(true);
    expect(registry.findById('test-unregister-id')).toBeNull();
    expect(registry.getAll().length).toBe(0);
    expect(registry.unregister('non-existent')).toBe(false);
  });

  it('should return distinct form scopes via getFormScopes', () => {
    const entry1: FieldRegistryEntry = {
      id: 'id-1',
      type: 'text',
      tagName: 'INPUT',
      name: 'test-1',
      text: 'Field 1',
      placeholder: '',
      required: false,
      options: [],
      ref_id: '',
      section_ref_id: '',
      metadata: {} as any,
      selector: '#f1',
      node: new MockNode('INPUT') as any,
      belongsToForm: true,
      formScopeId: 'scope-A',
      resolution: null,
      status: 'pending',
    };

    const entry2: FieldRegistryEntry = {
      id: 'id-2',
      type: 'text',
      tagName: 'INPUT',
      name: 'test-2',
      text: 'Field 2',
      placeholder: '',
      required: false,
      options: [],
      ref_id: '',
      section_ref_id: '',
      metadata: {} as any,
      selector: '#f2',
      node: new MockNode('INPUT') as any,
      belongsToForm: true,
      formScopeId: 'scope-A',
      resolution: null,
      status: 'pending',
    };

    const entry3: FieldRegistryEntry = {
      id: 'id-3',
      type: 'text',
      tagName: 'INPUT',
      name: 'test-3',
      text: 'Field 3',
      placeholder: '',
      required: false,
      options: [],
      ref_id: '',
      section_ref_id: '',
      metadata: {} as any,
      selector: '#f3',
      node: new MockNode('INPUT') as any,
      belongsToForm: true,
      formScopeId: 'scope-B',
      resolution: null,
      status: 'pending',
    };

    const entry4Isolated: FieldRegistryEntry = {
      id: 'id-4',
      type: 'text',
      tagName: 'INPUT',
      name: 'test-4',
      text: 'Field 4',
      placeholder: '',
      required: false,
      options: [],
      ref_id: '',
      section_ref_id: '',
      metadata: {} as any,
      selector: '#f4',
      node: new MockNode('INPUT') as any,
      belongsToForm: false,
      resolution: null,
      status: 'pending',
    };

    registry.register(entry1);
    registry.register(entry2);
    registry.register(entry3);
    registry.register(entry4Isolated);

    const scopes = registry.getFormScopes();
    expect(scopes).toEqual([{ id: 'scope-A' }, { id: 'scope-B' }]);
  });
});
