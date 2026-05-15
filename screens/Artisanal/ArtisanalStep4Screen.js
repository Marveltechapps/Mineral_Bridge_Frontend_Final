import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Icon } from '../../lib/icons';
import { validateMonthlyOutput, validateOutputUnit } from '../../lib/artisanalValidations';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);
const STEP_NUM = 4;
const TOTAL_STEPS = 6;
const STEP_LABEL = `STEP ${STEP_NUM} OF ${TOTAL_STEPS}: CAPACITY & ASSETS`;
const PROGRESS_FRACTION = STEP_NUM / TOTAL_STEPS;
const DROPDOWN_BLUE = '#51A2FF';
const PROGRESS_BLUE = '#2B7FFF';
const MUTED_ICON_TEXT = '#64748B';
const DROPDOWN_TEXT_BLACK = '#1F2A44';

// Placeholder "0"; when user types, use only the number — no leading 0 in front (e.g. "05" -> "5").
function handleNumericChange(newText, setter, allowDecimals = false) {
  if (newText === '') {
    setter('');
    return;
  }
  const digitOnly = /^\d+$/;
  const decimalOnly = /^\d*\.?\d*$/;
  const valid = allowDecimals ? decimalOnly : digitOnly;
  if (!valid.test(newText)) return;
  if (allowDecimals && newText.includes('.')) {
    const [first, second] = newText.split('.');
    const normalizedFirst = first === '' && second !== undefined ? '0' : (first.replace(/^0+(\d)/, '$1') || first);
    setter(second !== undefined ? `${normalizedFirst}.${second}` : normalizedFirst);
    return;
  }
  const normalized = newText.replace(/^0+(\d)/, '$1') || (newText === '0' ? '0' : newText);
  setter(normalized);
}

// Same order as buy/sell: ct, g, kg, MT
const OUTPUT_UNIT_OPTIONS = [
  { value: 'ct', label: 'ct' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'MT', label: 'MT' },
];

const EQUIPMENT_OPTIONS = [
  { id: 'crusher', label: 'CRUSHER', icon: 'apps' },
  { id: 'washing', label: 'WASHING PLANT', icon: 'waterDrop' },
  { id: 'generator', label: 'GENERATOR', icon: 'cog' },
  { id: 'safety', label: 'SAFETY GEAR', icon: 'shieldCheck' },
  { id: 'none', label: 'NONE', icon: 'closeCircle' },
];

/** Drop capacity/assets fields so skip does not send partial step-4 data (backend allows null output). */
function paramsWithoutCapacityAssets(routeParams) {
  const {
    estimatedMonthlyOutput: _eo,
    outputUnit: _ou,
    equipment: _eq,
    storageAvailable: _sa,
    transportLogistics: _tl,
    ...rest
  } = routeParams || {};
  return rest;
}

