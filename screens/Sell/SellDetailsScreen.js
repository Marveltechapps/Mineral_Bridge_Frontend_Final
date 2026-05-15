import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
  Modal,
  Platform,
  InteractionManager,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import { pickCameraStable, checkPendingImageResult, bumpPickerFocusGrace } from '../../lib/stablePicker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { getBuyContent, getFormDrafts, saveFormDraft } from '../../lib/services';
import {
  isLimitedAvailabilityOn,
  getLimitedAvailabilityQty,
  orderUnitOptionsPrimaryFirst,
  normalizeAppUnit,
} from '../../lib/mineralDisplay';
import { useDebouncedFormDraft } from '../../lib/useFormDraft';

// Google Maps Embed only accepts keys from Google Cloud (format AIza...). Other tokens (e.g. sk-proj-...) are invalid.
const googleMapsToken = Constants.expoConfig?.extra?.googleMapsToken || '';
const isGoogleMapsKey = typeof googleMapsToken === 'string' && googleMapsToken.startsWith('AIza');

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_MARGIN_UP_PERCENT = 0.06;
/** Local key to persist picked photo URI so it survives app reload after camera picker */
const SELL_DETAILS_PICKED_KEY = 'sell_details_picked_files';
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);
const HOVER_BLUE = '#51A2FF';

// Order: ct (carat), g, kg, MT (metric tons)
const UNIT_OPTIONS = ['ct', 'g', 'kg', 'MT'];
const DEFAULT_MINERAL_TYPE_OPTIONS = ['Raw', 'Semi Finished', 'Finished'];
const DEFAULT_BUYER_OPTIONS = [
  'Legitimate B2B mineral suppliers',
  'Mining companies',
  'Traders',
  'Refineries',
  'Others',
];

