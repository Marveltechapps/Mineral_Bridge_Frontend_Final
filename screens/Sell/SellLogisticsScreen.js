import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Pressable,
  Dimensions,
  Switch,
  InteractionManager,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickDocumentStable, bumpPickerFocusGrace } from '../../lib/stablePicker';
import { fetchWithAuth } from '../../lib/api';
import { getFormDrafts, saveFormDraft } from '../../lib/services';
import { useDebouncedFormDraft } from '../../lib/useFormDraft';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { COUNTRIES, getCountryByCode, getCountryByDial } from '../../lib/countries';
import { getStatesForCountry, validatePostalCode } from '../../lib/countriesStates';
import { validatePhone, getPhonePlaceholder, formatPhoneAsYouType } from '../../lib/phoneValidation';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);
const HOVER_BLUE = '#51A2FF';
const PROGRESS_BLUE = '#51A2FF';
const SELL_LOGISTICS_PROOF_PICKED_KEY = 'sell_logistics_proof_file';

const PICKUP_METHOD_SAMPLE = 'Sample test will be collected from your place';
const PICKUP_METHOD_VAULT = 'Vault Drop-off $150/shipment';

const MINERAL_VERIFICATION_STEPS = [
  'Price confirmation',
  'Sample Test Verification',
  'Quantity Verification Before Loading',
  'Release of Payment',
];

