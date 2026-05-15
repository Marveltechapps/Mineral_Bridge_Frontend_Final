import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Dimensions,
  Pressable,
  Alert,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickDocumentStable } from '../../lib/stablePicker';
import { Icon } from '../../lib/icons';
import { fetchWithAuth } from '../../lib/api';
import { getFormDrafts, saveFormDraft } from '../../lib/services';
import { useDebouncedFormDraft } from '../../lib/useFormDraft';
import { COUNTRIES, getCountryByCode } from '../../lib/countries';
import { getStatesForCountry, validatePostalCode } from '../../lib/countriesStates';
import { validatePhone, getPhonePlaceholder, formatPhoneAsYouType } from '../../lib/phoneValidation';
import { USE_CONFIRMED_PRICE_AUTHORITY } from '../../config/pricing';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');
const FIGMA_WIDTH = 380;
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);
const PROOF_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const HEADER_BLUE = '#51A2FF';
const STEP_LABEL = 'STEP 2 OF 3';
const BUY_DELIVERY_PROOF_PICKED_KEY = 'buy_delivery_proof_file';
const STEP_SUBLABEL = 'Step 2 follow these steps';
const PROGRESS_FRACTION = 2 / 3;
const DEFAULT_TRANSPORT = 1200;
const FEE_PERCENT = 0.01;

function parsePrice(priceDisplay) {
  if (priceDisplay == null || typeof priceDisplay !== 'string') return null;
  const match = String(priceDisplay).replace(/,/g, '').match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}
