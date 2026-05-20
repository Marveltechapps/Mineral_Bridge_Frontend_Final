import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchWithAuth } from './api';
import { getAppAccessBlock, getAppAccessBlockFromError } from './accountAccess';
import AppAccessBlockedScreen from '../screens/Auth/AppAccessBlockedScreen';

/**
 * Blocks main app when KYC is rejected or account is restricted (set from dashboard).
 */
export default function AppAccessGuard({ children, onLogout, navigation }) {
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState(null);
  const [reason, setReason] = useState('');

  const checkAccess = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/users/me');
      const text = await res.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = {};
        }
      }

      if (res.status === 403) {
        const denied = getAppAccessBlockFromError(data);
        if (denied.block) {
          setBlock(denied.block);
          setReason(denied.reason);
          return;
        }
      }

      if (!res.ok) {
        setBlock(null);
        setReason('');
        return;
      }

      const denied = getAppAccessBlock(data);
      setBlock(denied.block);
      setReason(denied.reason);
    } catch {
      setBlock(null);
      setReason('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  useFocusEffect(
    useCallback(() => {
      void checkAccess();
    }, [checkAccess]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (block === 'kyc_rejected') {
    return (
      <AppAccessBlockedScreen
        variant="kyc_rejected"
        reason={reason}
        onLogout={onLogout}
        onOpenProfile={() => navigation?.navigate?.('Profile', { screen: 'KYCStatus' })}
      />
    );
  }

  if (block === 'restricted') {
    return <AppAccessBlockedScreen variant="restricted" onLogout={onLogout} />;
  }

  return children;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
});