export default function SellLogisticsScreen({ route, navigation }) {
  const {
    mineral,
    category,
    quantity,
    unit,
    type,
    origin,
    addressId: routeAddressId,
    fromArtisanal,
  } = route.params || {};
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(routeAddressId || null);
  const [pickupMethod, setPickupMethod] = useState(PICKUP_METHOD_SAMPLE);

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

  const [showForm, setShowForm] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [openDropdown, setOpenDropdown] = useState(null); // 'state' | 'country' | null
  const [regulatoryCompliance, setRegulatoryCompliance] = useState(false);
  const [proofOfFacilityFile, setProofOfFacilityFile] = useState(null);
  const [saveLocation, setSaveLocation] = useState(false);

  // Backend currently stores "countryCode" as a dial code (e.g. "+27") in some flows.
  // Support both ISO ("ZA") and dial code ("+27") here.
  const phoneCountry = String(form.countryCode || '').startsWith('+')
    ? getCountryByDial(form.countryCode)
    : getCountryByCode(form.countryCode);
  const stateOptions = getStatesForCountry(form.countryCode);
  const phoneDigits = (form.phone || '').replace(/\D/g, '');
  const phoneValidation = validatePhone(phoneCountry, phoneDigits);
  const minPhoneLen = (phoneCountry.lengths && phoneCountry.lengths[0]) || 6;
  const showPhoneInvalid = phoneDigits.length >= minPhoneLen && !phoneValidation.valid;

  useEffect(() => {
    if (fromArtisanal) {
      setAddresses([]);
      setShowForm(true);
      setForm({ ...EMPTY_FORM });
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchWithAuth('/api/addresses?usage=pickup').then((res) => (res.ok ? res.json() : [])),
      getFormDrafts().catch(() => null),
    ])
      .then(([data, drafts]) => {
        if (cancelled) return;
        const raw = Array.isArray(data) ? data : [];
        const list = raw
          .map((a) => ({
            ...a,
            id: a?.id || a?._id,
            facilityName: a?.facilityName || a?.label || '',
            street: a?.street || '',
            city: a?.city || '',
            state: a?.state || a?.stateRegion || a?.region || '',
            postalCode: a?.postalCode || '',
            country: a?.country || '',
            phone: a?.phone || a?.contactPhone || '',
            countryCode: a?.countryCode || '',
            email: a?.email || '',
            institutionalPermitNumber: a?.institutionalPermitNumber || a?.permitNumber || '',
            usage: a?.usage,
          }))
          .filter((a) => a.id)
          // Defense-in-depth: sell pickup must never list buy/delivery addresses (usage=delivery).
          .filter((a) => String(a.usage || '').toLowerCase() === 'pickup');
        setAddresses(list);
        const draft = drafts?.sellLogistics;
        const draftId = draft?.selectedId;
        const draftHadForm = draft?.showForm || draft?.facilityName || draft?.street || draft?.city;
        const draftHadValidAddress = draftId && list.some((a) => a.id === draftId);

        if (draft?.pickupMethod) setPickupMethod(draft.pickupMethod);
        if (draft?.regulatoryCompliance != null) setRegulatoryCompliance(Boolean(draft.regulatoryCompliance));
        if (draft?.saveLocation != null) setSaveLocation(Boolean(draft.saveLocation));

        if (draftHadValidAddress) {
          setSelectedId(draftId);
          setShowForm(false);
        } else if (draftHadForm) {
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
        } else if (list.length) {
          // Pickup-only saved addresses — reuse previous sell pickup, never buy delivery.
          const preferred = list.find((a) => a.isDefault) || list[0];
          setSelectedId(preferred.id);
          setShowForm(false);
        }
      })
      .catch(() => { if (!cancelled) setAddresses([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fromArtisanal]);

  useDebouncedFormDraft(
    'sellLogistics',
    {
      selectedId,
      pickupMethod,
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
      regulatoryCompliance,
      saveLocation,
    },
    {
      deps: [
        selectedId,
        pickupMethod,
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
        regulatoryCompliance,
        saveLocation,
      ],
    }
  );

  const [pickingProof, setPickingProof] = useState(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SELL_LOGISTICS_PROOF_PICKED_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const data = JSON.parse(raw);
          if (data?.uri) setProofOfFacilityFile({ name: data.name, uri: data.uri });
        } catch (_) {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const onPickProofOfFacility = () => {
    bumpPickerFocusGrace();
    setPickingProof(true);
    pickDocumentStable(
      { type: ['image/*', 'application/pdf'], multiple: false },
      (file) => {
        if (!isMounted.current) { setPickingProof(false); return; }
        const data = { name: file.name, uri: file.uri };
        InteractionManager.runAfterInteractions(() => {
          if (!isMounted.current) { setPickingProof(false); return; }
          setProofOfFacilityFile(data);
          bumpPickerFocusGrace();
          AsyncStorage.setItem(SELL_LOGISTICS_PROOF_PICKED_KEY, JSON.stringify(data)).catch(() => {});
          setPickingProof(false);
        });
      },
      (msg) => {
        if (isMounted.current && msg) Alert.alert('Error', msg);
        if (isMounted.current) setPickingProof(false);
      },
      () => { if (isMounted.current) setPickingProof(false); }
    );
  };

  const canConfirm =
    (!showForm && selectedId != null) ||
    (form.facilityName.trim() &&
      form.street.trim() &&
      form.city.trim() &&
      form.state.trim() &&
      form.postalCode.trim() &&
      form.country.trim() &&
      phoneDigits.length >= minPhoneLen &&
      phoneValidation.valid &&
      form.email.trim());

  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function parsePrice(priceDisplay) {
    if (priceDisplay == null || typeof priceDisplay !== 'string') return null;
    const match = String(priceDisplay).replace(/,/g, '').match(/\$?([\d.]+)/);
    return match ? parseFloat(match[1]) : null;
  }

  const onConfirm = async () => {
    if (!canConfirm) return;
    saveFormDraft('sellLogistics', {
      selectedId,
      pickupMethod,
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
      regulatoryCompliance,
      saveLocation,
    }).catch(() => {});
    let resolvedAddressId = showForm ? null : selectedId;
    if (showForm) {
      const postalCheck = validatePostalCode(form.postalCode.trim(), form.countryCode);
      if (!postalCheck.valid) {
        Alert.alert('Invalid postal code', postalCheck.message || 'Please enter a valid postal code for the selected country.');
        return;
      }
      if (!phoneValidation.valid) {
        Alert.alert('Invalid phone', phoneValidation.message || 'Please enter a valid phone number.');
        return;
      }
      setCreating(true);
      try {
        const body = {
          usage: 'pickup',
          label: form.facilityName.trim() || 'Pickup Address',
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
          regulatoryCompliance,
          isDefault: addresses.length === 0 ? true : saveLocation,
        };
        const createRes = await fetchWithAuth('/api/addresses', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to save address');
        }
        const newAddr = await createRes.json();
        resolvedAddressId = newAddr.id || newAddr._id;
      } catch (e) {
        Alert.alert('Error', e.message || 'Could not save address');
        return;
      } finally {
        setCreating(false);
      }
    }
    if (!mineral?.id) {
      Alert.alert('Error', 'Missing mineral.');
      return;
    }
    if (!resolvedAddressId) {
      Alert.alert('Error', 'Pickup location is required.');
      return;
    }
    const pricePerUnit = parsePrice(mineral?.priceDisplay || mineral?.price);
    const qty = Number(quantity) || 1;
    const estimatedPayoutNum = pricePerUnit != null ? pricePerUnit * qty : null;

    setSubmitting(true);
    try {
      const listRes = await fetchWithAuth('/api/listings', {
        method: 'POST',
        body: JSON.stringify({
          mineralId: mineral.id,
          category: category || mineral.category,
          quantity: Number(quantity) || 1,
          unit: unit || 'kg',
          type: type || 'raw',
          origin: origin || '',
          photos: [],
        }),
      });
      if (!listRes.ok) {
        const data = await listRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create listing');
      }
      const listing = await listRes.json();
      const orderRes = await fetchWithAuth('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          mineralId: mineral.id,
          mineralName: mineral.name,
          quantity: String(quantity || '1'),
          amount: mineral?.price || mineral?.priceDisplay || null,
          addressId: resolvedAddressId,
          type: 'sell',
          mineralType: type || 'raw',
          unit: unit || 'kg',
          listingId: listing.id || null,
          estimatedPayout: estimatedPayoutNum,
          subtotal: estimatedPayoutNum,
          totalDue: estimatedPayoutNum,
        }),
      });
      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create sell order.');
      }
      AsyncStorage.removeItem(SELL_LOGISTICS_PROOF_PICKED_KEY).catch(() => {});
      navigation.navigate('SellSuccess', { listingId: listing.id });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const onPressNewAddress = () => {
    setSelectedId(null);
    setForm({ ...EMPTY_FORM });
    setRegulatoryCompliance(false);
    setOpenDropdown(null);
    setShowForm(true);
  };

  const closeDropdown = () => setOpenDropdown(null);

  return (
    <View style={styles.page}>
      {/* Header – same alignment/margins as previous screen (Mineral Details); no logo before title; Step/progress like Buy Quantity Selection */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]}
            onPress={() => navigation.goBack()}
          >
            {({ pressed }) => (
              <Icon name="chevronLeft" size={24} color={pressed ? '#1F2A44' : HOVER_BLUE} />
            )}
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>Location Details</Text>
          </View>
        </View>
        {/* Step + horizontal line – same as Buy module Quantity Selection (STEP 1 OF 3 + progress bar) */}
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.stepText}>STEP 2 OF 2</Text>
          <Text style={styles.stepSubtext}>Schedule Pickup</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* PICKUP METHOD */}
        <Text style={styles.sectionLabel}>PICKUP METHOD</Text>
        <Pressable
          style={[styles.pickupOption, pickupMethod === PICKUP_METHOD_SAMPLE && styles.pickupOptionSelected]}
          onPress={() => setPickupMethod(PICKUP_METHOD_SAMPLE)}
        >
          <Icon name="checkCircle" size={24} color={colors.successGreen} />
          <Text style={styles.pickupOptionText}>{PICKUP_METHOD_SAMPLE}</Text>
        </Pressable>
        <View style={styles.pickupOptionDisabled}>
          <Icon name="location" size={24} color={colors.textLight} />
          <Text style={styles.pickupOptionTextMuted}>{PICKUP_METHOD_VAULT}</Text>
          <Text style={styles.comingSoon}>COMING SOON</Text>
        </View>

        {/* PICKUP LOCATION *REQUIRED — separate saved list from buy delivery (usage=pickup only). */}
        <Text style={styles.sectionLabel}>
          PICKUP LOCATION <Text style={styles.required}>*REQUIRED</Text>
        </Text>
       

        {!showForm && (
          <Pressable style={styles.newAddressBtn} onPress={onPressNewAddress}>
            <Icon name="add" size={20} color="#1F2A44" />
            <Text style={styles.newAddressBtnText}>New Address</Text>
          </Pressable>
        )}

        {showForm ? (
          <View style={styles.formCard}>
            <View style={styles.formFields}>
              <View style={styles.field}>
                <Text style={styles.labelAlt}>Facility/Business Name *</Text>
                <View style={styles.inputWrapAlt}>
                  <Icon name="building" size={18} color="#9ca3af" style={styles.inputIconAlt} />
                  <TextInput
                    style={styles.inputWithIconAlt}
                    value={form.facilityName}
                    onChangeText={(v) => setForm((f) => ({ ...f, facilityName: v }))}
                    placeholder="Institutional entity name"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.labelAlt}>Country *</Text>
                <Pressable
                  style={[styles.dropdownAlt, openDropdown === 'country' && styles.dropdownOpenAlt]}
                  onPress={() => setOpenDropdown(openDropdown === 'country' ? null : 'country')}
                >
                  <Text style={styles.dropdownTextAlt} numberOfLines={1}>
                    {form.country || 'Select Country'}
                  </Text>
                  <Icon name="chevronDown" size={18} color="#6b7280" />
                </Pressable>
                {openDropdown === 'country' && (
                  <View style={styles.dropdownListAlt}>
                    <ScrollView style={styles.dropdownScrollAlt} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {COUNTRIES.map((c) => (
                        <Pressable
                          key={c.code}
                          style={[styles.dropdownOptionAlt, c.name === form.country && styles.dropdownOptionSelectedAlt]}
                          onPress={() => {
                            setForm((f) => ({ ...f, country: c.name, countryCode: c.code, state: '' }));
                            closeDropdown();
                          }}
                        >
                          <Text
                            style={[styles.dropdownOptionTextAlt, c.name === form.country && styles.dropdownOptionTextSelectedAlt]}
                            numberOfLines={1}
                          >
                            {c.name}
                          </Text>
                          {c.name === form.country && <Icon name="check" size={18} color="#1F2A44" />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.labelAlt}>State / Region *</Text>
                {stateOptions.length > 0 ? (
                  <>
                    <Pressable
                      style={[styles.dropdownAlt, openDropdown === 'state' && styles.dropdownOpenAlt]}
                      onPress={() => setOpenDropdown(openDropdown === 'state' ? null : 'state')}
                    >
                      <Text style={styles.dropdownTextAlt} numberOfLines={1}>
                        {form.state || 'Select state / region'}
                      </Text>
                      <Icon name="chevronDown" size={18} color="#6b7280" />
                    </Pressable>
                    {openDropdown === 'state' && (
                      <View style={styles.dropdownListAlt}>
                        <ScrollView style={styles.dropdownScrollAlt} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {stateOptions.map((opt) => (
                            <Pressable
                              key={opt}
                              style={[styles.dropdownOptionAlt, opt === form.state && styles.dropdownOptionSelectedAlt]}
                              onPress={() => {
                                setForm((f) => ({ ...f, state: opt }));
                                closeDropdown();
                              }}
                            >
                              <Text
                                style={[styles.dropdownOptionTextAlt, opt === form.state && styles.dropdownOptionTextSelectedAlt]}
                                numberOfLines={1}
                              >
                                {opt}
                              </Text>
                              {opt === form.state && <Icon name="check" size={18} color="#1F2A44" />}
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </>
                ) : (
                  <TextInput
                    style={styles.inputAlt}
                    value={form.state}
                    onChangeText={(v) => setForm((f) => ({ ...f, state: v }))}
                    placeholder="Enter state or region"
                    placeholderTextColor="#6b7280"
                  />
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.labelAlt}>City *</Text>
                <View style={styles.inputWrapAlt}>
                  <Icon name="location" size={18} color="#9ca3af" style={[styles.inputIconAlt, { top: 12 }]} />
                  <TextInput
                    style={styles.inputWithIconAlt}
                    value={form.city}
                    onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
                    placeholder="Enter city"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.labelAlt}>Street Address *</Text>
                <View style={styles.inputWrapAlt}>
                  <Icon name="location" size={18} color="#9ca3af" style={styles.inputIconAlt} />
                  <TextInput
                    style={styles.inputWithIconAlt}
                    value={form.street}
                    onChangeText={(v) => setForm((f) => ({ ...f, street: v }))}
                    placeholder="Enter street name and number"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.labelAlt}>Postal Code *</Text>
                <TextInput
                  style={styles.inputAlt}
                  value={form.postalCode}
                  onChangeText={(v) => setForm((f) => ({ ...f, postalCode: v }))}
                  placeholder={form.countryCode === 'CH' ? 'e.g. 8001' : form.countryCode === 'US' ? 'e.g. 12345' : 'Postal code'}
                  placeholderTextColor="#6b7280"
                  keyboardType={form.countryCode === 'US' || form.countryCode === 'CH' ? 'number-pad' : 'default'}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.labelAlt}>Contact Phone *</Text>
                <View style={[styles.phoneRowAlt, showPhoneInvalid && styles.phoneRowInvalidAlt]}>
                  <View style={styles.phoneDialBoxAlt}>
                    <Text style={styles.phoneDialTextAlt}>{phoneCountry.dial}</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInputAlt}
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
                  <Text style={styles.phoneErrorAlt}>{phoneValidation.message}</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.labelAlt}>Email Address *</Text>
                <View style={styles.inputWrapAlt}>
                  <Icon name="mail" size={20} color="#9ca3af" style={styles.inputIconAlt} />
                  <TextInput
                    style={styles.inputWithIconAlt}
                    value={form.email}
                    onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                    placeholder="logistics@company.com"
                    placeholderTextColor="#6b7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.labelAlt}>Institutional permit number (optional)</Text>
                <View style={styles.inputWrapAlt}>
                  <Icon name="document" size={18} color="#9ca3af" style={styles.inputIconAlt} />
                  <TextInput
                    style={styles.inputWithIconAlt}
                    value={form.permitNumber}
                    onChangeText={(v) => setForm((f) => ({ ...f, permitNumber: v }))}
                    placeholder="Enter permit/license number"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.savedAddressCards}>
            {addresses.map((addr) => (
              <Pressable
                key={addr.id}
                style={[styles.savedAddressCard, selectedId === addr.id && styles.savedAddressCardSelected]}
                onPress={() => setSelectedId(addr.id)}
              >
                <View style={styles.savedAddressCardRadio}>
                  {selectedId === addr.id && <View style={styles.savedAddressCardRadioInner} />}
                </View>
                <View style={styles.savedAddressCardContent}>
                  <View style={styles.savedAddressCardHeader}>
                    <Text style={styles.savedAddressCardLabel}>{addr.label || addr.facilityName || 'Address'}</Text>
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
        )}

        {/* Regulatory compliance — optional / if applicable */}
        <Pressable
          style={styles.complianceCard}
          onPress={() => setRegulatoryCompliance((v) => !v)}
        >
          <View style={styles.complianceCheckWrap}>
            <View style={[styles.complianceCheckbox, regulatoryCompliance && styles.complianceCheckboxChecked]}>
              {regulatoryCompliance && <Icon name="check" size={16} color="#FFF" />}
            </View>
          </View>
          <View style={styles.complianceTextWrap}>
            <Text style={styles.complianceTitle}>Regulatory compliance (if applicable)</Text>
            <Text style={styles.complianceSubtext}>
              If this applies to your institution, confirm adherence to safety, AML, and mineral handling regulations for this shipment.
            </Text>
          </View>
        </Pressable>

        {/* Proof of facility address — optional */}
        <View style={styles.field}>
          <Text style={styles.label}>Proof of facility address (optional)</Text>
          <Pressable style={styles.uploadArea} onPress={onPickProofOfFacility} disabled={pickingProof}>
            {pickingProof ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />
            ) : (
              <Icon name="upload" size={32} color={colors.textLight} />
            )}
            <Text style={styles.uploadLabel}>{pickingProof ? 'Processing…' : 'SELECT FILE TO UPLOAD'}</Text>
            <Text style={styles.uploadHint}>PDF, PNG, JPG (Max 10MB)</Text>
            {proofOfFacilityFile && (
              <Text style={styles.uploadFileName} numberOfLines={1}>{proofOfFacilityFile.name}</Text>
            )}
          </Pressable>
        </View>

        {/* Save Location */}
        <View style={styles.saveLocationCard}>
          <View>
            <Text style={styles.saveLocationTitle}>Save Location</Text>
            <Text style={styles.saveLocationSubtext}>Store for future orders</Text>
          </View>
          <Switch
            value={saveLocation}
            onValueChange={setSaveLocation}
            trackColor={{ false: '#E2E8F0', true: HOVER_BLUE }}
            thumbColor="#FFF"
          />
        </View>

        {/* Mineral Verification Report */}
        <View style={styles.sampleTestCard}>
          <View style={styles.sampleTestBgIcon}>
            <Icon name="warning" size={80} color="#1F2A44" />
          </View>
          <View style={styles.sampleTestHeader}>
            <View style={styles.sampleTestIconWrap}>
              <Icon name="warning" size={20} color="#E17100" />
            </View>
            <View style={styles.sampleTestHeaderText}>
              <Text style={styles.sampleTestTitle}>Mineral Verification Report</Text>
            </View>
          </View>
          <View style={styles.verificationList}>
            {MINERAL_VERIFICATION_STEPS.map((item, i) => (
              <View key={i} style={styles.verificationItem}>
                <View style={styles.verificationCheckWrap}>
                  <Icon name="check" size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.verificationItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
    </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            (!canConfirm || creating || submitting) && styles.ctaButtonDisabled,
            pressed && canConfirm && !creating && !submitting && styles.ctaButtonHover,
          ]}
          onPress={onConfirm}
          disabled={!canConfirm || creating || submitting}
        >
          {creating || submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.ctaButtonText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
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
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnHover: {
    backgroundColor: 'rgba(81, 162, 255, 0.25)',
  },
  headerTitleBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.4,
    color: '#1F2A44',
  },
  progressBlock: { marginTop: 18, alignItems: 'center' },
  progressTrack: {
    width: '100%',
    maxWidth: 112,
    height: 5.23,
    backgroundColor: '#DBEAFE',
    borderRadius: 99999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: PROGRESS_BLUE,
    borderRadius: 99999,
  },
  stepText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: HOVER_BLUE,
    textAlign: 'center',
  },
  stepSubtext: {
    fontSize: 10.5,
    fontWeight: '400',
    lineHeight: 14,
    color: '#8EC5FF',
    marginTop: 4,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginBottom: 12,
  },
  required: { color: colors.error, fontWeight: '600' },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIconLeft: { marginRight: 10 },
  inputWithIcon: { flex: 1, paddingVertical: 14, fontSize: 14, color: colors.primary, textAlignVertical: 'center' },
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

  // Buy-style form + saved cards (kept local to avoid cross-file refactor)
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14.5,
    padding: 21,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  formFields: { gap: 14 },
  labelAlt: { fontSize: 13, fontWeight: '700', lineHeight: 18, color: '#364153', marginBottom: 6 },
  inputWrapAlt: { position: 'relative' },
  inputIconAlt: { position: 'absolute', left: 12, top: 12, zIndex: 1 },
  inputWithIconAlt: {
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
  inputAlt: {
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
  dropdownAlt: {
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
  dropdownTextAlt: { fontSize: 15, fontWeight: '500', color: '#1C1C1C', flex: 1 },
  dropdownOpenAlt: { borderColor: HOVER_BLUE },
  dropdownListAlt: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  dropdownScrollAlt: { maxHeight: 220 },
  dropdownOptionAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dropdownOptionSelectedAlt: { backgroundColor: '#EFF6FF' },
  dropdownOptionTextAlt: { fontSize: 15, color: '#1C1C1C', flex: 1 },
  dropdownOptionTextSelectedAlt: { fontWeight: '600' },
  phoneRowAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  phoneDialBoxAlt: {
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  phoneDialTextAlt: { fontSize: 15, fontWeight: '600', color: '#374151' },
  phoneInputAlt: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 15,
    color: '#1C1C1C',
  },
  phoneRowInvalidAlt: { borderColor: '#dc2626' },
  phoneErrorAlt: { fontSize: 12, color: '#dc2626', marginTop: 4 },

  savedAddressCards: { gap: 10.5, marginBottom: 20 },
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
  pickupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  pickupOptionSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  pickupOptionText: { fontSize: 15, fontWeight: '600', color: colors.primary, flex: 1 },
  pickupOptionDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 24,
    opacity: 0.8,
  },
  pickupOptionTextMuted: { fontSize: 15, color: colors.textLight, flex: 1 },
  comingSoon: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonHover: { opacity: 0.9 },
  ctaButtonDisabled: { opacity: 0.5 },
  ctaButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  complianceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  complianceCheckWrap: { marginRight: 12 },
  complianceCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  complianceCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  complianceTextWrap: { flex: 1 },
  complianceTitle: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  complianceSubtext: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  uploadArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadLabel: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 12, letterSpacing: 0.5 },
  uploadHint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  uploadFileName: { fontSize: 12, color: HOVER_BLUE, marginTop: 8 },
  saveLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  saveLocationTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  saveLocationSubtext: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  sampleTestCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  sampleTestBgIcon: {
    position: 'absolute',
    right: 0,
    top: 2,
    opacity: 0.05,
  },
  sampleTestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.5,
    marginBottom: 17,
  },
  sampleTestIconWrap: {
    width: 35,
    height: 35,
    borderRadius: 14.5,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleTestHeaderText: { flex: 1 },
  sampleTestTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    color: '#1F2A44',
  },
  verificationList: { gap: 10.5 },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.5,
  },
  verificationCheckWrap: {
    width: 17.5,
    height: 17.5,
    borderRadius: 9,
    backgroundColor: colors.successGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationItemText: {
    fontSize: 10.5,
    fontWeight: '600',
    lineHeight: 14,
    color: '#364153',
  },
});
