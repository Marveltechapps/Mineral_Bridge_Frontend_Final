/** Client-side helpers for /api/users/me access flags. */

export function parseMeAccess(me) {
  if (!me || typeof me !== 'object') {
    return { accountStatus: 'active', kycStatus: 'pending', kycRejectionReason: null };
  }
  return {
    accountStatus: String(me.accountStatus || 'active').toLowerCase(),
    kycStatus: String(me.kycStatus || 'pending').toLowerCase(),
    kycRejectionReason: me.kycRejectionReason || null,
  };
}

export function getAppAccessBlock(me) {
  const access = parseMeAccess(me);
  if (access.kycStatus === 'rejected') {
    return { block: 'kyc_rejected', reason: access.kycRejectionReason || '' };
  }
  if (access.accountStatus === 'restricted' || access.accountStatus === 'suspended') {
    return { block: 'restricted', reason: '' };
  }
  return { block: null, reason: '' };
}

export function getAppAccessBlockFromError(data) {
  if (!data || typeof data !== 'object') return { block: null, reason: '' };
  const code = String(data.code || '').toLowerCase();
  const accountStatus = String(data.accountStatus || '').toLowerCase();
  if (code === 'account_restricted' || accountStatus === 'restricted' || accountStatus === 'suspended') {
    return { block: 'restricted', reason: data.message || '' };
  }
  if (code === 'kyc_rejected' || String(data.kycStatus || '').toLowerCase() === 'rejected') {
    return { block: 'kyc_rejected', reason: data.kycRejectionReason || data.message || '' };
  }
  return { block: null, reason: '' };
}
