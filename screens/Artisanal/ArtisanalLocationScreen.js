import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import { Icon } from '../../lib/icons';
import { getFormDrafts, saveFormDraft } from '../../lib/services';
import { useDebouncedFormDraft } from '../../lib/useFormDraft';
import { colors } from '../../lib/theme';
import { getAfricanCountries, getStatesForAfricanCountry, getDistrictsForState } from '../../data/africanLocationData';
import { validateLocation } from '../../lib/artisanalValidations';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);
const STEP_LABEL = 'STEP 2 OF 6';
const STEP_SUBLABEL = 'Location Details';
const PROGRESS_FRACTION = 2 / 6;
const DROPDOWN_BLUE = '#51A2FF';
const PROGRESS_BLUE = '#2B7FFF';
const MUTED_ICON_TEXT = '#64748B';
const DROPDOWN_TEXT_BLACK = '#1F2A44';

const MINING_AREA_OPTIONS = [
  { id: 'river', label: 'RIVER / ALLUVIAL', icon: 'water', image: require('../../assets/icon-mining-river.png') },
  { id: 'openpit', label: 'OPEN PIT', icon: 'cube', image: null },
  { id: 'mountain', label: 'MOUNTAIN / HARD ROCK', icon: 'mountain', image: require('../../assets/icon-mining-mountain.png') },
  { id: 'underground', label: 'UNDERGROUND', icon: 'pickaxe', image: null },
];

