/**
 * LabelUtil
 * Utilities for cleaning and normalizing field labels.
 */
export const LabelUtil = {
  /**
   * Normalizes text by removing accents, extra spaces, and special characters.
   */
  normalizeText(text: string): string {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  },

  /**
   * Removes duplicate words/patterns (e.g. "NameName").
   */
  deduplicate(text: string): string {
    if (!text) return '';
    const words = text.split(' ');
    const unique = [...new Set(words)];
    return unique.join(' ');
  },

  /**
   * Determines if a text label represents a complex, multi-clause, or open-ended question
   * that requires contextual AI synthesis rather than a simple deterministic memory lookup.
   */
  isComplexPrompt(text: string): boolean {
    if (!text) return false;
    const raw = text.trim();

    // 1. Direct question punctuation (e.g. "¿Cuentas con...?", "Why do you...?")
    if (/[?¿]/.test(raw)) {
      return true;
    }

    // 2. Open-ended / conditional question trigger verbs and phrases
    const promptTriggers = [
      /\b(describe|describa|cuentanos|cuenta|explica|explique|justifica|justifique|por\s*que|why|how|tell\s*us|details?\s*about)\b/i,
      /\b(cuentas\s*con|tienes\s*experiencia|have\s*you\s*(ever|worked)|do\s*you\s*have|are\s*you\s*able)\b/i,
      /\b(si\s*aplica|en\s*caso\s*de|if\s*applicable|in\s*case\s*of)\b/i,
    ];
    if (promptTriggers.some((regex) => regex.test(raw))) {
      return true;
    }

    // 3. Length / word count threshold: labels over 45 characters with more than 6 words
    const words = raw.split(/\s+/);
    if (raw.length > 45 && words.length > 6) {
      return true;
    }

    return false;
  },
};
