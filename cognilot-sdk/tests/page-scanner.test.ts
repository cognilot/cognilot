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
    expect(fields[0].resolution?.source).toBe('alias_cache');
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