function fmtMoney(n) {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const EMPTY_FORM = {
  facilityName: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  countryCode: '',
  phone: '',
  email: '',
  permitNumber: '',
};

export default function DeliveryScreen({ route, navigation }) {
  const { mineral, quantity, unit = 'kg', mineralType, buyerCategory } = route.params || {};
  const [deliveryMethod, setDeliveryMethod] = useState('direct');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    city: '',
    state: '',
  });
  const [complianceAccepted, setComplianceAccepted] = useState(false);
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [proofFile, setProofFile] = useState(null); // { name, size, uri } or null
  const [openDropdown, setOpenDropdown] = useState(null); // 'state' | 'country' | null
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingLocation, setSavingLocation] = useState(false);
  const [placing, setPlacing] = useState(false);

  const phoneCountry = getCountryByCode(form.countryCode);
  const stateOptions = getStatesForCountry(form.countryCode);
  const phoneDigits = (form.phone || '').replace(/\D/g, '');
  const phoneValidation = validatePhone(phoneCountry, phoneDigits);
  const minPhoneLen = (phoneCountry.lengths && phoneCountry.lengths[0]) || 6;
  const showPhoneInvalid = phoneDigits.length >= minPhoneLen && !phoneValidation.valid;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAddresses(true);
      try {
        const [addrRes, drafts] = await Promise.all([
          fetchWithAuth('/api/addresses?usage=delivery'),
          getFormDrafts().catch(() => null),
        ]);
        if (cancelled) return;
        const raw = addrRes.status === 401 ? [] : await addrRes.json().catch(() => []);
        const list = (Array.isArray(raw) ? raw : []).filter(
          (a) => String(a?.usage || '').toLowerCase() !== 'pickup'
        );
        setSavedAddresses(list);

        const draft = drafts?.buyDelivery;
        if (draft && typeof draft === 'object') {
          const sel = draft.selectedAddressId;
          if (sel && list.some((a) => a.id === sel)) {
            setSelectedAddressId(sel);
            setShowForm(false);
          } else if (draft.showForm || draft.facilityName || draft.street || draft.city) {
            setShowForm(true);
            setForm((prev) => ({
              ...prev,
              facilityName: draft.facilityName ?? prev.facilityName ?? '',
              street: draft.street ?? prev.street ?? '',
              city: draft.city ?? prev.city ?? '',
              state: draft.state ?? prev.state ?? '',
              postalCode: draft.postalCode ?? prev.postalCode ?? '',
              country: draft.country ?? prev.country ?? '',
              countryCode: draft.countryCode ?? prev.countryCode ?? '',
              phone: draft.phone ?? prev.phone ?? '',
              email: draft.email ?? prev.email ?? '',
              permitNumber: draft.permitNumber ?? prev.permitNumber ?? '',
            }));
          }
        }
        const draftHadForm = draft?.showForm || draft?.facilityName || draft?.street || draft?.city;
        const draftHadValidAddress = draft?.selectedAddressId && list.some((a) => a.id === draft.selectedAddressId);
        // Delivery addresses only (usage=delivery) — separate from sell pickup addresses.
        if (list.length > 0 && !draftHadValidAddress && !draftHadForm) {
          const preferred = list.find((a) => a.isDefault) || list[0];
          setSelectedAddressId(preferred.id);
          setShowForm(false);
        }
      } catch (_) {
        if (!cancelled) setSavedAddresses([]);
      } finally {
        if (!cancelled) setLoadingAddresses(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onPressNewAddress = () => {
    setForm({ ...EMPTY_FORM, city: '', state: '' });
    setProofFile(null);
    setComplianceAccepted(false);
    setOpenDropdown(null);
    setShowForm(true);
  };

  const closeDropdown = () => setOpenDropdown(null);

  const buyDeliveryDraft = {
    selectedAddressId: showForm ? null : selectedAddressId,
    showForm,
    facilityName: form.facilityName,
    street: form.street,
    city: form.city,
    state: form.state,
    postalCode: form.postalCode,
    country: form.country,
    countryCode: form.countryCode,
    phone: form.phone,
    email: form.email,
    permitNumber: form.permitNumber,
  };
  useDebouncedFormDraft('buyDelivery', buyDeliveryDraft, {
    deps: [
      selectedAddressId,
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
      form.permitNumber,
    ],
  });

  const canSaveLocation =
    form.facilityName.trim() &&
    form.street.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.postalCode.trim() &&
    form.country.trim() &&
    phoneDigits.length >= minPhoneLen &&
    phoneValidation.valid &&
    form.email.trim();

  const canProceed = !showForm && selectedAddressId != null;

  const [pickingProof, setPickingProof] = useState(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(BUY_DELIVERY_PROOF_PICKED_KEY)
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

  const pickProofFile = () => {
    setPickingProof(true);
    pickDocumentStable(
      { type: ['image/*', 'application/pdf'], maxBytes: PROOF_MAX_BYTES },
      (file) => {
        if (!isMounted.current) { setPickingProof(false); return; }
        const data = { name: file.name, size: file.size, uri: file.uri };
        InteractionManager.runAfterInteractions(() => {
          if (!isMounted.current) { setPickingProof(false); return; }
          setProofFile(data);
          AsyncStorage.setItem(BUY_DELIVERY_PROOF_PICKED_KEY, JSON.stringify(data)).catch(() => {});
          setPickingProof(false);
        });
      },
      (msg) => {
        if (isMounted.current) {
          if (msg === 'File too large') Alert.alert('File too large', 'Please choose a file up to 5MB.');
          else if (msg) Alert.alert('Error', msg);
        }
        if (isMounted.current) setPickingProof(false);
      },
      () => { if (isMounted.current) setPickingProof(false); }
    );
  };

  const onSaveLocation = async () => {
    if (!canSaveLocation) return;
    const postalCheck = validatePostalCode(form.postalCode.trim(), form.countryCode);
    if (!postalCheck.valid) {
      Alert.alert('Invalid postal code', postalCheck.message || 'Please enter a valid postal code for the selected country.');
      return;
    }
    if (!phoneValidation.valid) {
      Alert.alert('Invalid phone', phoneValidation.message || 'Please enter a valid phone number.');
      return;
    }
    setSavingLocation(true);
    try {
      const body = {
        usage: 'delivery',
        label: form.facilityName.trim() || 'Address',
        facilityName: form.facilityName.trim() || '',
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country,
        postalCode: form.postalCode.trim(),
        phone: phoneDigits,
        email: form.email.trim(),
        countryCode: phoneCountry.dial,
        institutionalPermitNumber: form.permitNumber.trim() || undefined,
        proofOfFacilityUrl: null,
        regulatoryCompliance: complianceAccepted,
        isDefault: savedAddresses.length === 0,
      };
      const res = await fetchWithAuth('/api/addresses', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        Alert.alert('Sign in required', 'Please sign in to save addresses and complete the order.');
        setSavingLocation(false);
        return;
      }
      if (!res.ok) {
        Alert.alert('Error', data.error || data.message || 'Failed to save address.');
        setSavingLocation(false);
        return;
      }
      const newAddress = {
        id: data.id || data._id,
        label: data.label || body.label,
        street: data.street,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        phone: data.phone,
        countryCode: data.countryCode,
        email: data.email,
      };
      setSavedAddresses((prev) => [...prev, newAddress]);
      setSelectedAddressId(newAddress.id);
      setShowForm(false);
      AsyncStorage.removeItem(BUY_DELIVERY_PROOF_PICKED_KEY).catch(() => {});
      saveFormDraft('buyDelivery', {
        selectedAddressId: newAddress.id,
        showForm: false,
        facilityName: form.facilityName,
        street: form.street,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
        countryCode: form.countryCode,
        phone: form.phone,
        email: form.email,
        permitNumber: form.permitNumber,
      }).catch(() => {});
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save address.');
    } finally {
      setSavingLocation(false);
    }
  };

  const onProceedToBuy = async () => {
    if (!canProceed || placing) return;
    saveFormDraft('buyDelivery', {
      selectedAddressId: showForm ? null : selectedAddressId,
      showForm,
      facilityName: form.facilityName,
      street: form.street,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      country: form.country,
      countryCode: form.countryCode,
      phone: form.phone,
      email: form.email,
      permitNumber: form.permitNumber,
    }).catch(() => {});
    const deliveryDetails = showForm ? form : savedAddresses.find((a) => a.id === selectedAddressId) || form;
    const addressId = showForm ? null : selectedAddressId;
    const priceDisplay = mineral?.price ?? mineral?.priceDisplay ?? '';
    const pricePerUnit = parsePrice(priceDisplay);
    const q = Number(quantity) || 0;
    const subtotal = pricePerUnit != null ? pricePerUnit * q : null;
    const transport = DEFAULT_TRANSPORT;
    const fee = subtotal != null && Number.isFinite(subtotal) ? subtotal * FEE_PERCENT : 0;
    const totalDue = subtotal != null ? subtotal + transport + fee : null;
    const totalDueText = USE_CONFIRMED_PRICE_AUTHORITY
      ? 'Price pending'
      : totalDue != null && Number.isFinite(totalDue)
        ? fmtMoney(totalDue)
        : '—';

    if (!mineral?.id) {
      Alert.alert('Error', 'Missing mineral.');
      return;
    }
    if (!addressId && !deliveryDetails) {
      Alert.alert('Error', 'Missing delivery address.');
      return;
    }
    setPlacing(true);
    try {
      const res = await fetchWithAuth('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          mineralId: mineral.id,
          mineralName: mineral.name,
          quantity: String(quantity || '1'),
          amount: mineral.price || null,
          addressId: addressId || undefined,
          type: 'buy',
          mineralType: mineralType || 'raw',
          buyerCategory: buyerCategory || null,
          deliveryMethod: deliveryMethod === 'direct' ? 'Direct Delivery' : 'Secure Vault',
          subtotal: subtotal != null ? subtotal : null,
          transportFee: transport,
          feePercent: FEE_PERCENT,
          totalDue: totalDue != null ? totalDue : null,
          unit: unit || 'kg',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to place order');
      }
      const order = await res.json();
      AsyncStorage.removeItem(BUY_DELIVERY_PROOF_PICKED_KEY).catch(() => {});
      navigation.navigate('OrderConfirmed', {
        orderId: order.id || order._id,
        order,
        totalDue: USE_CONFIRMED_PRICE_AUTHORITY ? null : totalDueText,
      });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const contentWidth = Math.min(WINDOW_WIDTH, FIGMA_WIDTH);

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 160, alignItems: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Figma: 380px width, centered */}
        <View style={[styles.mobileContainer, { maxWidth: contentWidth, width: contentWidth }]}>
          {/* Header – Figma Container: 20px 21px, #EFF6FF, bottom radius 35px */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Icon name="chevronLeft" size={22} color={HEADER_BLUE} />
              </TouchableOpacity>
              <View style={styles.headerTitleBlock}>
                <View style={styles.headerIconBox}>
                  <Icon name="truck" size={20} color="#1a1f36" />
                </View>
                <Text style={styles.headerTitle}>Logistics</Text>
              </View>
            </View>
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${PROGRESS_FRACTION * 100}%` }]} />
              </View>
              <Text style={styles.stepText}>{STEP_LABEL}</Text>
              <Text style={styles.stepSubtext}>{STEP_SUBLABEL}</Text>
            </View>
          </View>

          {/* Content: 16px horizontal padding, 24px section gaps */}
          <View style={styles.contentWrap}>
            {/* Delivery method cards - 24px gap */}
            <View style={styles.deliveryOptions}>
              {/* Card 1: Direct Delivery (SELECTED) - dark navy #1a1f36, white text */}
              <Pressable
                style={styles.deliveryCardSelected}
                onPress={() => setDeliveryMethod('direct')}
              >
                <View style={styles.deliveryCardInner}>
                  <View style={styles.deliveryIconWrapSelected}>
                    <Icon name="truck" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.deliveryCardText}>
                    <Text style={styles.deliveryCardTitleSelected}>Direct Delivery</Text>
                    <Text style={styles.deliveryCardSubSelected}>
                      Secure armored transport to your registered facility.
                    </Text>
                  </View>
                  <View style={styles.radioSelected}>
                    <View style={styles.radioSelectedInner} />
                  </View>
                </View>
              </Pressable>

              {/* Card 2: Secure Vault (DISABLED) - #f5f5f5, muted, opacity 0.55 */}
              <View style={styles.deliveryCardDisabled}>
                <View style={styles.deliveryCardInner}>
                  <View style={styles.deliveryIconWrapDisabled}>
                    <Icon name="vault" size={20} color="#9ca3af" />
                  </View>
                  <View style={styles.deliveryCardText}>
                    <View style={styles.vaultTitleRow}>
                      <Text style={styles.deliveryCardTitleDisabled}>Secure Vault</Text>
                      <View style={styles.comingSoonPill}>
                        <Text style={styles.comingSoonText}>Coming Soon</Text>
                      </View>
                    </View>
                    <Text style={styles.deliveryCardSubDisabled}>
                      Insured, bonded storage in Zurich or Singapore.
                    </Text>
                    <View style={styles.vaultPriceTag}>
                      <Text style={styles.vaultPriceText}>$200 / month</Text>
                    </View>
                  </View>
                  <View style={styles.radioDisabled} />
                </View>
              </View>
            </View>

            {/* Delivery Location – after save: show cards (Figma 3213-3710); else show form */}
            <View style={styles.deliveryLocationSection}>
              <Text style={styles.sectionHeading}>DELIVERY LOCATION</Text>
              {!showForm && (
                <TouchableOpacity style={styles.newAddressBtn} onPress={onPressNewAddress} activeOpacity={0.8}>
                  <Icon name="add" size={20} color="#1F2A44" />
                  <Text style={styles.newAddressBtnText}>New Address</Text>
                </TouchableOpacity>
              )}
            </View>
           
            {showForm ? (
            <View style={styles.formCard}>
              <View style={styles.formFields}>
                {/* 1. Facility elements fields */}
                <View style={styles.field}>
                  <Text style={styles.label}>Facility/Business Name *</Text>
                  <View style={styles.inputWrap}>
                    <Icon name="building" size={18} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={form.facilityName}
                      onChangeText={(v) => setForm((f) => ({ ...f, facilityName: v }))}
                      placeholder="Institutional entity name"
                      placeholderTextColor="#6b7280"
                    />
                  </View>
                </View>

                {/* 2. Country * */}
                <View style={styles.field}>
                  <Text style={styles.label}>Country *</Text>
                  <Pressable
                    style={[styles.dropdown, openDropdown === 'country' && styles.dropdownOpen]}
                    onPress={() => setOpenDropdown(openDropdown === 'country' ? null : 'country')}
                  >
                    <Text style={styles.dropdownText} numberOfLines={1}>
                      {form.country || 'Select Country'}
                    </Text>
                    <Icon name="chevronDown" size={18} color="#6b7280" />
                  </Pressable>
                  {openDropdown === 'country' && (
                    <View style={styles.dropdownList}>
                      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {COUNTRIES.map((c) => (
                          <Pressable
                            key={c.code}
                            style={[styles.dropdownOption, c.name === form.country && styles.dropdownOptionSelected]}
                            onPress={() => {
                              setForm((f) => ({ ...f, country: c.name, countryCode: c.code, state: '' }));
                              closeDropdown();
                            }}
                          >
                            <Text style={[styles.dropdownOptionText, c.name === form.country && styles.dropdownOptionTextSelected]} numberOfLines={1}>{c.name}</Text>
                            {c.name === form.country && <Icon name="check" size={18} color="#1F2A44" />}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* 3. State / Region * */}
                <View style={styles.field}>
                  <Text style={styles.label}>State / Region *</Text>
                  {stateOptions.length > 0 ? (
                    <>
                      <Pressable
                        style={[styles.dropdown, openDropdown === 'state' && styles.dropdownOpen]}
                        onPress={() => setOpenDropdown(openDropdown === 'state' ? null : 'state')}
                      >
                        <Text style={styles.dropdownText} numberOfLines={1}>
                          {form.state || 'Select state / region'}
                        </Text>
                        <Icon name="chevronDown" size={18} color="#6b7280" />
                      </Pressable>
                      {openDropdown === 'state' && (
                        <View style={styles.dropdownList}>
                          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            {stateOptions.map((opt) => (
                              <Pressable
                                key={opt}
                                style={[styles.dropdownOption, opt === form.state && styles.dropdownOptionSelected]}
                                onPress={() => { setForm((f) => ({ ...f, state: opt })); closeDropdown(); }}
                              >
                                <Text style={[styles.dropdownOptionText, opt === form.state && styles.dropdownOptionTextSelected]} numberOfLines={1}>{opt}</Text>
                                {opt === form.state && <Icon name="check" size={18} color="#1F2A44" />}
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
                      placeholder="Enter state or region"
                      placeholderTextColor="#6b7280"
                    />
                  )}
                </View>

                {/* 4. City * */}
                <View style={styles.field}>
                  <Text style={styles.label}>City *</Text>
                  <View style={styles.inputWrap}>
                    <Icon name="location" size={18} color="#9ca3af" style={[styles.inputIcon, { top: 12 }]} />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={form.city}
                      onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
                      placeholder="Enter city"
                      placeholderTextColor="#6b7280"
                    />
                  </View>
                </View>

                {/* 5. Street Address * */}
                <View style={styles.field}>
                  <Text style={styles.label}>Street Address *</Text>
                  <View style={styles.inputWrap}>
                    <Icon name="location" size={18} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={form.street}
                      onChangeText={(v) => setForm((f) => ({ ...f, street: v }))}
                      placeholder="Enter street name and number"
                      placeholderTextColor="#6b7280"
                    />
                  </View>
                </View>

                {/* 6. Postal Code * */}
                <View style={styles.field}>
                  <Text style={styles.label}>Postal Code *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.postalCode}
                    onChangeText={(v) => setForm((f) => ({ ...f, postalCode: v }))}
                    placeholder={form.countryCode === 'CH' ? 'e.g. 8001' : form.countryCode === 'US' ? 'e.g. 12345' : 'Postal code'}
                    placeholderTextColor="#6b7280"
                    keyboardType={form.countryCode === 'US' || form.countryCode === 'CH' ? 'number-pad' : 'default'}
                  />
                </View>

                {/* 7. Contact Phone * – country code + national digits, validated like login */}
                <View style={styles.field}>
                  <Text style={styles.label}>Contact Phone *</Text>
                  <View style={[styles.phoneRow, showPhoneInvalid && styles.phoneRowInvalid]}>
                    <View style={styles.phoneDialBox}>
                      <Text style={styles.phoneDialText}>{phoneCountry.dial}</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      value={phoneDigits ? formatPhoneAsYouType(form.countryCode, phoneDigits) : ''}
                      onChangeText={(v) => {
                        const digits = v.replace(/\D/g, '').slice(0, (phoneCountry.lengths && phoneCountry.lengths[1]) || 15);
                        setForm((f) => ({ ...f, phone: digits }));
                      }}
                      placeholder={getPhonePlaceholder(form.countryCode)}
                      placeholderTextColor="#6b7280"
                      keyboardType="phone-pad"
                    />
                  </View>
                  {showPhoneInvalid && (
                    <Text style={styles.phoneError}>{phoneValidation.message}</Text>
                  )}
                </View>

                {/* 8. Email Address * – stacked */}
                <View style={styles.field}>
                  <Text style={styles.label}>Email Address *</Text>
                  <View style={styles.inputWrap}>
                    <Icon name="mail" size={20} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={form.email}
                      onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                      placeholder="logistics@company.com"
                      placeholderTextColor="#6b7280"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* 6. Institutional permit — optional */}
                <View style={styles.field}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Institutional permit number (optional)</Text>
                    <Icon name="info" size={16} color="#9ca3af" />
                  </View>
                  <View style={styles.inputWrap}>
                    <Icon name="document" size={18} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={form.permitNumber}
                      onChangeText={(v) => setForm((f) => ({ ...f, permitNumber: v }))}
                      placeholder="Enter permit/license number"
                      placeholderTextColor="#6b7280"
                    />
                  </View>
                </View>

                {/* Regulatory compliance — optional / if applicable */}
                <Pressable style={styles.complianceBox} onPress={() => setComplianceAccepted((a) => !a)}>
                  <View style={[styles.checkbox, complianceAccepted && styles.checkboxChecked]}>
                    {complianceAccepted && <Icon name="check" size={14} color="#FFFFFF" />}
                  </View>
                  <View style={styles.complianceTextWrap}>
                    <Text style={styles.complianceTitle}>Regulatory compliance (if applicable)</Text>
                    <Text style={styles.complianceSub}>
                      If this applies to your institution, confirm adherence to safety, AML, and mineral handling regulations for this shipment.
                    </Text>
                  </View>
                </Pressable>

                {/* Proof of facility address — optional */}
                <View style={styles.field}>
                  <Text style={styles.label}>Proof of facility address (optional)</Text>
                  <Pressable style={styles.uploadArea} onPress={pickProofFile} disabled={pickingProof}>
                    {pickingProof ? (
                      <>
                        <ActivityIndicator size="small" color="#51A2FF" />
                        <Text style={styles.uploadTitle}>Processing…</Text>
                      </>
                    ) : proofFile == null ? (
                      <>
                        <Icon name="upload" size={26} color="#9ca3af" />
                        <Text style={styles.uploadTitle}>SELECT FILE TO UPLOAD</Text>
                        <Text style={styles.uploadSub}>PDF, PNG, JPG (Max 5MB)</Text>
                      </>
                    ) : (
                      <Text style={styles.uploadFileName} numberOfLines={2}>{proofFile.name}</Text>
                    )}
                  </Pressable>
                </View>

                {/* Save for future orders - toggle ON = blue #3b82f6 */}
                <View style={styles.saveForFutureRow}>
                  <View style={styles.saveForFutureText}>
                    <Text style={styles.saveForFutureTitle}>Save for future orders</Text>
                    <Text style={styles.saveForFutureSub}>Store this address in your institutional profile.</Text>
                  </View>
                  <Switch
                    value={saveForFuture}
                    onValueChange={setSaveForFuture}
                    trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Save Location — enabled when required address fields are valid */}
                <Pressable
                  style={({ pressed }) => [
                    styles.saveLocationBtn,
                    canSaveLocation && styles.saveLocationBtnEnabled,
                    canSaveLocation && pressed && styles.saveLocationBtnHover,
                  ]}
                  onPress={onSaveLocation}
                  disabled={!canSaveLocation || savingLocation}
                >
                  <Icon
                    name="shieldCheck"
                    size={20}
                    color={canSaveLocation && !savingLocation ? '#FFFFFF' : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.saveLocationBtnText,
                      canSaveLocation && !savingLocation && styles.saveLocationBtnTextEnabled,
                    ]}
                  >
                    {savingLocation ? 'Saving…' : 'Save Location'}
                  </Text>
                </Pressable>
              </View>
            </View>
            ) : (
            <>
            {/* Saved address card(s) – Figma 3213-3710 */}
            <View style={styles.savedAddressCards}>
              {savedAddresses.map((addr) => (
                <Pressable
                  key={addr.id}
                  style={[styles.savedAddressCard, selectedAddressId === addr.id && styles.savedAddressCardSelected]}
                  onPress={() => setSelectedAddressId(addr.id)}
                >
                  <View style={styles.savedAddressCardRadio}>
                    {selectedAddressId === addr.id && <View style={styles.savedAddressCardRadioInner} />}
                  </View>
                  <View style={styles.savedAddressCardContent}>
                    <View style={styles.savedAddressCardHeader}>
                      <Text style={styles.savedAddressCardLabel}>{addr.label}</Text>
                      <Icon name="chevronRight" size={18} color="#99A1AF" />
                    </View>
                    <View style={styles.savedAddressStack}>
                      <View style={styles.savedAddressRow}>
                        <Text style={styles.savedAddressKey}>Street</Text>
                        <Text style={styles.savedAddressValue}>{addr.street || '—'}</Text>
                      </View>
                      <View style={styles.savedAddressRow}>
                        <Text style={styles.savedAddressKey}>City</Text>
                        <Text style={styles.savedAddressValue}>{addr.city || '—'}</Text>
                      </View>
                      <View style={styles.savedAddressRow}>
                        <Text style={styles.savedAddressKey}>State / Region</Text>
                        <Text style={styles.savedAddressValue}>{addr.state || '—'}</Text>
                      </View>
                      <View style={styles.savedAddressRow}>
                        <Text style={styles.savedAddressKey}>Postal Code</Text>
                        <Text style={styles.savedAddressValue}>{addr.postalCode || '—'}</Text>
                      </View>
                      <View style={styles.savedAddressRow}>
                        <Text style={styles.savedAddressKey}>Country</Text>
                        <Text style={styles.savedAddressValue}>{addr.country || '—'}</Text>
                      </View>
                      <View style={styles.savedAddressRow}>
                        <Text style={styles.savedAddressKey}>Phone</Text>
                        <Text style={styles.savedAddressValue}>
                          {addr.countryCode && addr.phone ? `${addr.countryCode} ${addr.phone}` : addr.phone || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
            {/* Regulatory compliance — optional / if applicable */}
            <Pressable style={styles.complianceBox} onPress={() => setComplianceAccepted((a) => !a)}>
              <View style={[styles.checkbox, complianceAccepted && styles.checkboxChecked]}>
                {complianceAccepted && <Icon name="check" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.complianceTextWrap}>
                <Text style={styles.complianceTitle}>Regulatory compliance (if applicable)</Text>
                <Text style={styles.complianceSub}>
                  If this applies to your institution, confirm adherence to safety, AML, and mineral handling regulations for this shipment.
                </Text>
              </View>
            </Pressable>
            </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer – Figma: 380px, 22px 21px 0, one button "Proceed to buy", 49px height */}
      <View style={styles.footerWrap}>
        <View style={[styles.footer, { width: contentWidth, maxWidth: contentWidth }]}>
        <Pressable
          style={({ pressed }) => [
            styles.footerBtnProceed,
            canProceed && !placing && styles.footerBtnProceedEnabled,
            (!canProceed || placing) && styles.footerBtnProceedDisabled,
            canProceed && !placing && pressed && styles.footerBtnProceedHover,
          ]}
          onPress={onProceedToBuy}
          disabled={!canProceed || placing}
        >
          {placing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Icon name="lock" size={14} color={canProceed ? '#F2C94C' : '#99A1AF'} />
              <Text
                style={[
                  styles.footerBtnProceedText,
                  canProceed && styles.footerBtnProceedTextEnabled,
                  !canProceed && styles.footerBtnProceedTextDisabled,
                ]}
              >
                Request Accepted
              </Text>
            </>
          )}
        </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  mobileContainer: {
    width: '100%',
    alignSelf: 'center',
    flex: 1,
  },
  header: {
    backgroundColor: '#EFF6FF',
    paddingTop: 12 + HEADER_EXTRA_TOP,
    paddingBottom: 20,
    paddingHorizontal: 21,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 35,
    height: 35,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
  headerTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginLeft: 10 },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 10.5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 15.75, fontWeight: '700', color: '#1F2A44', letterSpacing: -0.4 },
  progressBlock: { marginTop: 20, alignItems: 'center' },
  progressTrack: {
    width: '100%',
    maxWidth: 112,
    height: 5.25,
    backgroundColor: '#DBEAFE',
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: { height: '100%', backgroundColor: '#2B7FFF', borderRadius: 9999 },
  stepText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#51A2FF',
    textAlign: 'center',
  },
  stepSubtext: {
    fontSize: 10.5,
    fontWeight: '400',
    color: '#8EC5FF',
    marginTop: 4,
    textAlign: 'center',
  },
  contentWrap: { paddingHorizontal: 21, paddingTop: 28 },
  deliveryOptions: { gap: 14 },
  // Card 1: Direct Delivery SELECTED – Figma: rgba(31,42,68,0.05), 2px #1F2A44, 14px radius
  deliveryCardSelected: {
    backgroundColor: 'rgba(31, 42, 68, 0.05)',
    borderWidth: 2,
    borderColor: '#1F2A44',
    borderRadius: 14,
    padding: 17,
  },
  deliveryCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deliveryIconWrapSelected: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1F2A44',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deliveryCardText: { flex: 1 },
  deliveryCardTitleSelected: { fontSize: 15.75, fontWeight: '700', color: '#101828', marginBottom: 3 },
  deliveryCardSubSelected: { fontSize: 12.25, fontWeight: '400', color: '#6A7282', lineHeight: 17 },
  radioSelected: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#1F2A44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelectedInner: {
    width: 10.5,
    height: 10.5,
    borderRadius: 6,
    backgroundColor: '#1F2A44',
  },
  // Card 2: Secure Vault DISABLED – Figma: #F9FAFB, #F3F4F6 border, opacity 0.5, 14px radius
  deliveryCardDisabled: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    borderRadius: 14,
    padding: 17,
    opacity: 0.5,
  },
  deliveryIconWrapDisabled: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deliveryCardTitleDisabled: { fontSize: 15.75, fontWeight: '700', color: '#101828' },
  vaultTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  comingSoonPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8.5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  comingSoonText: { fontSize: 10, fontWeight: '500', lineHeight: 14, color: '#6A7282' },
  deliveryCardSubDisabled: { fontSize: 12.25, fontWeight: '400', color: '#6A7282', lineHeight: 17 },
  vaultPriceTag: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 3.5,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  vaultPriceText: { fontSize: 10.5, fontWeight: '700', lineHeight: 14, color: '#99A1AF' },
  radioDisabled: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DC',
  },
  // Delivery Location section – Figma 3213-3710: row with heading + New Address button
  deliveryLocationSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 21,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#101828',
  },
  deliveryLocationHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    marginBottom: 12,
    marginTop: -4,
  },
  newAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8.5,
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  newAddressBtnText: { fontSize: 12.25, fontWeight: '700', color: '#1F2A44' },
  // Saved address card – Figma 3213-3710: rgba(31,42,68,0.05), 2px #1F2A44, 14.5px radius
  savedAddressCards: { gap: 10.5 },
  savedAddressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'rgba(31, 42, 68, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 14.5,
  },
  savedAddressCardSelected: { borderColor: '#1F2A44' },
  savedAddressCardRadio: {
    width: 17.5,
    height: 17.5,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1F2A44',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10.5,
    marginTop: 2,
  },
  savedAddressCardRadioInner: {
    width: 8.75,
    height: 8.75,
    borderRadius: 5,
    backgroundColor: '#1F2A44',
  },
  savedAddressCardContent: { flex: 1 },
  savedAddressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedAddressCardLabel: { fontSize: 15, fontWeight: '700', color: '#101828', lineHeight: 20 },
  savedAddressStack: { gap: 10 },
  savedAddressRow: { marginBottom: 6 },
  savedAddressKey: { fontSize: 12, fontWeight: '600', color: '#6A7282', marginBottom: 2 },
  savedAddressValue: { fontSize: 14, fontWeight: '500', color: '#101828', lineHeight: 20 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14.5,
    padding: 21,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  formFields: { gap: 14 },
  field: { marginBottom: 20 },
  fieldRow: { flexDirection: 'row', gap: 14 },
  fieldHalf: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', lineHeight: 18, color: '#364153', marginBottom: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 12, top: 12, zIndex: 1 },
  inputWithIcon: {
    height: 44,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingLeft: 40,
    paddingRight: 12,
    paddingVertical: 4,
    fontSize: 15,
    color: '#1C1C1C',
  },
  input: {
    height: 44,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 15,
    color: '#1C1C1C',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  phoneDialBox: {
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  phoneDialText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  phoneInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 15,
    color: '#1C1C1C',
  },
  phoneRowInvalid: { borderColor: '#dc2626' },
  phoneError: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  inputReadOnly: {
    height: 44,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  dropdown: {
    height: 44,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: { fontSize: 15, fontWeight: '500', color: '#1C1C1C', flex: 1 },
  dropdownOpen: { borderColor: HEADER_BLUE },
  dropdownList: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 220 },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dropdownOptionSelected: { backgroundColor: '#EFF6FF' },
  dropdownOptionText: { fontSize: 15, color: '#1C1C1C', flex: 1 },
  dropdownOptionTextSelected: { fontWeight: '600' },
  complianceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    backgroundColor: 'rgba(239, 246, 255, 0.5)',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14.5,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#1F2A44', borderColor: '#1F2A44' },
  complianceTextWrap: { flex: 1 },
  complianceTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20, color: '#101828', marginBottom: 6 },
  complianceSub: { fontSize: 13, fontWeight: '400', lineHeight: 19, color: '#6A7282' },
  uploadArea: {
    height: 84,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  uploadTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#99A1AF',
    marginTop: 8,
  },
  uploadSub: { fontSize: 11, fontWeight: '400', lineHeight: 14, color: '#99A1AF', marginTop: 2 },
  uploadFileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2A44',
    textAlign: 'center',
    maxWidth: '90%',
    paddingHorizontal: 12,
  },
  saveForFutureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveForFutureText: { flex: 1, marginRight: 16 },
  saveForFutureTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20, color: '#101828' },
  saveForFutureSub: { fontSize: 13, fontWeight: '400', lineHeight: 19, color: '#6A7282', marginTop: 4 },
  saveLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    backgroundColor: '#E5E7EB',
    borderRadius: 14.5,
    marginTop: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  saveLocationBtnEnabled: { backgroundColor: '#1F2A44' },
  saveLocationBtnHover: { borderColor: HEADER_BLUE },
  saveLocationBtnText: { fontSize: 16, fontWeight: '700', color: '#99A1AF' },
  saveLocationBtnTextEnabled: { color: '#FFFFFF' },
  footerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 22,
    paddingBottom: 28,
    paddingHorizontal: 21,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 8,
    alignItems: 'center',
  },
  footerBtnProceed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 49,
    backgroundColor: '#E5E7EB',
    borderRadius: 14.5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  footerBtnProceedEnabled: { backgroundColor: '#1F2A44', opacity: 1 },
  footerBtnProceedHover: { borderColor: HEADER_BLUE },
  footerBtnProceedDisabled: { opacity: 0.5 },
  footerBtnProceedText: { fontSize: 14, fontWeight: '700', lineHeight: 21 },
  footerBtnProceedTextEnabled: { color: '#FFFFFF' },
  footerBtnProceedTextDisabled: { color: '#99A1AF' },
});
