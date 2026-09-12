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
   * Removes duplicate words/patterns (e.g. "NameName" or "First Name First Name").
   */
  deduplicate(text: string): string {
    if (!text) return '';
    const trimmed = text.trim();

    // Check if the entire string is an exact repeated half (e.g. "Full Name Full Name" -> "Full Name")
    const words = trimmed.split(/\s+/);
    if (words.length >= 2 && words.length % 2 === 0) {
      const half = words.length / 2;
      const firstHalf = words.slice(0, half).join(' ');
      const secondHalf = words.slice(half).join(' ');
      if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
        return firstHalf;
      }
    }

    // Deduplicate only immediately adjacent identical words/tokens (e.g. "Email Email" -> "Email")
    const dedupedWords: string[] = [];
    for (let i = 0; i < words.length; i++) {
      if (i > 0 && words[i].toLowerCase() === words[i - 1].toLowerCase()) {
        continue;
      }
      dedupedWords.push(words[i]);
    }
    return dedupedWords.join(' ');
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
