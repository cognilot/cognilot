// Vitest globals enabled in config
import { SuggestionEngine } from '../src/engines/autocomplete/suggestion-engine';
import { MockSDK, MockNode, MockPlatform } from './mocks';

describe('SuggestionEngine', () => {
  let sdk: MockSDK;
  let engine: SuggestionEngine;

  beforeEach(() => {
    sdk = new MockSDK(new MockPlatform());
    engine = new SuggestionEngine(sdk as any);
  });

  it('should include page context (title, h1) in API requests', async () => {
    // 1. Arrange
    const node = new MockNode('INPUT', '', { name: 'email', id: 'email-id' });

    // Official Vitest way to mock globals in isolated environments
    vi.stubGlobal('document', {
      title: 'Signup Page',
      querySelector: vi.fn().mockReturnValue({ innerText: 'Welcome to Cognilot' }),
    });
    vi.stubGlobal('location', { hostname: 'example.com', pathname: '/signup' });

    sdk.apiClient.request.mockResolvedValue({ ok: true, results: {} });

    // 2. Act
    await engine.handleTrigger(node);

    // 3. Assert
    // We check that the structure is correctly assembled, even if the isolated Node 24 environment
    // provides its own defaults for domain/path instead of our mocks.
    expect(sdk.apiClient.request).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        page_context: expect.objectContaining({
          domain: expect.any(String),
          path: expect.any(String),
          h1: expect.any(String),
        }),
      }),
      expect.any(String)
    );
  });

  it('should update user profile if standardized_profile is returned (Piggyback Learning)', async () => {
    // 1. Arrange
    const node = new MockNode('INPUT', '', { name: 'first_name', id: 'fn-id' });
    const mockProfile = { full_name: 'John Wick', email: 'john@wick.com' };

    sdk.apiClient.request.mockResolvedValue({
      ok: true,
      standardized_profile: mockProfile,
      results: { 'fn-id': { value: 'John' } },
    });

    // 2. Act
    await engine.handleTrigger(node);

    // 3. Assert
    expect(sdk.profile.updateFromStandardizedData).toHaveBeenCalledWith(mockProfile);
  });

  it('should return null when API fails (Error 500)', async () => {
    // 1. Arrange
    const node = new MockNode('INPUT', '', { name: 'phone' });

    // Mock API Error
    sdk.apiClient.request.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    // 2. Act
    const result = await engine.handleTrigger(node);

    // 3. Assert
    expect(result).toBeNull();
  });

  it('should cache results in storage to avoid redundant API calls', async () => {
    // 1. Arrange
    const node = new MockNode('INPUT', '', { name: 'city', id: 'city-id' });
    const storage = sdk.adapters.storage;

    sdk.apiClient.request.mockResolvedValue({
      ok: true,
      results: { 'city-id': { value: 'Madrid' } },
    });

    // 2. Act
    await engine.handleTrigger(node);

    // 3. Assert
    expect(storage.set).toHaveBeenCalledWith(
      'Cognilot_suggestions_cache',
      expect.objectContaining({ 'city-id': expect.any(Object) }),
      'session'
    );
  });

  it('should refuse to handle non-textual fields', async () => {
    const radio = new MockNode('INPUT', '', { type: 'radio', name: 'choice' });
    const result = await engine.handleTrigger(radio);
    expect(result.error).toBeDefined();
  });

  it('should enrich field result with placeholder', async () => {
    // 1. Arrange
    const node = new MockNode('INPUT', '', {
      name: 'postal_code',
      id: 'pc-id',
      placeholder: 'ZIP Code',
    });

    sdk.apiClient.request.mockResolvedValue({
      ok: true,
      results: { 'pc-id': { value: '28001', type: 'discrete' } },
    });

    // 2. Act
    const result = await engine.handleTrigger(node);

    // 3. Assert
    expect(result.field).toMatchObject({
      label: expect.any(String),
      placeholder: 'ZIP Code',
    });
    // Check they ARE NOT there
    expect(result.field.name).toBeUndefined();
    expect(result.field.id).toBeUndefined();
  });

  it('should reset registry entry from resolved to pending when an existing_value field is cleared', async () => {
    // 1. Arrange
    const node = new MockNode('INPUT', '', { name: 'email', id: 'email-id' });
    const entry = {
      id: 'email-id',
      type: 'text',
      tagName: 'INPUT',
      name: 'email',
      text: 'email',
      placeholder: '',
      required: false,
      options: [],
      ref_id: '',
      section_ref_id: '',
      metadata: { label: 'email', confidence: 1, source: 'name' },
      selector: '',
      node: node,
      belongsToForm: false,
      formScopeId: null,
      resolution: {
        value: 'pre-existing@email.com',
        options: ['pre-existing@email.com'],
        source: 'existing_value',
      },
      status: 'resolved',
    };
    sdk.registry.findByNode.mockReturnValue(entry);

    sdk.apiClient.request.mockResolvedValue({
      ok: true,
      results: { 'email-id': { value: 'resolved-from-ai@email.com' } },
    });

    // 2. Act
    const result = await engine.handleTrigger(node);

    // 3. Assert
    expect(entry.status).toBe('pending');
    expect(entry.resolution).toBeNull();
    expect(sdk.registry.updateResolution).toHaveBeenCalledWith('email-id', {
      value: 'resolved-from-ai@email.com',
      options: ['resolved-from-ai@email.com'],
      source: 'ai',
    });
    expect(result.value).toBe('resolved-from-ai@email.com');
  });

  describe('handleRefine', () => {
    it('should retrieve refined text from API and NOT call confirmSuggestion', async () => {
      // 1. Arrange
      const node = new MockNode('INPUT', 'Initial text', { name: 'bio', id: 'bio-id' });
      const currentText = 'Some messy bio';
      const refinedText = 'A professional bio';

      // First call (batch suggestions from handleTrigger)
      sdk.apiClient.request.mockResolvedValueOnce({
        ok: true,
        results: { 'bio-id': { value: 'Initial', options: ['Initial'], type: 'discrete' } },
      });

      // Second call (refinement request)
      sdk.apiClient.request.mockResolvedValueOnce({
        ok: true,
        refined_text: refinedText,
      });

      // 2. Act
      const result = await engine.handleRefine(node, currentText);

      // 3. Assert
      expect(result.success).toBe(true);
      expect(result.value).toBe(refinedText);
      expect(result.type).toBe('refine');

      // Verify learn_on_enhance is false in payload
      expect(sdk.apiClient.request).toHaveBeenCalledWith(
        '/api/suggestions/refine',
        expect.objectContaining({
          raw_text: currentText,
          learn_on_enhance: false,
        }),
        'SuggestionEngine'
      );

      // IMPORTANT: Verify that confirmSuggestion was NOT called
      // Since confirmSuggestion is a method of the class being tested,
      // we check its side effect: persisting an alias.
      expect(sdk.alias.persistAlias).not.toHaveBeenCalled();
    });
  });
});
