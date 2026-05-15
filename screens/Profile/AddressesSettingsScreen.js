import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Pressable,
  Dimensions,
  Switch,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickDocumentStable } from '../../lib/stablePicker';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
import { getFormDrafts, saveFormDraft } from '../../lib/services';
import { useDebouncedFormDraft } from '../../lib/useFormDraft';
import { COUNTRIES, getCountryByCode } from '../../lib/countries';
import { getStatesForCountry, validatePostalCode } from '../../lib/countriesStates';
import { validatePhone, getPhonePlaceholder, formatPhoneAsYouType } from '../../lib/phoneValidation';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';
const PROOF_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ADDRESSES_PROOF_PICKED_KEY = 'addresses_proof_file';

const EMPTY_FORM = {
  facilityName: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  countryCode: 'ET',
  phone: '',
  email: '',
  institutionalPermitNumber: '',
  regulatoryCompliance: false,
  isDefault: true,
};

export default function AddressesSettingsScreen({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [pickingProof, setPickingProof] = useState(false);
  const [addressDraft, setAddressDraft] = useState(null);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const phoneCountry = getCountryByCode(form.countryCode);
  const stateOptions = getStatesForCountry(form.countryCode);
  const phoneDigits = (form.phone || '').replace(/\D/g, '');
  const phoneValidation = validatePhone(phoneCountry, phoneDigits);
  const minPhoneLen = (phoneCountry?.lengths?.[0]) || 6;
  const showPhoneInvalid = phoneDigits.length >= minPhoneLen && !phoneValidation.valid;

  const load = () => {
    setLoading(true);
    fetchWithAuth('/api/addresses')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAddresses(Array.isArray(data) ? data : []))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    getFormDrafts()
      .then((drafts) => {
        if (drafts?.profileAddressForm && typeof drafts.profileAddressForm === 'object') {
          setAddressDraft(drafts.profileAddressForm);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ADDRESSES_PROOF_PICKED_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const data = JSON.parse(raw);
          if (data?.uri) setProofFile({ name: data.name, size: data.size, uri: data.uri });
        } catch (_) {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useDebouncedFormDraft(
    showForm ? 'profileAddressForm' : null,
    showForm
      ? {
          facilityName: form.facilityName,
          street: form.street,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
          countryCode: form.countryCode,
          phone: form.phone,
          email: form.email,
          institutionalPermitNumber: form.institutionalPermitNumber,
          regulatoryCompliance: form.regulatoryCompliance,
          isDefault: form.isDefault,
        }
      : {},
    {
      deps: [
        showForm,
        form.facilityName,
        form.street,
        form.city,
        form.state,
        form.postalCode,
        form.country,
        form.countryCode,
        form.phone,
        form.email,
        form.institutionalPermitNumber,
        form.regulatoryCompliance,
        form.isDefault,
      ],
    }
  );

  const canSave =
    form.facilityName?.trim() &&
    form.street?.trim() &&
    form.city?.trim() &&
    form.state?.trim() &&
    form.postalCode?.trim() &&
    form.country?.trim() &&
    phoneDigits.length >= minPhoneLen &&
    phoneValidation.valid &&
    form.email?.trim() &&
    form.regulatoryCompliance;

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setProofFile(null);
    setOpenDropdown(null);
    setShowForm(false);
    AsyncStorage.removeItem(ADDRESSES_PROOF_PICKED_KEY).catch(() => {});
  };

  const onAddNew = () => {
    setForm({
      ...EMPTY_FORM,
      isDefault: addresses.length === 0,
      ...(addressDraft && typeof addressDraft === 'object' ? addressDraft : {}),
    });
    setEditingId(null);
    setProofFile(null);
    setShowForm(true);
  };

  const onEdit = (addr) => {
    const code = COUNTRIES.find((c) => c.name === addr.country)?.code || 'ET';
    setForm({
      facilityName: addr.facilityName || addr.label || '',
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      country: addr.country || '',
      countryCode: addr.countryCode || code,
      phone: (addr.phone || '').replace(/\D/g, ''),
      email: addr.email || '',
      institutionalPermitNumber: addr.institutionalPermitNumber || '',
      regulatoryCompliance: Boolean(addr.regulatoryCompliance),
      isDefault: Boolean(addr.isDefault),
    });
    setEditingId(addr.id);
    setProofFile(null);
    setShowForm(true);
  };

  const onDelete = (addr) => {
    Alert.alert(
      'Delete Address',
      `Remove "${addr.facilityName || addr.label || 'this address'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetchWithAuth(`/api/addresses/${addr.id}`, { method: 'DELETE' });
              if (res.ok) load();
              else Alert.alert('Error', 'Failed to delete address.');
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const saveAddress = async () => {
    if (!canSave) return;
    const postalCheck = validatePostalCode(form.postalCode.trim(), form.countryCode);
    if (!postalCheck.valid) {
      Alert.alert('Invalid postal code', postalCheck.message || 'Please enter a valid postal code.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        label: form.facilityName.trim() || 'Address',
        facilityName: form.facilityName.trim() || '',
          street: form.street.trim(),
          city: form.city.trim(),
        state: form.state.trim(),
          country: form.country.trim(),
        postalCode: form.postalCode.trim(),
        phone: phoneDigits,
        email: form.email.trim(),
        countryCode: phoneCountry.dial,
        institutionalPermitNumber: form.institutionalPermitNumber?.trim() || undefined,
        proofOfFacilityUrl: null,
        regulatoryCompliance: form.regulatoryCompliance,
        isDefault: form.isDefault,
      };
      const url = editingId ? `/api/addresses/${editingId}` : '/api/addresses';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to save');
      saveFormDraft('profileAddressForm', {
        facilityName: form.facilityName,
        street: form.street,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
        countryCode: form.countryCode,
        phone: form.phone,
        email: form.email,
        institutionalPermitNumber: form.institutionalPermitNumber,
        regulatoryCompliance: form.regulatoryCompliance,
        isDefault: form.isDefault,
      }).catch(() => {});
      resetForm();
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const pickProofFile = () => {
    if (pickingProof) return;
    setPickingProof(true);
    pickDocumentStable(
      { type: ['image/*', 'application/pdf'], maxBytes: PROOF_MAX_BYTES },
      (file) => {
        if (!isMounted.current) { setPickingProof(false); return; }
        if (file && file.uri) {
          const data = { name: file.name, size: file.size, uri: file.uri };
          InteractionManager.runAfterInteractions(() => {
            if (!isMounted.current) { setPickingProof(false); return; }
            setProofFile(data);
            AsyncStorage.setItem(ADDRESSES_PROOF_PICKED_KEY, JSON.stringify(data)).catch(() => {});
            setPickingProof(false);
          });
        } else {
          setPickingProof(false);
        }
      },
      (msg) => {
        if (!isMounted.current) { setPickingProof(false); return; }
        if (msg === 'File too large') Alert.alert('File too large', 'Please choose a file up to 5MB.');
        else if (msg) Alert.alert('Error', msg || 'Could not open file picker.');
        setPickingProof(false);
      },
      () => {
        if (isMounted.current) setPickingProof(false);
      }
    );
  };

  const closeDropdown = () => setOpenDropdown(null);

  if (loading && addresses.length === 0 && !showForm) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]}
            onPress={() => (showForm ? resetForm() : navigation.goBack())}
          >
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconWrap}>
              <Icon name="location" size={20} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>INSTITUTIONAL ADDRESSES</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showForm ? (
          <View style={styles.formSection}>
            <View style={styles.field}>
              <Text style={styles.label}>Facility/Business Name *</Text>
              <TextInput
                style={styles.input}
                value={form.facilityName}
                onChangeText={(v) => setForm((f) => ({ ...f, facilityName: v }))}
                placeholder="e.g. Export Warehouse B"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Country *</Text>
              <Pressable
                style={[styles.dropdown, openDropdown === 'country' && styles.dropdownOpen]}
                onPress={() => setOpenDropdown(openDropdown === 'country' ? null : 'country')}
              >
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {form.country || 'Select country'}
                </Text>
                <Icon name="chevronDown" size={18} color={colors.textMuted} />
              </Pressable>
              {openDropdown === 'country' && (
                <View style={styles.dropdownList}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
                    {COUNTRIES.map((c) => (
                      <Pressable
                        key={c.code}
                        style={[styles.dropdownOption, c.name === form.country && styles.dropdownOptionSelected]}
                        onPress={() => {
                          setForm((f) => ({ ...f, country: c.name, countryCode: c.code, state: '' }));
                          closeDropdown();
                        }}
                      >
                        <Text style={styles.dropdownOptionText} numberOfLines={1}>{c.name}</Text>
                        {c.name === form.country && <Icon name="check" size={18} color={colors.primary} />}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>State/Region *</Text>
              {stateOptions.length > 0 ? (
                <>
                  <Pressable
                    style={[styles.dropdown, openDropdown === 'state' && styles.dropdownOpen]}
                    onPress={() => setOpenDropdown(openDropdown === 'state' ? null : 'state')}
                  >
                    <Text style={styles.dropdownText} numberOfLines={1}>
                      {form.state || 'Select state/region'}
                    </Text>
                    <Icon name="chevronDown" size={18} color={colors.textMuted} />
                  </Pressable>
                  {openDropdown === 'state' && (
                    <View style={styles.dropdownList}>
                      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
                        {stateOptions.map((opt) => (
                          <Pressable
                            key={opt}
                            style={[styles.dropdownOption, opt === form.state && styles.dropdownOptionSelected]}
                            onPress={() => {
                              setForm((f) => ({ ...f, state: opt }));
                              closeDropdown();
                            }}
                          >
                            <Text style={styles.dropdownOptionText} numberOfLines={1}>{opt}</Text>
                            {opt === form.state && <Icon name="check" size={18} color={colors.primary} />}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              ) : (
                <TextInput
                  style={styles.input}
                  value={form.state}
                  onChangeText={(v) => setForm((f) => ({ ...f, state: v }))}
                  placeholder="e.g. Addis Ababa"
                  placeholderTextColor={colors.textLight}
                />
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                value={form.city}
                onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
                placeholder="e.g. Addis Ababa"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Street Address *</Text>
              <TextInput
                style={styles.input}
                value={form.street}
                onChangeText={(v) => setForm((f) => ({ ...f, street: v }))}
                placeholder="e.g. Kality Industrial Zone"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Postal Code *</Text>
              <TextInput
                style={styles.input}
                value={form.postalCode}
                onChangeText={(v) => setForm((f) => ({ ...f, postalCode: v }))}
                placeholder="e.g. 1000"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="logistics@company.com"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={[styles.phoneRow, showPhoneInvalid && styles.phoneRowInvalid]}>
                <View style={styles.phoneDialBox}>
                  <Text style={styles.phoneDialText}>{phoneCountry?.dial || '+251'}</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phoneDigits ? formatPhoneAsYouType(form.countryCode, phoneDigits) : ''}
                  onChangeText={(v) => {
                    const digits = v.replace(/\D/g, '').slice(0, (phoneCountry?.lengths?.[1]) || 15);
                    setForm((f) => ({ ...f, phone: digits }));
                  }}
                  placeholder={getPhonePlaceholder(form.countryCode)}
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                />
              </View>
              {showPhoneInvalid && (
                <Text style={styles.phoneError}>{phoneValidation.message}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Institutional Permit Number</Text>
              <TextInput
                style={styles.input}
                value={form.institutionalPermitNumber}
                onChangeText={(v) => setForm((f) => ({ ...f, institutionalPermitNumber: v }))}
                placeholder="Optional"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Proof of Facility Address</Text>
              <Pressable style={styles.uploadArea} onPress={pickProofFile}>
                {proofFile == null ? (
                  <>
                    <Icon name="upload" size={24} color={colors.textLight} />
                    <Text style={styles.uploadTitle}>SELECT FILE TO UPLOAD</Text>
                    <Text style={styles.uploadSub}>PDF, PNG, JPG (Max 5MB)</Text>
                  </>
                ) : (
                  <Text style={styles.uploadFileName} numberOfLines={2}>{proofFile.name}</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.complianceRow}>
              <View style={styles.complianceTextWrap}>
                <Text style={styles.complianceTitle}>Regulatory Compliance</Text>
                <Text style={styles.complianceSub}>I confirm adherence to safety and AML regulations.</Text>
              </View>
              <Switch
                value={form.regulatoryCompliance}
                onValueChange={(v) => setForm((f) => ({ ...f, regulatoryCompliance: v }))}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.defaultRow}>
              <Text style={styles.defaultTitle}>Set as default address</Text>
              <Switch
                value={form.isDefault}
                onValueChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, canSave && styles.saveBtnEnabled, (!canSave || saving) && styles.saveBtnDisabled]}
                onPress={saveAddress}
                disabled={!canSave || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.registeredRow}>
              <Text style={styles.sectionLabel}>REGISTERED FACILITIES</Text>
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>{addresses.length} Total</Text>
              </View>
            </View>

            {addresses.map((addr) => (
              <View key={addr.id} style={styles.addressCard}>
                <View style={styles.addressCardContent}>
                  <View style={styles.addressIconWrap}>
                    <Icon name="building" size={20} color={DROPDOWN_BLUE} />
                  </View>
                  <View style={styles.addressCardText}>
                    <Text style={styles.addressCardTitle}>
                      {addr.facilityName || addr.label || 'Address'}
                    </Text>
                    <Text style={styles.addressCardStreet}>{addr.street || '—'}</Text>
                    <Text style={styles.addressCardCity}>
                      {[addr.city, addr.state, addr.country].filter(Boolean).join(', ') || '—'}
                    </Text>
                  </View>
                </View>
                <View style={styles.addressCardActions}>
                  <TouchableOpacity onPress={() => onEdit(addr)}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(addr)} style={styles.deleteBtn}>
                    <Icon name="trash" size={16} color={colors.error} />
                    <Text style={styles.deleteLink}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addNewBtn} onPress={onAddNew} activeOpacity={0.8}>
              <Icon name="add" size={24} color={DROPDOWN_BLUE} />
              <Text style={styles.addNewBtnText}>Add New Address</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  headerTitleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  headerRight: { width: 44 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  registeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalBadge: {
    backgroundColor: '#DBEAFE',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  totalBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  addressCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  addressCardContent: { flexDirection: 'row', alignItems: 'flex-start' },
  addressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  addressCardText: { flex: 1 },
  addressCardTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  addressCardStreet: { fontSize: 14, color: colors.textMuted, marginBottom: 2 },
  addressCardCity: { fontSize: 14, color: colors.textMuted, marginBottom: 12 },
  addressCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: Math.round(WINDOW_HEIGHT * 0.01),
  },
  editLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteLink: { fontSize: 14, fontWeight: '600', color: colors.error },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    borderStyle: 'dashed',
    backgroundColor: '#EFF6FF',
  },
  addNewBtnText: { fontSize: 15, fontWeight: '700', color: DROPDOWN_BLUE },
  formSection: { paddingTop: 8 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: colors.primary,
    backgroundColor: colors.white,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.white,
  },
  dropdownOpen: { borderColor: DROPDOWN_BLUE },
  dropdownText: { fontSize: 16, color: colors.primary, flex: 1 },
  dropdownList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginTop: 4,
    maxHeight: 200,
    backgroundColor: colors.white,
  },
  dropdownScroll: { maxHeight: 200 },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  dropdownOptionSelected: { backgroundColor: '#EFF6FF' },
  dropdownOptionText: { fontSize: 16, color: colors.primary },
  phoneRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  phoneRowInvalid: { borderColor: colors.error },
  phoneDialBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
  },
  phoneDialText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  phoneInput: { flex: 1, padding: 14, fontSize: 16, color: colors.primary },
  phoneError: { fontSize: 12, color: colors.error, marginTop: 4 },
  uploadArea: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
  },
  uploadTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 8 },
  uploadSub: { fontSize: 11, color: colors.textLight, marginTop: 4 },
  uploadFileName: { fontSize: 14, fontWeight: '600', color: colors.primary },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.borderLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  complianceTextWrap: { flex: 1, marginRight: 16 },
  complianceTitle: { fontSize: 14, fontWeight: '600', color: colors.primary },
  complianceSub: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  defaultTitle: { fontSize: 14, fontWeight: '600', color: colors.primary },
  formActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  saveBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  saveBtnEnabled: { backgroundColor: colors.primary },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
