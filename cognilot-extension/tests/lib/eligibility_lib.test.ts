import { describe, it, expect } from 'vitest';
import { EligibilityLib } from '../../src/lib/eligibility_lib';

describe('EligibilityLib', () => {
  it('should mark text, email, password inputs as eligible', () => {
    const textInput = document.createElement('input');
    textInput.type = 'text';

    const emailInput = document.createElement('input');
    emailInput.type = 'email';

    const pwdInput = document.createElement('input');
    pwdInput.type = 'password';

    const textarea = document.createElement('textarea');

    expect(EligibilityLib.isEligibleForTrigger(textInput)).toBe(true);
    expect(EligibilityLib.isEligibleForTrigger(emailInput)).toBe(true);
    expect(EligibilityLib.isEligibleForTrigger(pwdInput)).toBe(true);
    expect(EligibilityLib.isEligibleForTrigger(textarea)).toBe(true);
  });

  it('should mark combobox inputs as eligible for triggers', () => {
    const comboInput = document.createElement('input');
    comboInput.setAttribute('role', 'combobox');

    expect(EligibilityLib.isEligibleForTrigger(comboInput)).toBe(true);
    expect(EligibilityLib.isEligibleForLearning(comboInput)).toBe(true);
  });

  it('should mark search, file, radio, and checkbox inputs as ineligible for text triggers', () => {
    const searchInput = document.createElement('input');
    searchInput.type = 'search';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';

    const radioInput = document.createElement('input');
    radioInput.type = 'radio';

    const checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';

    expect(EligibilityLib.isEligibleForTrigger(searchInput)).toBe(false);
    expect(EligibilityLib.isEligibleForTrigger(fileInput)).toBe(false);
    expect(EligibilityLib.isEligibleForTrigger(radioInput)).toBe(false);
    expect(EligibilityLib.isEligibleForTrigger(checkboxInput)).toBe(false);

    expect(EligibilityLib.isEligibleForLearning(searchInput)).toBe(false);
    expect(EligibilityLib.isEligibleForLearning(fileInput)).toBe(false);
  });
});