export default function ArtisanalStep4Screen({ route, navigation }) {
  const prev = route.params || {};
  const [monthlyOutput, setMonthlyOutput] = useState('');
  const [outputUnit, setOutputUnit] = useState('kg');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [equipment, setEquipment] = useState('none');

  const onContinue = () => {
    const output = validateMonthlyOutput(monthlyOutput);
    if (!output.valid) {
      Alert.alert('Invalid input', output.message, [{ text: 'OK' }]);
      return;
    }
    const unit = validateOutputUnit(outputUnit);
    if (!unit.valid) {
      Alert.alert('Invalid input', unit.message, [{ text: 'OK' }]);
      return;
    }
    const equipmentList = equipment === 'none' ? [] : [equipment];
    navigation.navigate('ArtisanalStep5', {
      ...prev,
      estimatedMonthlyOutput: output.value,
      outputUnit: unit.value,
      equipment: equipmentList,
      storageAvailable: false,
      transportLogistics: false,
    });
  };

  const onSkip = () => {
    navigation.navigate('ArtisanalStep5', {
      ...paramsWithoutCapacityAssets(prev),
      equipment: [],
      storageAvailable: false,
      transportLogistics: false,
    });
  };

  const onSelectEquipment = (id) => {
    setEquipment(id);
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

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Capacity & Assets</Text>
            </View>
            <Text style={styles.sectionSubtitle}>YOUR PRODUCTION CAPABILITY.</Text>

            <View style={[styles.field, styles.fieldOutputWrap]}>
              <Text style={styles.fieldLabel}>EST. MONTHLY OUTPUT</Text>
              <View style={styles.outputRow}>
                <TextInput
                  style={[styles.input, styles.outputInput]}
                  value={monthlyOutput}
                  onChangeText={(t) => handleNumericChange(t, setMonthlyOutput, true)}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                />
                <Pressable
                  style={[styles.unitSelector, showUnitDropdown && styles.unitSelectorOpen]}
                  onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                >
                  <Text style={styles.unitText}>
                    {OUTPUT_UNIT_OPTIONS.find((o) => o.value === outputUnit)?.label ?? outputUnit}
                  </Text>
                  <Icon name="chevronDown" size={18} color={DROPDOWN_TEXT_BLACK} />
                </Pressable>
              </View>
              {showUnitDropdown && (
                <View style={[styles.unitDropdown, showUnitDropdown && styles.unitDropdownOverlay]}>
                  {OUTPUT_UNIT_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[styles.unitOption, outputUnit === opt.value && styles.unitOptionSelected]}
                      onPress={() => {
                        setOutputUnit(opt.value);
                        setShowUnitDropdown(false);
                      }}
                    >
                      <Text style={[styles.unitOptionText, outputUnit === opt.value && styles.unitOptionTextSelected]}>
                        {opt.label}
                      </Text>
                      {outputUnit === opt.value && <Icon name="check" size={18} color={DROPDOWN_BLUE} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EQUIPMENT AVAILABLE</Text>
              <View style={styles.equipmentGrid}>
                {EQUIPMENT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={[styles.equipmentOption, equipment === opt.id && styles.equipmentOptionSelected]}
                    onPress={() => onSelectEquipment(opt.id)}
                  >
                    <Icon
                      name={opt.icon}
                      size={22}
                      color={equipment === opt.id ? DROPDOWN_BLUE : MUTED_ICON_TEXT}
                    />
                    <Text style={[styles.equipmentOptionText, equipment === opt.id && styles.equipmentOptionTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.footerSpacer} />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
            onPress={onSkip}
          >
            <Text style={styles.skipBtnText}>Skip</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.continueBtn, pressed && styles.continueBtnPressed]} onPress={onContinue}>
            <Text style={styles.continueBtnText}>Save & Continue</Text>
            <Icon name="chevronRight" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  keyboardView: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  section: { marginBottom: 16 },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1F2A44' },
  sectionSubtitle: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 20 },
  field: { marginBottom: 18 },
  fieldOutputWrap: { position: 'relative', zIndex: 10 },
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
  outputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  outputInput: { flex: 1, minWidth: 80 },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 72,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  unitSelectorOpen: { borderColor: DROPDOWN_BLUE },
  unitText: { fontSize: 15, fontWeight: '600', color: DROPDOWN_TEXT_BLACK },
  unitDropdown: {
    marginTop: 8,
    alignSelf: 'flex-end',
    minWidth: 90,
    width: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
  },
  unitDropdownOverlay: {
    position: 'absolute',
    top: 76,
    right: 0,
    zIndex: 1000,
    elevation: 12,
    marginTop: 0,
  },
  unitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  unitOptionSelected: { backgroundColor: '#EFF6FF' },
  unitOptionText: { fontSize: 15, color: '#1F2A44' },
  unitOptionTextSelected: { fontWeight: '600', color: DROPDOWN_BLUE },
  equipmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  equipmentOption: {
    width: '48%',
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
  },
  equipmentOptionSelected: { borderColor: DROPDOWN_BLUE, borderWidth: 2, backgroundColor: '#EFF6FF' },
  equipmentOptionText: { fontSize: 10, fontWeight: '700', color: MUTED_ICON_TEXT, letterSpacing: 0.3, textAlign: 'center' },
  equipmentOptionTextSelected: { color: DROPDOWN_BLUE },
  logisticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  logisticsCardSelected: { borderColor: DROPDOWN_BLUE, borderWidth: 2 },
  logisticsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(81, 162, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  logisticsTextWrap: { flex: 1 },
  logisticsTitle: { fontSize: 12, fontWeight: '700', color: '#475569', letterSpacing: 0.5 },
  logisticsSubtitle: { fontSize: 11, color: MUTED_ICON_TEXT, marginTop: 2 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { backgroundColor: '#1F2A44', borderColor: '#1F2A44' },
  footerSpacer: { height: 140 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 10,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  skipBtnPressed: { opacity: 0.85, backgroundColor: '#F1F5F9' },
  skipBtnText: { fontSize: 16, fontWeight: '600', color: '#475569' },
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
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
