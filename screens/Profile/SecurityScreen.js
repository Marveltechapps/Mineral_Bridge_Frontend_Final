import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';

const ALERT_ICON = {
  new_login_ip: 'warning',
  new_device: 'phone',
  profile_updated: 'person',
  profile_incomplete: 'info',
  general: 'shield',
};

const SEVERITY_COLORS = {
  critical: '#DC2626',
  warning: '#EA7D24',
  info: '#2563EB',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatSessionDate(dateStr) {
  if (!dateStr) return '';
  const dt = new Date(dateStr);
  if (isNaN(dt)) return '';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at ' + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function SecurityScreen({ navigation }) {
  const [twoFA, setTwoFA] = useState(false);
  const [sessionDevice, setSessionDevice] = useState('');
  const [sessionIP, setSessionIP] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [dismissing, setDismissing] = useState({});
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revoking, setRevoking] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [meRes, alertsRes] = await Promise.all([
        fetchWithAuth('/api/auth/me').catch(() => null),
        fetchWithAuth('/api/security-alerts').catch(() => null),
      ]);
      if (meRes && meRes.ok) {
        const data = await meRes.json();
        setTwoFA(!!data.twoFactorEnabled);
        setSessionDevice(data.deviceName || 'Unknown Device');
        setSessionIP(data.lastIP || '');
      }
      if (alertsRes && alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setAlertsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      loadData();
      return undefined;
    }, [loadData]),
  );

  const onToggle2FA = async (val) => {
    setTwoFA(val);
    try {
      const res = await fetchWithAuth('/api/auth/2fa', {
        method: 'PUT',
        body: JSON.stringify({ enabled: val }),
      });
      if (!res.ok) setTwoFA(!val);
    } catch {
      setTwoFA(!val);
    }
  };

  const onDismiss = async (id) => {
    setDismissing((prev) => ({ ...prev, [id]: true }));
    try {
      await fetchWithAuth(`/api/security-alerts/${id}/dismiss`, { method: 'PATCH' });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
    setDismissing((prev) => ({ ...prev, [id]: false }));
  };

  const onDismissAll = async () => {
    try {
      await fetchWithAuth('/api/security-alerts/dismiss-all', { method: 'POST' });
      setAlerts([]);
    } catch { /* ignore */ }
  };

  const loadSessions = async () => {
    setShowSessions(true);
    setSessionsLoading(true);
    try {
      const res = await fetchWithAuth('/api/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setSessionsLoading(false);
  };

  const onRevoke = (session) => {
    if (session.isCurrent) {
      Alert.alert('Current Session', 'You cannot revoke your current active session.');
      return;
    }
    Alert.alert(
      'Revoke Session',
      `Remove the session from ${session.deviceName} (${session.ip})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setRevoking((prev) => ({ ...prev, [session.id]: true }));
            try {
              await fetchWithAuth(`/api/auth/sessions/${session.id}`, { method: 'DELETE' });
              setSessions((prev) => prev.filter((s) => s.id !== session.id));
            } catch { /* ignore */ }
            setRevoking((prev) => ({ ...prev, [session.id]: false }));
          },
        },
      ],
    );
  };

  if (showSessions) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]}
              onPress={() => setShowSessions(false)}
            >
              <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
            </Pressable>
            <View style={styles.headerTitleBlock}>
              <View style={styles.headerIconWrap}>
                <Icon name="phone" size={20} color={colors.primary} />
              </View>
              <Text style={styles.headerTitle}>ACTIVE SESSIONS</Text>
            </View>
            <View style={styles.headerRight} />
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {sessionsLoading ? (
            <View style={styles.alertsLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.noAlertsCard}>
              <View style={styles.noAlertsIconWrap}>
                <Icon name="shieldCheck" size={22} color={colors.successGreen} />
              </View>
              <View style={styles.noAlertsTextBlock}>
                <Text style={styles.noAlertsTitle}>No active sessions found</Text>
                <Text style={styles.noAlertsSub}>Session history appears here after your next verified sign-in.</Text>
              </View>
            </View>
          ) : (
            sessions.map((s) => (
              <View key={s.id} style={[styles.sessionCard, s.isCurrent && styles.sessionCardCurrent]}>
                <View style={styles.sessionRow}>
                  <View style={[styles.sessionIconWrap, s.isCurrent && styles.sessionIconCurrent]}>
                    <Icon name="phone" size={20} color={s.isCurrent ? colors.white : colors.textMuted} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionNameRow}>
                      <Text style={styles.sessionDevice}>{s.deviceName}</Text>
                      {s.isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.sessionIP}>{s.ip || 'Unknown IP'}</Text>
                    <Text style={styles.sessionDate}>{formatSessionDate(s.loggedInAt)}</Text>
                  </View>
                  {!s.isCurrent && (
                    <TouchableOpacity
                      style={styles.revokeBtn}
                      onPress={() => onRevoke(s)}
                      activeOpacity={0.7}
                      disabled={!!revoking[s.id]}
                    >
                      {revoking[s.id] ? (
                        <ActivityIndicator size={14} color="#DC2626" />
                      ) : (
                        <Text style={styles.revokeBtnText}>Revoke</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconWrap}>
              <Icon name="shield" size={20} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>SECURITY & PRIVACY</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Alerts */}
        {alertsLoading ? (
          <View style={styles.alertsLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : alerts.length > 0 ? (
          <View style={styles.alertsSection}>
            <View style={styles.alertsHeader}>
              <View style={styles.alertsBadgeRow}>
                <Icon name="warning" size={16} color="#DC2626" />
                <Text style={styles.alertsSectionTitle}>RECENT ALERTS</Text>
                <View style={styles.alertCountBadge}>
                  <Text style={styles.alertCountText}>{alerts.length}</Text>
                </View>
              </View>
              {alerts.length > 1 && (
                <TouchableOpacity onPress={onDismissAll} activeOpacity={0.7}>
                  <Text style={styles.dismissAllText}>Dismiss All</Text>
                </TouchableOpacity>
              )}
            </View>

            {alerts.map((alert) => {
              const sevColor = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.info;
              const iconName = ALERT_ICON[alert.type] || 'shield';
              return (
                <View key={alert.id} style={[styles.alertCard, { borderLeftColor: sevColor }]}>
                  <View style={styles.alertTopRow}>
                    <View style={[styles.alertIconWrap, { backgroundColor: sevColor + '18' }]}>
                      <Icon name={iconName} size={18} color={sevColor} />
                    </View>
                    <View style={styles.alertTextBlock}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <Text style={styles.alertTime}>{timeAgo(alert.createdAt)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.dismissBtn}
                      onPress={() => onDismiss(alert.id)}
                      activeOpacity={0.7}
                      disabled={!!dismissing[alert.id]}
                    >
                      {dismissing[alert.id] ? (
                        <ActivityIndicator size={14} color={colors.textLight} />
                      ) : (
                        <Icon name="close" size={16} color={colors.textLight} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.noAlertsCard}>
            <View style={styles.noAlertsIconWrap}>
              <Icon name="shieldCheck" size={22} color={colors.successGreen} />
            </View>
            <View style={styles.noAlertsTextBlock}>
              <Text style={styles.noAlertsTitle}>All Clear</Text>
              <Text style={styles.noAlertsSub}>No suspicious activity detected on your account.</Text>
            </View>
          </View>
        )}

        {/* Two-Factor Auth */}
        <View style={styles.card}>
          <View style={styles.rowItem}>
            <View style={styles.rowIconWrap}>
              <Icon name="shield" size={22} color={colors.textMuted} />
            </View>
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>Two-Factor Auth</Text>
              <Text style={styles.rowSub}>Extra layer of protection</Text>
            </View>
            <Switch
              value={twoFA}
              onValueChange={onToggle2FA}
              trackColor={{ false: '#E2E8F0', true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Active Sessions */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={loadSessions}
        >
          <View style={styles.rowItem}>
            <View style={styles.rowIconWrap}>
              <Icon name="phone" size={22} color={colors.textMuted} />
            </View>
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowTitle}>Active Sessions</Text>
              <Text style={styles.rowSub}>
                {sessionDevice}{sessionIP ? ` \u2022 ${sessionIP}` : ''}
              </Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.textLight} />
          </View>
        </Pressable>

        {/* Blockchain Data Visibility */}
        <Text style={styles.sectionTitle}>BLOCKCHAIN DATA VISIBILITY</Text>

        <View style={styles.visibilityCard}>
          <View style={styles.visRow}>
            <View style={styles.visIconWrap}>
              <Icon name="check" size={18} color={colors.white} />
            </View>
            <View style={styles.visTextBlock}>
              <Text style={styles.visTitle}>Public Ledger</Text>
              <Text style={styles.visDesc}>
                Transaction hashes, timestamps, and mineral provenance data are public.
              </Text>
            </View>
          </View>

          <View style={styles.visDivider} />

          <View style={styles.visRow}>
            <View style={styles.visIconWrap}>
              <Icon name="check" size={18} color={colors.white} />
            </View>
            <View style={styles.visTextBlock}>
              <Text style={styles.visTitle}>Private Data</Text>
              <Text style={styles.visDesc}>
                Your identity (KYC), bank details, and negotiation chain are encrypted and off-chain.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

  /* Header */
  header: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1.25,
    borderBottomColor: '#DBEAFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    paddingTop: 12 + HEADER_EXTRA_TOP,
    paddingBottom: 20,
    paddingHorizontal: 21,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  headerTitleBlock: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
  },
  headerIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  headerTitle: {
    fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5,
  },
  headerRight: { width: 44 },

  /* Alerts Section */
  alertsSection: { marginTop: WINDOW_HEIGHT * 0.025 },
  alertsLoading: { marginTop: WINDOW_HEIGHT * 0.025, alignItems: 'center', paddingVertical: 20 },
  alertsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  alertsBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertsSectionTitle: {
    fontSize: 11, fontWeight: '800', color: '#DC2626', letterSpacing: 1.2,
  },
  alertCountBadge: {
    backgroundColor: '#DC2626', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center',
  },
  alertCountText: { fontSize: 11, fontWeight: '800', color: colors.white },
  dismissAllText: { fontSize: 12, fontWeight: '600', color: DROPDOWN_BLUE },

  alertCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4,
  },
  alertTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  alertIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  alertTextBlock: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  alertTime: { fontSize: 11, color: colors.textLight, marginTop: 1 },
  dismissBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  alertMessage: { fontSize: 13, color: colors.textMuted, lineHeight: 19, paddingLeft: 48 },

  /* No Alerts */
  noAlertsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16,
    marginTop: WINDOW_HEIGHT * 0.025,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  noAlertsIconWrap: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
  },
  noAlertsTextBlock: { flex: 1 },
  noAlertsTitle: { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 2 },
  noAlertsSub: { fontSize: 12, color: '#4ADE80' },

  /* Settings Cards */
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    marginTop: WINDOW_HEIGHT * 0.025,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: { backgroundColor: '#F8FAFC' },
  rowItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  rowIconWrap: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  rowTextBlock: { flex: 1 },
  rowTitle: {
    fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 2,
  },
  rowSub: {
    fontSize: 13, color: colors.textMuted,
  },

  /* Section */
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.5, marginTop: WINDOW_HEIGHT * 0.04, marginBottom: 14,
    textAlign: 'center',
  },

  /* Blockchain Visibility */
  visibilityCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 22,
  },
  visRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
  },
  visIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.successGreen,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  visTextBlock: { flex: 1 },
  visTitle: {
    fontSize: 15, fontWeight: '700', color: colors.white, marginBottom: 4,
  },
  visDesc: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19,
  },
  visDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 16,
  },

  /* Sessions */
  sessionCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: 18,
    marginTop: WINDOW_HEIGHT * 0.02, borderWidth: 1, borderColor: colors.border,
  },
  sessionCardCurrent: {
    borderColor: colors.successGreen, borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sessionIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  sessionIconCurrent: { backgroundColor: colors.successGreen },
  sessionInfo: { flex: 1 },
  sessionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionDevice: { fontSize: 15, fontWeight: '700', color: colors.primary },
  currentBadge: {
    backgroundColor: colors.successGreen, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  sessionIP: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  sessionDate: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  revokeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2',
  },
  revokeBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
});
