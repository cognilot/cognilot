/**
 * LIB/ELIGIBILITY_LIB.TS
 * Centralized guard for checking if an element is eligible for suggestions or learning.
 */

import { Logger } from '../utils/logger';

const ELIGIBLE_TAGS = ['INPUT', 'TEXTAREA'];
const INELIGIBLE_TYPES = [
  'hidden',
  'submit',
  'button',
  'radio',
  'checkbox',
  'file',
  'image',
  'color',
  'date',
  'datetime-local',
  'month',
  'range',
  'reset',
  'time',
  'week',
];

function isEligibleElement(element: HTMLElement): boolean {
  if (!element || element._blockCognilotTrigger) return false;

  const tagName = element.tagName.toUpperCase();
  if (!ELIGIBLE_TAGS.includes(tagName)) return false;

  if (tagName === 'INPUT') {
    const type = (element as HTMLInputElement).type.toLowerCase();
    if (INELIGIBLE_TYPES.includes(type)) return false;
  }

  return true;
}

export function isEligibleForTrigger(element: HTMLElement, allowNonEmptyValue = false): boolean {
  if (!isEligibleElement(element)) return false;

  const settings = (window.Cognilot?.Settings || {}) as Record<string, unknown>;
  const copilotSettings = settings.copilotSuggestions as Record<string, unknown> | undefined;
  if (copilotSettings?.enabled === false) return false;

  if (!allowNonEmptyValue) {
    const val = (element as HTMLInputElement).value || '';
    if (val.trim().length > 0) return false;
  }

  return true;
}

export function isEligibleForLearning(element: HTMLElement): boolean {
  if (!isEligibleElement(element)) return false;

  const settings = (window.Cognilot?.Settings || {}) as Record<string, unknown>;
  const copilotSettings = settings.copilotSuggestions as Record<string, unknown> | undefined;
  if (copilotSettings?.learnCustomFields === false) return false;

  return true;
}

export const EligibilityLib = {
  isEligibleForTrigger,
  isEligibleForLearning,
};