export default function ArtisanalLocationScreen({ route, navigation }) {
  const [countryName, setCountryName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [gpsLocation, setGpsLocation] = useState('');
  const [miningAreaType, setMiningAreaType] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const africanCountries = useMemo(() => getAfricanCountries(), []);
  const stateOptions = useMemo(() => getStatesForAfricanCountry(countryCode), [countryCode]);
  const districtOptions = useMemo(() => getDistrictsForState(countryCode, stateProvince), [countryCode, stateProvince]);

  const onSelectCountry = (name, code) => {
    setCountryName(name);
    setCountryCode(code);
    setStateProvince('');
    setDistrict('');
    setOpenDropdown(null);
  };

  const onSelectState = (name) => {
    setStateProvince(name);
    setDistrict('');
    setOpenDropdown(null);
  };

  const onSelectDistrict = (name) => {
    setDistrict(name);
    setOpenDropdown(null);
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required to set your mining site location.');
        return;
      }
      const coords = (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
      const [rev] = await Location.reverseGeocodeAsync(coords);
      if (rev) {
        const parts = [rev.city, rev.region, rev.country].filter(Boolean);
        setGpsLocation(parts.join(', ') || `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      } else {
        setGpsLocation(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      }
    } catch (e) {
      Alert.alert('Location error', e.message || 'Could not get location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const canContinue =
    (countryName || '').trim() !== '' &&
    (stateProvince || '').trim() !== '' &&
    (district || '').trim() !== '' &&
    (village || '').trim() !== '';

  const minerType = route?.params?.minerType ?? null;

  useDebouncedFormDraft(
    'artisanalLocation',
    {
      countryName,
      countryCode,
      stateProvince,
      district,
      village,
      gpsLocation,
      miningAreaType,
    },
    {
      deps: [countryName, countryCode, stateProvince, district, village, gpsLocation, miningAreaType],
    }
  );

  useEffect(() => {
    getFormDrafts()
      .then((drafts) => {
        const d = drafts?.artisanalLocation;
        if (!d || typeof d !== 'object') return;
        if (d.countryName) setCountryName(d.countryName);
        if (d.countryCode) setCountryCode(d.countryCode);
        if (d.stateProvince) setStateProvince(d.stateProvince);
        if (d.district) setDistrict(d.district);
        if (d.village) setVillage(d.village);
        if (d.gpsLocation) setGpsLocation(d.gpsLocation);
        if (d.miningAreaType) setMiningAreaType(d.miningAreaType);
      })
      .catch(() => {});
  }, []);

  const onContinue = () => {
    const location = validateLocation(countryName, stateProvince, district, village);
    if (!location.valid) {
      Alert.alert('Required fields', location.message, [{ text: 'OK' }]);
      return;
    }
    saveFormDraft('artisanalLocation', {
      countryName,
      countryCode,
      stateProvince,
      district,
      village,
      gpsLocation,
      miningAreaType,
    }).catch(() => {});
    navigation.navigate('ArtisanalStep3', {
      minerType,
      country: countryName,
      countryCode,
      stateProvince,
      district,
      region: stateProvince,
      village,
      gps: gpsLocation || undefined,
      miningAreaType,
    });
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]}
            onPress={() => navigation.goBack()}
          >
            {({ pressed }) => (
              <Icon name="chevronLeft" size={24} color={pressed ? '#1F2A44' : DROPDOWN_BLUE} />
            )}
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.iconBox}>
              <Icon name="pickaxe" size={20} color={DROPDOWN_BLUE} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Artisanal Miner Profile</Text>
              <Text style={styles.headerSubtitle}>ASM REGULATORY ONBOARDING</Text>
            </View>
          </View>
        </View>
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${PROGRESS_FRACTION * 100}%` }]} />
          </View>
          <Text style={styles.stepText}>{STEP_LABEL}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location Details</Text>
          </View>
          <Text style={styles.sectionSubtitle}>WHERE IS YOUR MINING SITE LOCATED?</Text>

          <View style={[styles.field, openDropdown === 'country' && styles.fieldDropdownOpen]}>
            <Text style={styles.fieldLabel}>COUNTRY</Text>
            <Pressable
              style={[styles.dropdown, openDropdown === 'country' && styles.dropdownOpen]}
              onPress={() => setOpenDropdown(openDropdown === 'country' ? null : 'country')}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {countryName || 'Select country'}
              </Text>
              <Icon name="chevronDown" size={18} color={DROPDOWN_TEXT_BLACK} />
            </Pressable>
            {openDropdown === 'country' && (
              <View style={styles.dropdownList} collapsable={false}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {africanCountries.map((c) => (
                    <Pressable
                      key={c.code}
                      style={[styles.dropdownOption, c.name === countryName && styles.dropdownOptionSelected]}
                      onPress={() => onSelectCountry(c.name, c.code)}
                    >
                      <Text style={[styles.dropdownOptionText, c.name === countryName && styles.dropdownOptionTextSelected]} numberOfLines={1}>{c.name}</Text>
                      {c.name === countryName && <Icon name="check" size={18} color={colors.primary} />}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={[styles.field, openDropdown === 'state' && styles.fieldDropdownOpen]}>
            <Text style={styles.fieldLabel}>STATE / PROVINCE</Text>
            <Pressable
              style={[styles.dropdown, openDropdown === 'state' && styles.dropdownOpen]}
              onPress={() => setOpenDropdown(openDropdown === 'state' ? null : 'state')}
              disabled={!countryCode}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {stateProvince || 'Select'}
              </Text>
              <Icon name="chevronDown" size={18} color={DROPDOWN_TEXT_BLACK} />
            </Pressable>
            {openDropdown === 'state' && (
              <View style={styles.dropdownList} collapsable={false}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {stateOptions.map((opt) => (
                    <Pressable
                      key={opt}
                      style={[styles.dropdownOption, opt === stateProvince && styles.dropdownOptionSelected]}
                      onPress={() => onSelectState(opt)}
                    >
                      <Text style={[styles.dropdownOptionText, opt === stateProvince && styles.dropdownOptionTextSelected]} numberOfLines={1}>{opt}</Text>
                      {opt === stateProvince && <Icon name="check" size={18} color={colors.primary} />}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={[styles.field, openDropdown === 'district' && styles.fieldDropdownOpen]}>
            <Text style={styles.fieldLabel}>DISTRICT</Text>
            <Pressable
              style={[styles.dropdown, openDropdown === 'district' && styles.dropdownOpen]}
              onPress={() => setOpenDropdown(openDropdown === 'district' ? null : 'district')}
              disabled={!stateProvince}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {district || 'Select'}
              </Text>
              <Icon name="chevronDown" size={18} color={DROPDOWN_TEXT_BLACK} />
            </Pressable>
            {openDropdown === 'district' && (
              <View style={styles.dropdownList} collapsable={false}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {districtOptions.map((opt) => (
                    <Pressable
                      key={opt}
                      style={[styles.dropdownOption, opt === district && styles.dropdownOptionSelected]}
                      onPress={() => onSelectDistrict(opt)}
                    >
                      <Text style={[styles.dropdownOptionText, opt === district && styles.dropdownOptionTextSelected]} numberOfLines={1}>{opt}</Text>
                      {opt === district && <Icon name="check" size={18} color={colors.primary} />}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>VILLAGE / TOWN</Text>
            <TextInput
              style={styles.input}
              value={village}
              onChangeText={setVillage}
              placeholder="Enter village name"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>GPS LOCATION (optional)</Text>
            <Pressable style={[styles.locationBox, gpsLocation && styles.locationBoxFilled]} onPress={getCurrentLocation} disabled={locationLoading}>
              {locationLoading ? (
                <ActivityIndicator size="small" color={gpsLocation ? '#1F2A44' : '#FFFFFF'} />
              ) : gpsLocation ? (
                <Text style={styles.locationBoxText} numberOfLines={2}>{gpsLocation}</Text>
              ) : (
                <>
                  <Icon name="location" size={20} color="#FFFFFF" />
                  <Text style={styles.locationBtnText}>Use Current Location</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>MINING AREA TYPE (optional)</Text>
            <View style={styles.miningGrid}>
              {MINING_AREA_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.miningOption, miningAreaType === opt.id && styles.miningOptionSelected]}
                  onPress={() => setMiningAreaType(miningAreaType === opt.id ? null : opt.id)}
                >
                  {opt.image ? (
                    <Image source={opt.image} style={styles.miningOptionImage} resizeMode="contain" />
                  ) : (
                    <Icon name={opt.icon} size={24} color={miningAreaType === opt.id ? DROPDOWN_BLUE : MUTED_ICON_TEXT} />
                  )}
                  <Text style={[styles.miningOptionText, miningAreaType === opt.id && styles.miningOptionTextSelected]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.footerSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.continueBtn,
            pressed && styles.continueBtnPressed,
            !canContinue && styles.continueBtnDisabled,
          ]}
          onPress={onContinue}
          disabled={!canContinue}
        >
          <Text style={styles.continueBtnText}>CONTINUE</Text>
          <Icon name="chevronRight" size={20} color="#FFFFFF" />
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
  backBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  headerTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', lineHeight: 22, letterSpacing: -0.4, color: '#1F2A44' },
  headerSubtitle: { fontSize: 10, fontWeight: '600', color: '#64748B', letterSpacing: 0.5, marginTop: 2 },
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
    color: DROPDOWN_BLUE,
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  section: { marginBottom: 16 },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1F2A44' },
  sectionSubtitle: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 20 },
  field: { marginBottom: 18 },
  fieldDropdownOpen: { zIndex: 1000 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1F2A44',
  },
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
  dropdownOpen: { borderColor: DROPDOWN_BLUE },
  dropdownText: { fontSize: 15, color: DROPDOWN_TEXT_BLACK, flex: 1 },
  dropdownList: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 8,
  },
  dropdownScroll: { maxHeight: 220 },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownOptionSelected: { backgroundColor: '#EFF6FF' },
  dropdownOptionText: { fontSize: 15, color: '#1F2A44', flex: 1 },
  dropdownOptionTextSelected: { fontWeight: '600', color: colors.primary },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1F2A44',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  locationBoxFilled: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationBoxText: { fontSize: 14, color: DROPDOWN_TEXT_BLACK, flex: 1 },
  locationBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  miningOptionImage: { width: 24, height: 24 },
  miningGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  miningOption: {
    width: '48%',
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  miningOptionSelected: { borderColor: DROPDOWN_BLUE, borderWidth: 2, backgroundColor: '#EFF6FF' },
  miningOptionText: { fontSize: 11, fontWeight: '600', color: MUTED_ICON_TEXT, marginTop: 8, textAlign: 'center' },
  miningOptionTextSelected: { color: colors.primary },
  footerSpacer: { height: 100 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1F2A44',
    paddingVertical: 16,
    borderRadius: 14,
  },
  continueBtnPressed: { opacity: 0.9 },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