function DropdownSelect({ label, value, options, open, onToggle, onSelect }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={({ pressed }) => [styles.dropdown, pressed && styles.dropdownPressed]}
        onPress={onToggle}
      >
        <Text style={[styles.dropdownText, { color: value ? colors.primary : colors.textMuted }]} numberOfLines={1}>
          {value || 'Select'}
        </Text>
        <Icon name="chevronDown" size={18} color={open ? HOVER_BLUE : '#64748B'} />
      </Pressable>
      {open && (
        <View style={styles.dropdownList}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={({ pressed }) => [
                styles.dropdownOption,
                opt === value && styles.dropdownOptionSelected,
                pressed && styles.dropdownOptionPressed,
              ]}
              onPress={() => onSelect(opt)}
            >
              {({ pressed }) => (
                <>
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      opt === value && styles.dropdownOptionTextSelected,
                      pressed && { color: HOVER_BLUE },
                    ]}
                    numberOfLines={1}
                  >
                    {opt}
                  </Text>
                  {opt === value && <Icon name="check" size={18} color={HOVER_BLUE} />}
                </>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SellDetailsScreen({ route, navigation }) {
  const { width, height } = useWindowDimensions();
  const contentWidth = Math.min(width, 420);
  const isCompactHeight = height < 740;
  const { mineral, category, acceptedFormat, fromArtisanal } = route.params || {};
  const [buyContent, setBuyContent] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(() => normalizeAppUnit(mineral?.defaultUnit || mineral?.unit) || 'g');
  const mineralTypeOptions = (Array.isArray(buyContent?.quantityStep?.mineralTypeOptions) && buyContent.quantityStep.mineralTypeOptions.length > 0)
    ? buyContent.quantityStep.mineralTypeOptions
    : DEFAULT_MINERAL_TYPE_OPTIONS;
  const buyerOptions = (Array.isArray(buyContent?.quantityStep?.buyerCategoryOptions) && buyContent.quantityStep.buyerCategoryOptions.length > 0)
    ? buyContent.quantityStep.buyerCategoryOptions
    : DEFAULT_BUYER_OPTIONS;
  const [mineralType, setMineralType] = useState(acceptedFormat || mineral?.defaultAcceptedFormat || mineralTypeOptions[0] || 'Raw');
  const [buyer, setBuyer] = useState(buyerOptions[0]);
  const [otherBuyerSpec, setOtherBuyerSpec] = useState('');
  const [originLocation, setOriginLocation] = useState('');
  const [extractionDate, setExtractionDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const mineralKey =
    mineral?.id != null
      ? String(mineral.id)
      : mineral?._id != null
        ? String(mineral._id)
        : '';

  // Per-mineral units from dashboard. When limited availability is set, only that unit.
  // Listing stock/price unit is first; other allowed units follow.
  const unitOptions = useMemo(() => {
    const av = mineral?.availability;
    const limQ = getLimitedAvailabilityQty(av);
    let raw;
    if (isLimitedAvailabilityOn(av) && limQ != null && av && typeof av === 'object' && av.unit) {
      raw = [String(av.unit).trim()];
    } else if (Array.isArray(mineral?.allowedUnits) && mineral.allowedUnits.length > 0) {
      raw = mineral.allowedUnits;
    } else {
      raw = UNIT_OPTIONS;
    }
    return orderUnitOptionsPrimaryFirst(mineral, raw);
  }, [mineral]);

  const primaryUnit = unitOptions[0];
  const unitPrimarySyncRef = useRef({ key: '', primary: '' });

  useEffect(() => {
    if (!unitOptions.length) return;
    if (!unitOptions.includes(unit)) {
      setUnit(unitOptions[0]);
    }
  }, [unitOptions, unit]);

  useEffect(() => {
    if (!mineralKey || !unitOptions.length || primaryUnit == null || primaryUnit === '') return;
    const prev = unitPrimarySyncRef.current;
    const keyChanged = prev.key !== mineralKey;
    const primaryChanged = prev.primary !== primaryUnit;
    if (keyChanged || primaryChanged) {
      unitPrimarySyncRef.current = { key: mineralKey, primary: primaryUnit };
      setUnit(primaryUnit);
    }
  }, [mineralKey, unitOptions, primaryUnit]);

  useEffect(() => {
    let cancelled = false;
    getBuyContent()
      .then((data) => { if (!cancelled) setBuyContent(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Android: recover image pick result if activity was recreated (e.g. after camera/gallery)
  useEffect(() => {
    checkPendingImageResult(
      (stableUri) => setPhotoFile({ uri: stableUri, name: `photo_${Date.now()}.jpg` }),
      () => {}
    );
  }, []);

  // Restore photo URI after app reload (e.g. when returning from camera picker)
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SELL_DETAILS_PICKED_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const data = JSON.parse(raw);
          if (data.photoUri) setPhotoFile({ uri: data.photoUri, name: data.photoName || `photo_${Date.now()}.jpg` });
        } catch (_) {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Sync selection when content loads so dashboard-driven options are reflected
  useEffect(() => {
    if (!buyContent?.quantityStep) return;
    const types = buyContent.quantityStep.mineralTypeOptions;
    const cats = buyContent.quantityStep.buyerCategoryOptions;
    if (Array.isArray(types) && types.length > 0 && !types.includes(mineralType)) {
      setMineralType(types[0]);
    }
    if (Array.isArray(cats) && cats.length > 0 && !cats.includes(buyer)) {
      setBuyer(cats[0]);
    }
  }, [buyContent]);

  // Auto-fill from last-used data for existing user (same mobile)
  useEffect(() => {
    if (fromArtisanal) return;
    let cancelled = false;
    getFormDrafts()
      .then((drafts) => {
        if (cancelled || !drafts?.sellDetails) return;
        const d = drafts.sellDetails;
        if (typeof d.quantity === 'string' || typeof d.quantity === 'number') setQuantity(String(d.quantity));
        if (d.mineralType) setMineralType(d.mineralType);
        if (d.buyer) setBuyer(d.buyer);
        if (typeof d.otherBuyerSpec === 'string') setOtherBuyerSpec(d.otherBuyerSpec);
        if (typeof d.originLocation === 'string') setOriginLocation(d.originLocation);
        if (d.extractionDateISO) {
          try {
            const date = new Date(d.extractionDateISO);
            if (!Number.isNaN(date.getTime())) setExtractionDate(date);
          } catch (_) {}
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [fromArtisanal]);

  useDebouncedFormDraft(
    'sellDetails',
    {
      quantity,
      unit,
      mineralType,
      buyer,
      otherBuyerSpec,
      originLocation,
      extractionDateISO: extractionDate ? extractionDate.toISOString() : undefined,
    },
    {
      deps: [
        quantity,
        unit,
        mineralType,
        buyer,
        otherBuyerSpec,
        originLocation,
        extractionDate?.getTime() ?? null,
      ],
    }
  );

  const formatExtractionDisplay = (d) => (d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '');

  const getCurrentLocation = async (closeModal = false, existingCoords = null) => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location to detect your mining site area. You can skip origin and continue.');
        return;
      }
      const coords = existingCoords?.latitude != null
        ? existingCoords
        : (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
      const [rev] = await Location.reverseGeocodeAsync(coords);
      if (rev) {
        const parts = [rev.city, rev.region, rev.country].filter(Boolean);
        setOriginLocation(parts.join(', ') || '');
      }
      if (closeModal) setShowMapModal(false);
    } catch (e) {
      Alert.alert('Location error', e.message || 'Could not get location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const openMapModal = () => {
    setShowMapModal(true);
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMapCenter(loc.coords);
      } catch (e) {
        // Map center optional; user can still tap "Use this location"
      }
    })();
  };

  const onExtractionDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setExtractionDate(selectedDate);
  };

  const takePhoto = () => {
    if (pickingPhoto) return;
    bumpPickerFocusGrace();
    setPickingPhoto(true);
    pickCameraStable(
      { aspect: [1, 1], quality: 0.6 },
      (stableUri) => {
        if (!isMounted.current) { setPickingPhoto(false); return; }
        if (stableUri) {
          const name = `photo_${Date.now()}.jpg`;
          InteractionManager.runAfterInteractions(() => {
            if (!isMounted.current) { setPickingPhoto(false); return; }
            setPhotoFile({ uri: stableUri, name });
            bumpPickerFocusGrace();
            AsyncStorage.setItem(SELL_DETAILS_PICKED_KEY, JSON.stringify({
              photoUri: stableUri,
              photoName: name,
            })).catch(() => {});
            setPickingPhoto(false);
          });
        } else {
          setPickingPhoto(false);
        }
      },
      (msg) => {
        if (!isMounted.current) { setPickingPhoto(false); return; }
        if (msg) {
          Alert.alert(
            msg === 'Permission needed' ? 'Permission needed' : 'Error',
            msg === 'Permission needed' ? 'Camera access is required to take a photo.' : msg || 'Could not open camera'
          );
        }
        setPickingPhoto(false);
      },
      () => {
        if (isMounted.current) setPickingPhoto(false);
      }
    );
  };

  // Origin location is optional (user may not want to share origin).
  const canSubmit = quantity && parseFloat(quantity) > 0 && extractionDate && photoFile;

  const submit = () => {
    if (!canSubmit) return;
    const av = mineral?.availability;
    const limQ = getLimitedAvailabilityQty(av);
    if (isLimitedAvailabilityOn(av) && limQ != null && av && typeof av === 'object' && av.unit) {
      const limUnit = String(av.unit).trim();
      if (unit !== limUnit) {
        Alert.alert('Unit mismatch', `This mineral is only available in ${limUnit}. Please select ${limUnit}.`);
        return;
      }
      const q = parseFloat(quantity);
      if (!Number.isNaN(q) && q > limQ) {
        Alert.alert('Limit exceeded', `Only ${limQ} ${limUnit} available for this mineral.`);
        return;
      }
    }
    const photos = [photoFile].filter(Boolean);
    saveFormDraft('sellDetails', {
      quantity,
      unit,
      mineralType,
      buyer,
      otherBuyerSpec,
      originLocation,
      extractionDateISO: extractionDate ? extractionDate.toISOString() : undefined,
    }).catch(() => {});
    AsyncStorage.removeItem(SELL_DETAILS_PICKED_KEY).catch(() => {});
    navigation.navigate('SellLogistics', {
      mineral,
      category,
      quantity: quantity || '0',
      unit,
      type: mineralType,
      origin: originLocation,
      extractionYear: extractionDate ? formatExtractionDisplay(extractionDate) : '',
      buyer: buyer === 'Others' ? otherBuyerSpec.trim() || 'Others' : buyer,
      otherBuyerSpec: buyer === 'Others' ? otherBuyerSpec : undefined,
      photos,
      fromArtisanal,
    });
  };

  const closeDropdown = () => setOpenDropdown(null);

  return (
    <View style={styles.page}>
      {/* Header – same alignment as Buy module Quantity Selection: padding, back, icon box, title */}
      <View style={[styles.header, { width: contentWidth, alignSelf: 'center' }]}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={() => navigation.goBack()}>
            {({ pressed }) => (
              <Icon name="chevronLeft" size={24} color={pressed ? '#1F2A44' : HOVER_BLUE} />
            )}
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconBox}>
              <Icon name="scale" size={22} color={HOVER_BLUE} />
            </View>
            <Text style={styles.headerTitle}>Mineral Details</Text>
          </View>
        </View>
        {/* Step 1 of 2 + horizontal line – same as Location / SellLogistics (STEP 2 OF 2) */}
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '50%' }]} />
          </View>
          <Text style={styles.stepText}>STEP 1 OF 2</Text>
          <Text style={styles.stepSubtext}>Quantity & mineral details</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { width: contentWidth, alignSelf: 'center', paddingBottom: isCompactHeight ? 132 : 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quantity / Weight – input + unit dropdown */}
        <View style={styles.field}>
          <Text style={styles.label}>Quantity / Weight</Text>
          <View style={styles.quantityRow}>
            <View style={styles.quantityInputWrap}>
              <Icon name="scale" size={20} color={HOVER_BLUE} style={styles.quantityInputIcon} />
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textLight}
              />
            </View>
            <View style={styles.unitDropdownWrap}>
              <Pressable
                style={({ pressed }) => [styles.unitDropdown, pressed && styles.dropdownPressed]}
                onPress={() => setOpenDropdown(openDropdown === 'unit' ? null : 'unit')}
              >
                <Text style={styles.unitDropdownText} numberOfLines={1}>{unit}</Text>
                <Icon name="chevronDown" size={16} color="#64748B" />
              </Pressable>
              {openDropdown === 'unit' && (
                <View style={styles.unitDropdownList}>
                  {unitOptions.map((opt) => (
                    <Pressable
                      key={opt}
                      style={({ pressed }) => [styles.unitOption, pressed && { backgroundColor: '#EFF6FF' }]}
                      onPress={() => { setUnit(opt); setOpenDropdown(null); }}
                    >
                      <Text style={[styles.unitOptionText, opt === unit && styles.unitOptionTextSelected]}>{opt}</Text>
                      {opt === unit && <Icon name="check" size={18} color={HOVER_BLUE} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        <DropdownSelect
          label="Mineral Type"
          value={mineralType}
          options={mineralTypeOptions}
          open={openDropdown === 'type'}
          onToggle={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
          onSelect={(v) => { setMineralType(v); setOpenDropdown(null); }}
        />

        <DropdownSelect
          label="Target Institutional Buyer"
          value={buyer}
          options={buyerOptions}
          open={openDropdown === 'buyer'}
          onToggle={() => setOpenDropdown(openDropdown === 'buyer' ? null : 'buyer')}
          onSelect={(v) => { setBuyer(v); setOpenDropdown(null); }}
        />
        {buyer === 'Others' && (
          <View style={styles.field}>
            <Text style={styles.label}>Specify Buyer category</Text>
            <TextInput
              style={styles.specifyInput}
              value={otherBuyerSpec}
              onChangeText={setOtherBuyerSpec}
              placeholder="Enter buyer category"
              placeholderTextColor={colors.textLight}
            />
          </View>
        )}

        {/* Origin Location – optional; tap opens map modal to set from device location */}
        <View style={styles.field}>
          <Text style={styles.label}>Origin Location (optional)</Text>
          <Pressable style={styles.inputWrap} onPress={openMapModal}>
            <View style={styles.inputIconLeft}>
              <Icon name="location" size={18} color={HOVER_BLUE} />
            </View>
            <View style={styles.originTextWrap}>
              <Text style={[styles.originInput, !originLocation.trim() && styles.placeholderText]} numberOfLines={1}>
                {originLocation.trim() || 'Tap to add city/region'}
              </Text>
            </View>
            {originLocation.trim() ? (
              <Pressable onPress={(e) => { e.stopPropagation(); setOriginLocation(''); }} hitSlop={8} style={styles.originClearBtn}>
                <Icon name="close" size={18} color={colors.primary} />
              </Pressable>
            ) : null}
          </Pressable>
          {showMapModal && (
            <Modal visible={showMapModal} animationType="slide" transparent>
              <View style={styles.mapModalOverlay}>
                <View style={styles.mapModalContent}>
                  <View style={styles.mapModalHeader}>
                    <Text style={styles.mapModalTitle}>Set origin location (optional)</Text>
                    <Pressable onPress={() => setShowMapModal(false)} hitSlop={12}>
                      <Icon name="close" size={24} color={colors.primary} />
                    </Pressable>
                  </View>
                  {isGoogleMapsKey && mapCenter && (
                    <View style={styles.mapWebViewWrap}>
                      <WebView
                        source={{
                          uri: `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(googleMapsToken)}&center=${mapCenter.latitude},${mapCenter.longitude}&zoom=15`,
                        }}
                        style={styles.mapWebView}
                      />
                    </View>
                  )}
                  <Pressable
                    style={({ pressed }) => [styles.useLocationBtn, pressed && styles.useLocationBtnPressed]}
                    onPress={() => getCurrentLocation(true, mapCenter)}
                    disabled={locationLoading}
                  >
                    <Icon name="location" size={20} color="#FFF" />
                    <Text style={styles.useLocationBtnText}>
                      {locationLoading ? 'Getting location…' : 'Use this location'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          )}
        </View>
        {/* Extraction – date picker: date, month, year */}
        <View style={styles.field}>
          <Text style={styles.label}>Extraction Date</Text>
          <Pressable style={styles.inputWrap} onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar" size={18} color={HOVER_BLUE} style={styles.inputIconLeft} />
            <Text style={[styles.inputWithIcon, !extractionDate && styles.placeholderText]}>
              {formatExtractionDisplay(extractionDate) || 'DD/MM/YYYY'}
            </Text>
          </Pressable>
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={extractionDate || new Date()}
              mode="date"
              display="default"
              onChange={onExtractionDateChange}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <Modal transparent animationType="slide">
              <Pressable style={styles.datePickerModalOverlay} onPress={() => setShowDatePicker(false)}>
                <View style={styles.datePickerModalContent}>
                  <View style={styles.datePickerModalHeader}>
                    <Pressable onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={extractionDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={onExtractionDateChange}
                  />
                </View>
              </Pressable>
            </Modal>
          )}
        </View>

        {/* Photo – same size as Origin / Extraction Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Photo</Text>
          <View style={styles.inputWrap}>
            <View style={styles.inputIconLeft}>
              <Icon name="camera" size={18} color={HOVER_BLUE} />
            </View>
            <Pressable style={styles.photoInputBox} onPress={photoFile ? undefined : takePhoto}>
              {photoFile ? (
                <>
                  <Text style={styles.inputWithIcon} numberOfLines={1}>{photoFile.name}</Text>
                  <Pressable onPress={() => setPhotoFile(null)} hitSlop={8} style={styles.removeBtn}>
                    <Icon name="close" size={18} color={colors.primary} />
                  </Pressable>
                </>
              ) : (
                <Text style={[styles.inputWithIcon, styles.placeholderText]}>Take Photo</Text>
              )}
            </Pressable>
          </View>
        </View>
    </ScrollView>

      {/* Footer – Submit only opens next screen when form is valid */}
      <View style={[styles.footer, { width: contentWidth, alignSelf: 'center', paddingBottom: isCompactHeight ? 24 : 34 }]}>
        <Pressable
          style={({ pressed }) => [styles.ctaButton, { width: contentWidth - 40, alignSelf: 'center' }, !canSubmit && styles.ctaButtonDisabled, pressed && canSubmit && styles.ctaButtonHover]}
          onPress={submit}
          disabled={!canSubmit}
        >
          <Text style={styles.ctaButtonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
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
    backgroundColor: HOVER_BLUE,
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
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  quantityRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  quantityInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIconLeft: { marginRight: 10 },
  quantityInputIcon: { marginRight: 10 },
  quantityInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.primary },
  unitDropdownWrap: { position: 'relative', minWidth: 100 },
  unitDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  unitDropdownText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  unitDropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10,
  },
  unitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  unitOptionText: { fontSize: 15, color: colors.primary },
  unitOptionTextSelected: { fontWeight: '600' },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  dropdownPressed: { borderColor: HOVER_BLUE },
  dropdownText: { fontSize: 15, flex: 1 },
  dropdownList: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownOptionSelected: { backgroundColor: '#EFF6FF' },
  dropdownOptionPressed: { backgroundColor: 'rgba(81, 162, 255, 0.1)' },
  dropdownOptionText: { fontSize: 15, color: colors.primary, flex: 1 },
  dropdownOptionTextSelected: { fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputWithIcon: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.primary, textAlignVertical: 'center' },
  originTextWrap: { flex: 1, justifyContent: 'center', paddingVertical: 14 },
  originInput: { fontSize: 15, color: colors.primary },
  originClearBtn: { padding: 4 },
  placeholderText: { color: colors.textLight },
  mapModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  mapModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24, maxHeight: '80%' },
  mapModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  mapModalTitle: { fontSize: 17, fontWeight: '700', color: colors.primary },
  mapWebViewWrap: { height: 220, marginHorizontal: 16, marginVertical: 12, borderRadius: 12, overflow: 'hidden' },
  mapWebView: { flex: 1 },
  useLocationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: HOVER_BLUE, marginHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
  useLocationBtnPressed: { opacity: 0.9 },
  useLocationBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  datePickerDone: { marginTop: 8, alignSelf: 'flex-end' },
  datePickerDoneText: { fontSize: 16, fontWeight: '600', color: HOVER_BLUE },
  datePickerModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  datePickerModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  datePickerModalHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  specifyInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.primary,
  },
  photosRow: { flexDirection: 'row', gap: 12 },
  photoInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeBtn: { padding: 4 },
  photosFilesContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
  },
  photoFileName: { fontSize: 14, color: colors.primary, flex: 1 },
  photosAddRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  photosAddBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  photosAddBtnText: { fontSize: 14, fontWeight: '600', color: HOVER_BLUE },
  photoBox: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 120,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBoxPressed: { borderColor: HOVER_BLUE, backgroundColor: '#EFF6FF' },
  photoBoxText: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 8 },
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
});
