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
};
