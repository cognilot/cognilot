import { CognilotSDK } from './index';
import { CognilotNode } from './platforms/interface';
import {
  DetectionResult,
  DetectionSource,
  DetectionCacheEntry,
} from './engines/detection/detection-engine';

/**
 * DetectionFacade
 * Simplified entry point for the detection ecosystem.
 */
export class DetectionFacade {
  private sdk: CognilotSDK;

  constructor(sdk: CognilotSDK) {
    this.sdk = sdk;
  }

  /**
   * Unified detection entry point.
   * @param scopeElement Optional scope or seed for the detection pass.
   * @param isFreePlan Indicates if the detection is for a free plan user.
   */
  public detect(
    scopeElement: any = null,
    isFreePlan: boolean = true,
    source: DetectionSource = 'auto_scan'
  ): DetectionResult {
    // Auto-wrap raw DOM elements for backward compatibility with the extension's legacy calls
    let node: CognilotNode | null = scopeElement;
    if (scopeElement && typeof scopeElement.getRawNode !== 'function') {
      node = this.sdk.wrap(scopeElement);
    }

    const result = this.sdk.detection.detect(node, isFreePlan, source);
    return result;
  }

  /**
   * Pure metadata extraction for a single field.
   * @param scopeElement The element to extract metadata from.
   */
  public extractFieldMetadata(scopeElement: any): any {
    let node: CognilotNode | null = scopeElement;
    if (scopeElement && typeof scopeElement.getRawNode !== 'function') {
      node = this.sdk.wrap(scopeElement);
    }
    if (!node) return null;
    return this.sdk.detection.getFieldMetadata(node);
  }

  /**
   * Checks if a raw DOM element matches any field in the cached detection.
   */
  public matchField(rawElement: any): any {
    // 1. Try matching using the proactive FieldRegistry (O(1) node lookup)
    const registry = this.sdk.registry;
    if (registry) {
      const entry = registry.findByNode(rawElement);
      if (entry) return entry;

      // O(n) fallback matching by selector
      const allEntries = registry.getAll();
      for (const e of allEntries) {
        if (e.selector && typeof rawElement.matches === 'function') {
          try {
            if (rawElement.matches(e.selector)) return e;
          } catch (_) {
            // ignore invalid selectors
          }
        }
      }
    }

    // 2. Fall back to the legacy detection cache
    return this.sdk.detection.matchField(rawElement);
  }

  /** Returns the current detection cache entry. */
  public getCache(): DetectionCacheEntry | null {
    return this.sdk.detection.getCache();
  }

  /** Clears the detection cache. */
  public invalidateCache(): void {
    this.sdk.detection.invalidateCache();
  }
}
