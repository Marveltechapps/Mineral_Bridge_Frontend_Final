/**
 * Artisanal access: only users with African country (from phone/countryCode) can access artisanal screens.
 * Backend verifies country from user's phone + OTP at login.
 */

/** African dial codes → country name (matches backend ALLOWED_COUNTRIES) */
const AFRICAN_DIAL_CODES = {
  '+233': 'Ghana',
  '+234': 'Nigeria',
  '+255': 'Tanzania',
  '+243': 'DRC',
  '+260': 'Zambia',
  '+263': 'Zimbabwe',
  '+254': 'Kenya',
  '+256': 'Uganda',
  '+223': 'Mali',
  '+226': 'Burkina Faso',
  '+229': 'Benin',
  '+244': 'Angola',
  '+258': 'Mozambique',
  '+221': 'Senegal',
  '+225': "Côte d'Ivoire",
  '+250': 'Rwanda',
  '+227': 'Niger',
  '+228': 'Togo',
  '+267': 'Botswana',
  '+264': 'Namibia',
  '+27': 'South Africa',
  '+237': 'Cameroon',
  '+251': 'Ethiopia',
};

/**
 * Check if user's country (from phone or countryCode) is African/eligible for artisanal.
 * @param {string} [countryCode] - e.g. "+233"
 * @param {string} [phone] - e.g. "+233|201234567" (dial|digits)
 * @returns {{ canAccess: boolean, country: string }}
 */
export function isAfricanEligible(countryCode, phone) {
  const dial = (countryCode || '').trim().replace(/\s/g, '') || (phone || '').split('|')[0] || '';
  const normalized = dial.startsWith('+') ? dial : `+${dial}`;
  const country = AFRICAN_DIAL_CODES[normalized] || null;
  return { canAccess: !!country, country: country || '—' };
}
