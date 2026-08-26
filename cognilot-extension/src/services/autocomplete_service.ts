/**
 * SERVICES/AUTOCOMPLETE_SERVICE.TS
 * Service for fetching automatic suggestions.
 * Does not handle events or UI directly.
 */

export async function fetchSuggestion(
  _manager: unknown,
  element: HTMLElement,
  _isBatchRunning: boolean,
  options?: { clipboard?: any }
): Promise<SDKSuggestionResult | null> {
  const sdk = window.Cognilot?.SDK;
  const actionEngine = sdk?.action;

  if (!actionEngine) return null;

  const node = sdk.wrap(element);
  if (!node) return null;

  try {
    const result = await actionEngine.handleTrigger(node, options);
    return result as SDKSuggestionResult | null;
  } catch (e) {
    console.error('[AutocompleteService] Error:', e);
    return { error: (e as Error).message || 'Error' } as any;
  }

  return null;
}

export const AutocompleteService = {
  fetchSuggestion,
};
