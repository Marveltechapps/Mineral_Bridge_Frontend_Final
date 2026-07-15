/**
 * Artisanal dial helpers. Access is open to all authenticated users (any country).
 * Dial map is for optional display / suggested country labels only.
 */

/** African dial codes → country name (display metadata; not an access gate) */
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
 * Resolve optional African country label from phone/countryCode.
 * Access is always allowed; `canAccess` remains true for callers that still check it.
 * @param {string} [countryCode] - e.g. "+233"
 * @param {string} [phone] - e.g. "+233|201234567" (dial|digits)
 * @returns {{ canAccess: boolean, country: string }}
 */
export function isAfricanEligible(countryCode, phone) {
  const dial = (countryCode || '').trim().replace(/\s/g, '') || (phone || '').split('|')[0] || '';
  const normalized = dial.startsWith('+') ? dial : dial ? `+${dial}` : '';
  const country = AFRICAN_DIAL_CODES[normalized] || null;
  return { canAccess: true, country: country || '—' };
}

/**
 * True when the user has already completed the one-time ASM onboarding flow
 * (profile saved from Step 7 with status submitted, or core fields present).
 * @param {object|null|undefined} profile
 * @returns {boolean}
 */
export function hasCompletedArtisanalOnboarding(profile) {
  if (!profile || typeof profile !== 'object') return false;
  const status = String(profile.status || '').toLowerCase();
  if (status === 'submitted') return true;
  return !!(profile.mineralType || profile.minerType);
}
