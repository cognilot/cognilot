/**
 * SERVICES/AUTOCOMPLETE_SERVICE.TS
 * Service for fetching automatic suggestions.
 * Does not handle events or UI directly.
 */

export async function fetchSuggestion(
  _manager: unknown,
  element: HTMLElement,
  _isBatchRunning: boolean
): Promise<SDKSuggestionResult | null> {
  const sdk = window.Cognilot?.SDK;
  const actionEngine = sdk?.action;

  if (!actionEngine) return null;

  const node = sdk.wrap(element);
  if (!node) return null;

  try {
    const result = await actionEngine.handleTrigger(node);

    // Normalize result for the legacy controller if needed
    if (result && !(result as any).error) {
      return result as SDKSuggestionResult;
    }
  } catch (e) {
    console.error('[AutocompleteService] Error:', e);
  }

  return null;
}

export const AutocompleteService = {
  fetchSuggestion,
};
