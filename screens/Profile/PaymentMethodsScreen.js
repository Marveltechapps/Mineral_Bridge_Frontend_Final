import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';
const DARK_NAVY = '#1A1F36';
const VERIFIED_GREEN = '#00A63E';
const VERIFIED_BG = '#E6F8ED';

const EMPTY_BANK = { holderName: '', bankName: '', accountNumber: '', swift: '' };
const EMPTY_CRYPTO = { label: '', network: '', address: '' };
const NETWORK_OPTIONS = ['TRC-20', 'ERC-20', 'BEP-20'];

export default function PaymentMethodsScreen({ navigation }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formType, setFormType] = useState('Bank');
  const [bankForm, setBankForm] = useState({ ...EMPTY_BANK });
  const [cryptoForm, setCryptoForm] = useState({ ...EMPTY_CRYPTO });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/payment-methods');
      if (res.ok) {
        const data = await res.json();
        setMethods(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      load();
      return undefined;
    }, [load]),
  );

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormType('Bank');
    setBankForm({ ...EMPTY_BANK });
    setCryptoForm({ ...EMPTY_CRYPTO });
  };

  const onAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const onEdit = async (m) => {
    setLoading(true);
    let data = m;
    try {
      const res = await fetchWithAuth(`/api/payment-methods/${m.id}`);
      if (res.ok) {
        data = await res.json();
      }
    } catch { /* fall back to list data */ }
    setEditingId(data.id);
    setFormType(data.type || 'Bank');
    if (data.type === 'Crypto') {
      setCryptoForm({ label: data.label || '', network: data.network || '', address: data.address || '' });
    } else {
      setBankForm({
        holderName: data.holderName || '',
        bankName: data.bankName || '',
        accountNumber: data.accountNumber || '',
        swift: data.swift || '',
      });
    }
    setLoading(false);
    setShowForm(true);
  };

  const onDelete = (m) => {
    Alert.alert('Remove', `Remove ${m.bankName || m.label || 'this method'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await fetchWithAuth(`/api/payment-methods/${m.id}`, { method: 'DELETE' });
            load();
          } catch { Alert.alert('Error', 'Could not remove.'); }
        },
      },
    ]);
  };

  const canSave = formType === 'Bank'
    ? bankForm.holderName.trim() && bankForm.bankName.trim() && (editingId || bankForm.accountNumber.trim())
    : cryptoForm.label.trim() && cryptoForm.network.trim() && (editingId || cryptoForm.address.trim());

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      let body;
      if (formType === 'Bank') {
        body = {
          type: 'Bank',
          holderName: bankForm.holderName,
          bankName: bankForm.bankName,
          accountNumber: bankForm.accountNumber,
          swift: bankForm.swift,
        };
      } else {
        body = {
          type: 'Crypto',
          label: cryptoForm.label,
          network: cryptoForm.network,
          address: cryptoForm.address,
        };
      }
      const url = editingId ? `/api/payment-methods/${editingId}` : '/api/payment-methods';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      resetForm();
      await load();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save.');
    }
    setSaving(false);
  };

  const onBack = () => {
    if (showForm) { resetForm(); return; }
    navigation.goBack();
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    const now = new Date();
    const isToday = dt.toDateString() === now.toDateString();
    const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Last used: Today, ${time}`;
    return `Last used: ${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconWrap}>
              <Icon name={showForm ? (editingId ? 'create' : 'add') : 'wallet'} size={20} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>
              {showForm ? (editingId ? 'EDIT PAYMENT METHOD' : 'ADD PAYMENT METHOD') : 'PAYMENT METHODS'}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : showForm ? (
        /* ───── ADD / EDIT FORM ───── */
        <ScrollView style={styles.scroll} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
          {/* Type Toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeBtn, formType === 'Bank' && styles.typeBtnActive]}
              onPress={() => setFormType('Bank')}
              activeOpacity={0.7}
            >
              <Text style={[styles.typeBtnText, formType === 'Bank' && styles.typeBtnTextActive]}>Bank Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, formType === 'Crypto' && styles.typeBtnActive]}
              onPress={() => setFormType('Crypto')}
              activeOpacity={0.7}
            >
              <Text style={[styles.typeBtnText, formType === 'Crypto' && styles.typeBtnTextActive]}>Crypto Wallet</Text>
            </TouchableOpacity>
          </View>

          {formType === 'Bank' ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Account Holder Name</Text>
                <TextInput
                  style={styles.input}
                  value={bankForm.holderName}
                  onChangeText={(t) => setBankForm((f) => ({ ...f, holderName: t }))}
                  placeholder="e.g. Abeba Kibret"
                  placeholderTextColor={colors.textLight}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Bank Name</Text>
                <TextInput
                  style={styles.input}
                  value={bankForm.bankName}
                  onChangeText={(t) => setBankForm((f) => ({ ...f, bankName: t }))}
                  placeholder="e.g. Commercial Bank of Ethiopia"
                  placeholderTextColor={colors.textLight}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Account Number</Text>
                <TextInput
                  style={styles.input}
                  value={bankForm.accountNumber}
                  onChangeText={(t) => setBankForm((f) => ({ ...f, accountNumber: t }))}
                  placeholder="0000000000"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>SWIFT / BIC Code (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={bankForm.swift}
                  onChangeText={(t) => setBankForm((f) => ({ ...f, swift: t }))}
                  placeholder="CBETETAA"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="characters"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, (!canSave || saving) && styles.submitBtnDisabled]}
                onPress={onSave}
                disabled={!canSave || saving}
                activeOpacity={0.8}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.submitBtnText}>{editingId ? 'Update Bank Account' : 'Link Bank Account'}</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Wallet Label</Text>
                <TextInput
                  style={styles.input}
                  value={cryptoForm.label}
                  onChangeText={(t) => setCryptoForm((f) => ({ ...f, label: t }))}
                  placeholder="e.g. Corporate USDT Vault"
                  placeholderTextColor={colors.textLight}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Network</Text>
                <View style={styles.networkPills}>
                  {NETWORK_OPTIONS.map((net) => (
                    <TouchableOpacity
                      key={net}
                      style={[styles.networkPill, cryptoForm.network === net && styles.networkPillActive]}
                      onPress={() => setCryptoForm((f) => ({ ...f, network: net }))}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.networkPillText, cryptoForm.network === net && styles.networkPillTextActive]}>{net}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Wallet Address</Text>
                <TextInput
                  style={styles.input}
                  value={cryptoForm.address}
                  onChangeText={(t) => setCryptoForm((f) => ({ ...f, address: t }))}
                  placeholder="0x..."
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, (!canSave || saving) && styles.submitBtnDisabled]}
                onPress={onSave}
                disabled={!canSave || saving}
                activeOpacity={0.8}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.submitBtnText}>{editingId ? 'Update Wallet' : 'Verify & Link Wallet'}</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* Security Verification */}
          <View style={styles.securityCard}>
            <Icon name="shieldCheck" size={20} color={DROPDOWN_BLUE} />
            <View style={styles.securityTextWrap}>
              <Text style={styles.securityTitle}>Security Verification</Text>
              <Text style={styles.securityDesc}>
                For your security, adding a new payment method requires 2FA verification before it can be used for withdrawals.
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ───── LIST VIEW ───── */
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>LINKED ACCOUNTS</Text>

          {methods.length === 0 && (
            <View style={styles.emptyWrap}>
              <Icon name="wallet" size={40} color={colors.textLight} />
              <Text style={styles.emptyText}>No verified payout method yet. Add one to receive secure settlements.</Text>
            </View>
          )}

          {methods.filter((m) => m.type === 'Bank').map((m) => (
            <View key={m.id} style={styles.methodCard}>
              <View style={styles.methodTop}>
                <View style={styles.methodInitials}>
                  <Text style={styles.methodInitialsText}>{getInitials(m.bankName)}</Text>
                </View>
                <View style={styles.methodInfo}>
                  <View style={styles.methodNameRow}>
                    <Text style={styles.methodName} numberOfLines={1}>{m.bankName || 'Bank Account'}</Text>
                    {m.verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.methodDetail}>{m.accountNumber || '••••'} · Primary Payout</Text>
                </View>
              </View>
              <View style={styles.methodBottom}>
                <Text style={styles.methodDate}>{formatDate(m.createdAt)}</Text>
                <View style={styles.methodActions}>
                  <TouchableOpacity onPress={() => onEdit(m)} activeOpacity={0.7}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(m)} activeOpacity={0.7}>
                    <Text style={styles.removeLink}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {methods.filter((m) => m.type === 'Crypto').map((m) => (
            <View key={m.id} style={styles.methodCard}>
              <View style={styles.methodTop}>
                <View style={[styles.methodInitials, styles.cryptoInitials]}>
                  <Icon name="globe" size={20} color={DROPDOWN_BLUE} />
                </View>
                <View style={styles.methodInfo}>
                  <View style={styles.methodNameRow}>
                    <Text style={styles.methodName} numberOfLines={1}>{m.label || 'Crypto Wallet'}</Text>
                    {m.verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.methodDetail}>{m.address || '••••'}</Text>
                </View>
              </View>
              <View style={styles.methodBottom}>
                <Text style={styles.methodDate}>{formatDate(m.createdAt)}</Text>
                <View style={styles.methodActions}>
                  <TouchableOpacity onPress={() => onEdit(m)} activeOpacity={0.7}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(m)} activeOpacity={0.7}>
                    <Text style={styles.removeLink}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addNewBtn} onPress={onAddNew} activeOpacity={0.7}>
            <Icon name="add" size={20} color={colors.textMuted} />
            <Text style={styles.addNewText}>Add New Method</Text>
          </TouchableOpacity>

          <View style={styles.settlementCard}>
            <View style={styles.settlementIconWrap}>
              <Icon name="cube" size={20} color={DROPDOWN_BLUE} />
            </View>
            <View style={styles.settlementTextWrap}>
              <Text style={styles.settlementTitle}>Blockchain Settlement</Text>
              <Text style={styles.settlementDesc}>
                Payments are settlement-linked to blockchain events. Your fiat accounts are used only for on/off-ramping funds.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  headerTitleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  headerRight: { width: 44 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },
  formContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  /* ── Type Toggle ── */
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: DROPDOWN_BLUE,
  },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  typeBtnTextActive: { color: DROPDOWN_BLUE, fontWeight: '700' },

  /* ── Form ── */
  fieldGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.primary,
  },

  networkPills: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  networkPill: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  networkPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  networkPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  networkPillTextActive: {
    color: '#FFFFFF',
  },

  submitBtn: {
    backgroundColor: DARK_NAVY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

  /* ── Security Card ── */
  securityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginTop: '6%',
  },
  securityTextWrap: { flex: 1 },
  securityTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  securityDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },

  /* ── List ── */
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 16,
  },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, color: colors.textMuted, marginTop: 12 },

  methodCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  methodInitials: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: DARK_NAVY,
    alignItems: 'center', justifyContent: 'center',
  },
  cryptoInitials: { backgroundColor: '#EFF6FF' },
  methodInitialsText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  methodInfo: { flex: 1 },
  methodNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodName: { fontSize: 15, fontWeight: '700', color: colors.primary, flexShrink: 1 },
  verifiedBadge: {
    backgroundColor: VERIFIED_BG,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: VERIFIED_GREEN },
  methodDetail: { fontSize: 13, color: colors.textMuted, marginTop: 3, fontWeight: '500' },
  methodBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  methodDate: { fontSize: 12, color: colors.textLight, fontWeight: '500' },
  methodActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  editLink: { fontSize: 13, fontWeight: '700', color: DROPDOWN_BLUE },
  removeLink: { fontSize: 13, fontWeight: '700', color: colors.error },

  addNewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.white, borderRadius: 14, paddingVertical: 16,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    marginBottom: 24,
  },
  addNewText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },

  settlementCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  settlementIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  settlementTextWrap: { flex: 1 },
  settlementTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  settlementDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
});
