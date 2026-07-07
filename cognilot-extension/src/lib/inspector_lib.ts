/**
 * LIB/INSPECTOR_LIB.TS
 * DOM resolution utilities specific to the Inspector.
 */

/**
 * Resolves the most appropriate form container for a given element.
 */
export function resolveContainerFromElement(element: HTMLElement | null): HTMLElement | null {
  if (!element) return null;

  // 1. Try the SDK resolver
  const resolver = window.Cognilot?.SDK?.Engines?.Detection?.FormScopeResolver;
  if (resolver && typeof resolver.resolveFormScope === 'function') {
    const node = window.Cognilot.SDK.wrap(element);
    if (node) {
      const result = resolver.resolveFormScope(node);
      return result?.getRawNode() ?? null;
    }
  }

  // 2. Fallback to structural container selectors
  return element.closest(
    'form, [role="form"], .form-container, .form-wrapper, .form-section, section, main, article'
  );
}

/**
 * Finds the first valid input field inside a container.
 */
export function findFirstFieldInContainer(container: HTMLElement | null): HTMLElement | null {
  if (!container) return null;

  const resolver = (window.Cognilot as Record<string, unknown>)?.Detection as
    | Record<string, { findFirstFieldInContainer?(c: HTMLElement): HTMLElement | null }>
    | undefined;
  const containerResolver = resolver?.ContainerResolver;
  if (containerResolver && typeof containerResolver.findFirstFieldInContainer === 'function') {
    return containerResolver.findFirstFieldInContainer(container);
  }

  return container.querySelector(
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="image"]), ' +
      'textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]'
  );
}

/**
 * Finds the first visible field in the entire document.
 */
export function findFirstVisibleFieldInDocument(): HTMLElement | null {
  const resolver = (window.Cognilot as Record<string, unknown>)?.Detection as
    | Record<string, { findFirstVisibleFieldInDocument?(): HTMLElement | null }>
    | undefined;
  const containerResolver = resolver?.ContainerResolver;
  if (
    containerResolver &&
    typeof containerResolver.findFirstVisibleFieldInDocument === 'function'
  ) {
    return containerResolver.findFirstVisibleFieldInDocument();
  }
  return null;
}

export const InspectorLib = {
  resolveContainerFromElement,
  findFirstFieldInContainer,
  findFirstVisibleFieldInDocument,
};
