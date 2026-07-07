/**
 * SERVICES/REFINEMENT_SERVICE.TS
 * AI text refinement and passive learning service.
 * Does not handle events or UI directly.
 */

const _isProcessing = false;

/**
 * Captures and learns manually filled values (called by controller on blur).
 */
export async function learnPassive(element: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
  const value = element.value?.trim();
  if (!value || value.length > 100 || (element as HTMLElement)._CognilotLastLearnedValue === value)
    return;

  const sdk = window.Cognilot?.SDK;
  if (!sdk) return;

  const node = sdk.wrap(element);
  if (!node) return;

  // Passive refinement doesn't usually wait for response
  sdk.action.refineText(node, value)?.catch(() => {
    // silently ignore
  });
  (element as HTMLElement)._CognilotLastLearnedValue = value;
}

/**
 * Refines (enhances) the current text in a field (called by controller via Ctrl+Enter).
 */
export async function refineText(
  element: HTMLElement,
  currentText: string
): Promise<{ success: boolean; value?: string; field?: unknown } | null> {
  const sdk = window.Cognilot?.SDK;
  if (!sdk?.action) return null;

  const node = sdk.wrap(element);
  if (!node) return null;

  const result = await sdk.action.refineText(node, currentText);
  return result?.success ? result : null;
}

/**
 * Unified refinement execution.
 * @deprecated Use refineText or learnPassive directly
 */
export async function executeRefinement(
  element: HTMLElement,
  text: string,
  _payload: unknown,
  _cleanLabel: string,
  _cacheKey: string,
  _isExplicit: boolean
): Promise<{ success: boolean; value?: string; field?: unknown } | null> {
  return refineText(element, text);
}

export const RefinementService = {
  _isProcessing,
  learnPassive,
  refineText,
  _executeRefinement: executeRefinement,
};
