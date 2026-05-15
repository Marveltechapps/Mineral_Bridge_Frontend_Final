/**
 * Real phone validation and formatting using libphonenumber-js.
 * Uses actual numbering plans per country (no dummy length checks).
 */
import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  AsYouType,
  getExampleNumber,
} from 'libphonenumber-js';

/**
 * Validate phone number for the given country.
 * @param {{ code: string, dial: string }} country - { code: 'IN', dial: '+91' }
 * @param {string} nationalDigits - National number digits only (no country code)
 * @returns {{ valid: boolean, message?: string }}
 */
export function validatePhone(country, nationalDigits) {
  const digits = (nationalDigits || '').replace(/\D/g, '');
  if (!digits.length) {
    return { valid: false, message: 'Enter your phone number' };
  }
  // Reject all-zeros or all-same-digit (e.g. 0000000000) - not valid in any country
  if (/^(\d)\1*$/.test(digits)) {
    return { valid: false, message: 'Invalid number format' };
  }
  const dial = (country.dial || '').replace(/\s/g, '');
  const full = dial + digits;
  try {
    const valid = isValidPhoneNumber(full, country.code);
    if (valid) return { valid: true };
    const parsed = parsePhoneNumberFromString(full, country.code);
    if (!parsed) {
      return { valid: false, message: 'Invalid number for this country' };
    }
    return { valid: false, message: 'Invalid number format' };
  } catch (e) {
    return { valid: false, message: 'Invalid number for this country' };
  }
}

/**
 * Format national digits as user types (country-specific format).
 * @param {string} countryCode - e.g. 'IN', 'ZW'
 * @param {string} nationalDigits - digits only
 * @returns {string} Formatted national number (spaces/dashes as per country)
 */
export function formatPhoneAsYouType(countryCode, nationalDigits) {
  const digits = (nationalDigits || '').replace(/\D/g, '');
  if (!digits.length) return '';
  try {
    const asYouType = new AsYouType(countryCode);
    const fullFormatted = asYouType.input(digits);
    if (!fullFormatted) return digits;
    const m = fullFormatted.match(/^\+\d+\s*(.*)$/);
    return m ? m[1].trim() : fullFormatted;
  } catch (e) {
    return digits;
  }
}

/**
 * Get placeholder (example number) for the country in national format.
 * Uses libphonenumber-js example numbers (real formats per country).
 * @param {string} countryCode - e.g. 'IN', 'ZW'
 * @returns {string} Example national number
 */
export function getPhonePlaceholder(countryCode) {
  try {
    const example = getExampleNumber(countryCode);
    if (example) {
      return example.formatNational();
    }
  } catch (e) {
    // ignore
  }
  const len = 10;
  const mid = Math.floor(len / 2);
  return '0'.repeat(mid) + '-' + '0'.repeat(len - mid);
}
