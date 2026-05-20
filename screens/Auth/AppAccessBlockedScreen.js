import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '../../lib/icons';

/**
 * Shown when the user cannot access Home (KYC rejected or account restricted).
 */
export default function AppAccessBlockedScreen({ variant = 'kyc_rejected', reason, onLogout, onOpenProfile }) {
  const isRestricted = variant === 'restricted';
  const title = isRestricted ? 'Account restricted' : 'Identity verification required';
  const message = isRestricted
    ? 'Your account has been restricted by Mineral Bridge. You cannot use the app until an administrator lifts the restriction. Contact support if you need help.'
    : reason
      ? `Your identity verification was not approved: ${reason}`
      : 'Your identity verification was not approved. You cannot use the app home until verification is resolved.';

  return (
    <View style={styles.container}>
      <Icon name={isRestricted ? 'lock' : 'shield'} size={48} color="#DC2626" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {!isRestricted && onOpenProfile ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={onOpenProfile}>
          <Text style={styles.primaryBtnText}>View verification status</Text>
        </TouchableOpacity>
      ) : null}
      {onLogout ? (
        <TouchableOpacity style={styles.secondaryBtn} onPress={onLogout}>
          <Text style={styles.secondaryBtnText}>Sign out</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#475569',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: 28,
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
});
