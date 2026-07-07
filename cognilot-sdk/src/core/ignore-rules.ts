import { CognilotNode } from '../platforms/interface';

/**
 * IgnoreRules
 * Centralizes classification logic for input nodes within the Universal Suggestion model.
 *
 * IMPORTANT — Design principle change (Phase 2 refactor):
 *
 * In the previous architecture, `shouldIgnore()` was used as a hard BLOCKER that
 * prevented the SDK from giving suggestions to certain fields (search bars,
 * login fields, etc.).
 *
 * In the new Universal Suggestion model, the SDK ALWAYS provides a suggestion for
 * every visible text-input field. The purpose of this module is now to CLASSIFY
 * fields, not to block them. The classification is used for:
 *   - Sidebar display (icon/label differentiation: 🔍 vs 📝)
 *   - Analytics and debugging
 *   - Optional consumer-side filtering if needed
 *
 * The only hard blocks that remain are:
 *   1. Non-interactive tags (script, style, canvas, svg) — these are never inputs.
 *   2. The `data-Cognilot-ignore="true"` manual override attribute — explicit opt-out.
 *
 * Note: `password` fields are NO LONGER blocked. Per product decision, the SDK
 * will attempt to suggest values for password fields using the user's profile.
 */
export const IgnoreRules = {
  /**
   * @deprecated Use `classify()` instead.
   *
   * Kept for backwards compatibility with legacy code paths that relied on `shouldIgnore()`.
   * In the new model this only blocks tags that are structurally incapable of being
   * text inputs (script, style, canvas, etc.) and the manual override attribute.
   *
   * It NO LONGER blocks search bars, login fields, or password fields.
   *
   * @returns true only if the node must be COMPLETELY excluded from the SDK.
   */
  shouldIgnore(node: CognilotNode): boolean {
    if (!node) return true;

    // 1. Structurally non-interactive tags — can never be text inputs
    const tag = node.tagName.toLowerCase();
    if (['script', 'style', 'canvas', 'svg', 'iframe'].includes(tag)) return true;

    // 2. Non-interactive input types (still hard-blocked because they don't accept text)
    const type = node.getAttribute('type')?.toLowerCase();
    if (['hidden', 'file', 'image', 'submit', 'reset', 'button'].includes(type || '')) {
      if (tag === 'input') return true;
    }

    // 3. Manual override attribute — explicit site-level opt-out
    if (node.getAttribute('data-Cognilot-ignore') === 'true') return true;

    return false;
  },

  /**
   * Classifies a field node into a semantic category.
   * Used by the sidebar for display purposes and by the scanner for metadata tagging.
   *
   * All classified fields STILL RECEIVE suggestions — classification is informational only.
   *
   * Categories:
   *  - 'search'     → Search bars, query inputs, translators
   *  - 'auth'       → Login, password, captcha, token fields
   *  - 'standard'   → Regular form text inputs (name, email, address, etc.)
   *  - 'excluded'   → Hard-blocked (shouldIgnore returns true); no suggestion possible
   */
  classify(node: CognilotNode): 'search' | 'auth' | 'standard' | 'excluded' {
    if (!node) return 'excluded';
    if (this.shouldIgnore(node)) return 'excluded';

    const cls = (node.className || '').toLowerCase();
    const id = (node.id || '').toLowerCase();
    const name = (node.name || '').toLowerCase();
    const type = (node.getAttribute('type') || '').toLowerCase();
    const combined = `${cls} ${id} ${name}`;

    // Auth fields
    if (
      type === 'password' ||
      /(login|signin|sign-in|auth|captcha|token|nonce|otp|2fa|mfa)/i.test(combined)
    ) {
      return 'auth';
    }

    // Search / translator fields
    if (/(search|buscar|q$|query|translate|traducir|find|lookup)/i.test(combined)) {
      return 'search';
    }

    return 'standard';
  },

  /**
   * Returns true if the field is a "simple" isolated field (search, translator, etc.)
   * that should NOT trigger a batch prefetch when clicked.
   * This is a convenience helper for ActionEngine.
   */
  isSimpleField(node: CognilotNode): boolean {
    const category = this.classify(node);
    return category === 'search';
  },
};
