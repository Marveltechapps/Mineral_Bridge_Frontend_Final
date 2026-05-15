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

const { height: WH } = Dimensions.get('window');
const HEADER_TOP = Math.round(WH * 0.06);
const BLUE = '#51A2FF';

const CURR_OPTS = ['USD ($)'];
const APP_VERSION = '1.0.0';

export default function AppSettingsScreen({ navigation }) {
  const [s, setS] = useState({
    language: 'English',
    currency: 'USD ($)',
    orderUpdates: true,
    kycUpdates: true,
  });
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      (async () => {
        try {
          const res = await fetchWithAuth('/api/app-settings');
          if (res.ok) {
            const data = await res.json();
            const incomingCurrency = data.currency;
            const currencyOk = CURR_OPTS.includes(incomingCurrency);
            setS((prev) => ({
              ...prev,
              ...data,
              currency: currencyOk ? incomingCurrency : 'USD ($)',
            }));
            if (!currencyOk) {
              fetchWithAuth('/api/app-settings', {
                method: 'PUT',
                body: JSON.stringify({ currency: 'USD ($)' }),
              }).catch(() => {});
            }
          }
        } catch { /* ignore */ }
        setLoading(false);
      })();
      return undefined;
    }, []),
  );

  const save = async (key, value) => {
    setS((prev) => ({ ...prev, [key]: value }));
    try {
      await fetchWithAuth('/api/app-settings', {
        method: 'PUT',
        body: JSON.stringify({ [key]: value }),
      });
    } catch { /* ignore */ }
  };

  const onPick = (option) => {
    if (picker) save(picker, option);
    setPicker(null);
  };

  const getPickerData = () => {
    switch (picker) {
      case 'currency': return { title: 'Select Currency', opts: CURR_OPTS, current: s.currency };
      default: return null;
    }
  };

  const onConfirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetchWithAuth('/api/app-settings/delete-account', { method: 'POST' });
      const data = await res.json();
      setShowDeleteConfirm(false);
      Alert.alert('Request Submitted', data.message || 'Your deletion request is under review.');
    } catch {
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    }
    setDeleting(false);
  };

  const pd = getPickerData();

  if (loading) {
    return (
      <View style={[st.wrapper, st.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={st.wrapper}>
      {/* Header */}
      <View style={st.header}>
        <View style={st.headerRow}>
          <Pressable style={({ pressed }) => [st.backBtn, pressed && st.backBtnH]} onPress={() => navigation.goBack()}>
            <Icon name="chevronLeft" size={24} color={BLUE} />
          </Pressable>
          <View style={st.hTitleBlock}>
            <View style={st.hIconWrap}>
              <Icon name="settings" size={20} color={colors.primary} />
            </View>
            <Text style={st.hTitle}>APP SETTINGS</Text>
          </View>
          <View style={st.hRight} />
        </View>
      </View>

      <ScrollView style={st.scroll} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* ── PREFERENCES ── */}
        <View style={st.card}>
          <View style={st.settingRow}>
            <View style={st.settingIconWrap}>
              <Icon name="globe" size={20} color={colors.textMuted} />
            </View>
            <Text style={st.settingLabel}>Language</Text>
            <Text style={st.settingValue}>English</Text>
          </View>
          <View style={st.div} />
          <SettingPicker icon="card" label="Currency" value={s.currency} onPress={() => setPicker('currency')} />
        </View>

        {/* ── NOTIFICATIONS ── */}
        <Text style={st.secTitle}>NOTIFICATIONS</Text>
        <View style={st.card}>
          <SettingToggle label="Order Updates" value={s.orderUpdates} onChange={(v) => save('orderUpdates', v)} />
          <View style={st.div} />
          <SettingToggle label="KYC Updates" value={s.kycUpdates} onChange={(v) => save('kycUpdates', v)} />
        </View>

        {/* ── ABOUT ── */}
        <Text style={st.secTitle}>ABOUT</Text>
        <View style={st.card}>
          <View style={st.aboutRow}>
            <Text style={st.aboutLabel}>App Version</Text>
            <Text style={st.aboutValue}>{APP_VERSION}</Text>
          </View>
          <View style={st.div} />
          <TouchableOpacity style={st.aboutRow} activeOpacity={0.6} onPress={() => navigation.navigate('TermsOfService')}>
            <Text style={st.aboutLabel}>Terms of Service</Text>
            <Icon name="chevronRight" size={16} color={colors.textLight} />
          </TouchableOpacity>
          <View style={st.div} />
          <TouchableOpacity style={st.aboutRow} activeOpacity={0.6} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={st.aboutLabel}>Privacy Policy</Text>
            <Icon name="chevronRight" size={16} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* ── DELETE ACCOUNT ── */}
        {!showDeleteConfirm ? (
          <TouchableOpacity style={st.deleteBtn} activeOpacity={0.6} onPress={() => setShowDeleteConfirm(true)}>
            <View style={st.deleteIconWrap}>
              <Icon name="closeCircle" size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.deleteLabel}>Delete Account</Text>
              <Text style={st.deleteSub}>Permanently remove your account and data</Text>
            </View>
            <Icon name="chevronRight" size={16} color={colors.textLight} />
          </TouchableOpacity>
        ) : (
          <View style={st.deleteConfirmCard}>
            <View style={st.deleteConfirmIconWrap}>
              <Icon name="warning" size={28} color={colors.white} />
            </View>
            <Text style={st.deleteConfirmTitle}>Delete Your Account?</Text>
            <Text style={st.deleteConfirmDesc}>
              This action is irreversible. All your data including orders, payment methods, KYC documents, and transaction history will be permanently removed.
            </Text>
            <View style={st.deleteConfirmDivider} />
            <Text style={st.deleteConfirmNote}>
              Your request will be reviewed and processed within 48 hours. You will receive a confirmation once complete.
            </Text>
            <View style={st.deleteConfirmBtns}>
              <TouchableOpacity
                style={st.deleteConfirmCancel}
                activeOpacity={0.7}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={st.deleteConfirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={st.deleteConfirmSubmit}
                activeOpacity={0.7}
                onPress={onConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size={16} color={colors.white} />
                ) : (
                  <Text style={st.deleteConfirmSubmitText}>Delete My Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Picker overlay */}
      {pd && (
        <>
          <Pressable style={st.overlay} onPress={() => setPicker(null)} />
          <View style={st.sheet}>
            <Text style={st.sheetTitle}>{pd.title}</Text>
            <ScrollView style={st.sheetScroll} showsVerticalScrollIndicator>
              {pd.opts.map((opt) => (
                <TouchableOpacity key={opt} style={st.sheetOpt} onPress={() => onPick(opt)} activeOpacity={0.7}>
                  <Text style={[st.sheetOptText, pd.current === opt && st.sheetOptActive]}>{opt}</Text>
                  {pd.current === opt && <Icon name="check" size={18} color={BLUE} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

function SettingPicker({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity style={st.settingRow} activeOpacity={0.6} onPress={onPress}>
      {icon && (
        <View style={st.settingIconWrap}>
          <Icon name={icon} size={20} color={colors.textMuted} />
        </View>
      )}
      <Text style={st.settingLabel}>{label}</Text>
      <Text style={st.settingValue}>{value}</Text>
      <Icon name="chevronRight" size={16} color={colors.textLight} />
    </TouchableOpacity>
  );
}

function SettingToggle({ label, value, onChange }) {
  return (
    <View style={st.toggleRow}>
      <Text style={st.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E2E8F0', true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const st = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

  header: {
    backgroundColor: '#EFF6FF', borderBottomWidth: 1.25, borderBottomColor: '#DBEAFE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    borderBottomLeftRadius: 35, borderBottomRightRadius: 35,
    paddingTop: 12 + HEADER_TOP, paddingBottom: 20, paddingHorizontal: 21,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backBtnH: { backgroundColor: 'rgba(81,162,255,0.25)' },
  hTitleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  hIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  hTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  hRight: { width: 44 },

  card: {
    backgroundColor: colors.white, borderRadius: 18,
    paddingHorizontal: 18, paddingVertical: 6,
    marginTop: WH * 0.02, borderWidth: 1, borderColor: colors.border,
  },
  div: { height: 1, backgroundColor: colors.border },

  secTitle: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.5, marginTop: WH * 0.035, marginBottom: 4, paddingLeft: 4,
  },

  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  settingIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary },
  settingValue: { fontSize: 14, color: colors.textMuted, marginRight: 4 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16,
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.primary },

  aboutRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16,
  },
  aboutLabel: { fontSize: 15, fontWeight: '600', color: colors.primary },
  aboutValue: { fontSize: 14, color: colors.textMuted },

  /* Delete Account Button */
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FEF2F2', borderRadius: 18,
    paddingHorizontal: 18, paddingVertical: 18,
    marginTop: WH * 0.035, borderWidth: 1, borderColor: '#FECACA',
  },
  deleteIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteLabel: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  deleteSub: { fontSize: 12, color: '#F87171', marginTop: 1 },

  /* Delete Confirmation Card */
  deleteConfirmCard: {
    backgroundColor: colors.primary, borderRadius: 20,
    padding: 28, marginTop: WH * 0.035, alignItems: 'center',
  },
  deleteConfirmIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  deleteConfirmTitle: {
    fontSize: 18, fontWeight: '800', color: colors.white, marginBottom: 12, textAlign: 'center',
  },
  deleteConfirmDesc: {
    fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 21, textAlign: 'center',
  },
  deleteConfirmDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'stretch', marginVertical: 18,
  },
  deleteConfirmNote: {
    fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 19, textAlign: 'center', marginBottom: 22,
  },
  deleteConfirmBtns: {
    flexDirection: 'row', gap: 12, alignSelf: 'stretch',
  },
  deleteConfirmCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center',
  },
  deleteConfirmCancelText: { fontSize: 14, fontWeight: '700', color: colors.white },
  deleteConfirmSubmit: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#DC2626', alignItems: 'center',
  },
  deleteConfirmSubmitText: { fontSize: 14, fontWeight: '700', color: colors.white },

  /* Picker */
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 998,
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: WH * 0.6,
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingBottom: 40, paddingHorizontal: 24, zIndex: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20,
  },
  sheetScroll: { flexGrow: 0 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.primary, marginBottom: 16, textAlign: 'center' },
  sheetOpt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sheetOptText: { fontSize: 15, color: colors.text },
  sheetOptActive: { fontWeight: '700', color: BLUE },
});
