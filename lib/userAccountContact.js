/** Internal user `phone` key for email-based OTP login: `email|user@example.com` */
const EMAIL_LOGIN_PREFIX = 'email|';

export function isEmailLoginAccount(phoneKey) {
  return typeof phoneKey === 'string' && phoneKey.toLowerCase().startsWith(EMAIL_LOGIN_PREFIX);
}

export function emailFromLoginKey(phoneKey) {
  if (!isEmailLoginAccount(phoneKey)) return null;
  return phoneKey.slice(EMAIL_LOGIN_PREFIX.length).trim() || null;
}

export function parsePhoneKey(phoneKey) {
  if (!phoneKey || typeof phoneKey !== 'string' || isEmailLoginAccount(phoneKey)) {
    return { countryCode: '', digits: '' };
  }
  const sep = phoneKey.indexOf('|');
  if (sep < 0) return { countryCode: '', digits: phoneKey.replace(/\D/g, '') };
  return {
    countryCode: phoneKey.slice(0, sep).trim(),
    digits: phoneKey.slice(sep + 1).replace(/\D/g, ''),
  };
}

export function formatPhoneDigits(digits, countryCode) {
  if (!digits) return '';
  const dial = countryCode || '+1';
  if (digits.length <= 3) return `${dial} ${digits}`;
  if (digits.length <= 6) return `${dial} ${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${dial} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** Phone line for profile UI — never derive digits from an email login key. */
export function formatUserPhoneForDisplay(user) {
  if (!user) return '';
  if (isEmailLoginAccount(user.phone)) return '';
  const { countryCode, digits } = parsePhoneKey(user.phone);
  if (!digits) return '';
  return formatPhoneDigits(digits, countryCode || user.countryCode);
}
