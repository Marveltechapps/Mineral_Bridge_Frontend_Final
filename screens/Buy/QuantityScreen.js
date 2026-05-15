import { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Icon } from '../../lib/icons';
import { getBuyContent, addBuyerCategory, getMineralById, getFormDrafts, saveFormDraft } from '../../lib/services';
import { useDebouncedFormDraft } from '../../lib/useFormDraft';
import {
  formatAvailability,
  getInStockLabelForQuantityStep,
  getBuyMaxQuantityAndUnit,
  getAvailableQuantityHeroLine,
  isLimitedAvailabilityOn,
  getLimitedAvailabilityQty,
  orderUnitOptionsPrimaryFirst,
} from '../../lib/mineralDisplay';
import { normalizeRemoteImageUri } from '../../lib/remoteImageUri';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);

const STEP_LABEL = 'STEP 2 OF 3';
const PROGRESS_FRACTION = 1 / 3; // Step 1 of 3

// 2nd image: Mineral type options
const MINERAL_TYPE_OPTIONS = ['Raw', 'Semi Finished', 'Finished'];

// 3rd image: Institutional buyer category options
const BUYER_CATEGORY_OPTIONS = [
  'Legitimate B2B mineral suppliers',
  'Mining companies',
  'Traders',
  'Refineries',
  'Others',
];

// 4th/5th/6th image: Unit options — ct (carat), g, kg, MT (metric tons). Order: ct, g, kg, MT.
const UNIT_OPTIONS = ['ct', 'g', 'kg', 'MT'];
const PRESET_QUANTITIES = [5, 10, 25, 50];
const DEFAULT_STOCK = '500';

const HOVER_BLUE = '#51A2FF';

function DropdownSelect({ label, value, options, open, onToggle, onSelect, style }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        style={({ pressed }) => [styles.dropdown, pressed && styles.dropdownPressed]}
        onPress={onToggle}
      >
        {({ pressed }) => (
          <>
            <Text style={[styles.dropdownText, pressed && { color: HOVER_BLUE }]} numberOfLines={1}>{value}</Text>
            <Icon name="chevronDown" size={18} color={pressed ? HOVER_BLUE : '#64748B'} />
          </>
        )}
      </Pressable>
      {open && (
        <View style={styles.dropdownList}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.dropdownOption, opt === value && styles.dropdownOptionSelected]}
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
                  {opt === value && <Icon name="check" size={18} color="#1F2A44" />}
                </>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function QuantityScreen({ route, navigation }) {
  const { width, height } = useWindowDimensions();
  const contentWidth = Math.min(width, 420);
  const isCompactHeight = height < 740;
  const { mineral: mineralParam } = route.params || {};
  const [mineral, setMineral] = useState(mineralParam || null);
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('kg');
  const [mineralType, setMineralType] = useState('Raw');
  const [buyerCategory, setBuyerCategory] = useState(BUYER_CATEGORY_OPTIONS[0]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [buyContent, setBuyContent] = useState(null);
  const [otherBuyerCategoryInput, setOtherBuyerCategoryInput] = useState('');
  const [addingBuyerCategory, setAddingBuyerCategory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBuyContent()
      .then((data) => { if (!cancelled) setBuyContent(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Existing user (same mobile): auto-fill from last-used form data. New user: leave empty.
  useEffect(() => {
    let cancelled = false;
    getFormDrafts()
      .then((drafts) => {
        if (cancelled || !drafts?.buyQuantity) return;
        const d = drafts.buyQuantity;
        if (typeof d.quantity === 'number' && d.quantity >= 0) setQuantity(d.quantity);
        if (d.mineralType && typeof d.mineralType === 'string') setMineralType(d.mineralType);
        if (d.buyerCategory && typeof d.buyerCategory === 'string') setBuyerCategory(d.buyerCategory);
        if (d.otherBuyerCategoryInput != null) setOtherBuyerCategoryInput(String(d.otherBuyerCategoryInput));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Always refresh mineral from backend by id so pricing, availability, and minAllocation reflect latest dashboard values
  useEffect(() => {
    const id = mineralParam?.id ?? (mineralParam?._id && String(mineralParam._id));
    if (!id) return;
    let cancelled = false;
    getMineralById(id)
      .then((data) => { if (!cancelled) setMineral(data || mineralParam || null); })
      .catch(() => { if (!cancelled) setMineral(mineralParam || null); });
    return () => { cancelled = true; };
  }, [mineralParam?.id, mineralParam?._id]);

  const quantityStep = buyContent?.quantityStep || {};
  const stepLabel = quantityStep.stepLabel || STEP_LABEL;
  // Use content API (dashboard-driven) so dashboard updates reflect in app dropdowns
  const mineralTypeOptions =
    (Array.isArray(mineral?.mineralTypes) && mineral.mineralTypes.length > 0
      ? mineral.mineralTypes
      : quantityStep.mineralTypeOptions) || MINERAL_TYPE_OPTIONS;
  const buyerCategoryOptions =
    (Array.isArray(mineral?.institutionalBuyerCategories) && mineral.institutionalBuyerCategories.length > 0
      ? mineral.institutionalBuyerCategories
      : quantityStep.buyerCategoryOptions) || BUYER_CATEGORY_OPTIONS;

  // Sync selection to loaded options so dashboard-driven list is always reflected
  useEffect(() => {
    if (mineralTypeOptions.length > 0 && !mineralTypeOptions.includes(mineralType)) {
      setMineralType(mineralTypeOptions[0]);
    }
  }, [mineralTypeOptions, mineralType]);
  useEffect(() => {
    if (buyerCategoryOptions.length > 0 && !buyerCategoryOptions.includes(buyerCategory)) {
      setBuyerCategory(buyerCategoryOptions[0]);
    }
  }, [buyerCategoryOptions, buyerCategory]);

  // Auto-save so reload/refresh restores entered data
  useDebouncedFormDraft(
    'buyQuantity',
    { quantity, unit, mineralType, buyerCategory, otherBuyerCategoryInput },
    { deps: [quantity, unit, mineralType, buyerCategory, otherBuyerCategoryInput] }
  );

  const mineralKey =
    mineral?.id != null
      ? String(mineral.id)
      : mineral?._id != null
        ? String(mineral._id)
        : mineralParam?.id != null
          ? String(mineralParam.id)
          : mineralParam?._id != null
            ? String(mineralParam._id)
            : '';

  // Per-mineral units from dashboard (e.g. Gold: g, ct, kg). When limited availability is set, only that unit.
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
      raw = quantityStep.unitOptions || UNIT_OPTIONS;
    }
    return orderUnitOptionsPrimaryFirst(mineral, raw);
  }, [mineral, quantityStep.unitOptions]);

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
  const presetQuantities = quantityStep.presetQuantities || PRESET_QUANTITIES;
  const defaultStock = quantityStep.defaultStock || DEFAULT_STOCK;
  const inStockInfo = useMemo(
    () => getInStockLabelForQuantityStep(mineral, defaultStock, unit),
    [mineral, defaultStock, unit]
  );
  const listedQtyLine = useMemo(() => getAvailableQuantityHeroLine(mineral), [mineral]);

  const increment = () => setQuantity((q) => Math.min(9999, q + 1));
  const decrement = () => setQuantity((q) => Math.max(0, q - 1));
  const setPreset = (val) => setQuantity(val);

  const onConfirm = () => {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert('Quantity required', 'Please enter a quantity greater than 0.');
      return;
    }
    const cap = getBuyMaxQuantityAndUnit(mineral);

    if (cap.source === 'limited' && cap.max != null && cap.capUnit) {
      if (unit !== cap.capUnit) {
        Alert.alert(
          'Wrong unit',
          `This mineral is only sold in ${cap.capUnit}. Please select ${cap.capUnit} in the unit dropdown.`
        );
        return;
      }
      if (quantity > cap.max) {
        Alert.alert(
          'Quantity not available',
          `Only ${cap.max} ${cap.capUnit} is available for this mineral. You asked for ${quantity} ${unit}. Please enter ${cap.max} ${cap.capUnit} or less.`
        );
        return;
      }
    } else if (cap.source === 'catalog' && cap.max != null && cap.capUnit) {
      if (unit !== cap.capUnit) {
        Alert.alert(
          'Wrong unit',
          `Available quantity is set in ${cap.capUnit}. Please select ${cap.capUnit} to order (up to ${cap.max} ${cap.capUnit}).`
        );
        return;
      }
      if (quantity > cap.max) {
        Alert.alert(
          'Quantity not available',
          `Only ${cap.max} ${cap.capUnit} is available for this listing. You entered ${quantity} ${unit}. Please enter ${cap.max} ${cap.capUnit} or less.`
        );
        return;
      }
    }

    // Enforce dashboard Min Allocation when present (minimum order size)
    const minRaw = mineral?.minAllocation;
    const minAlloc =
      typeof minRaw === 'number' && !Number.isNaN(minRaw)
        ? minRaw
        : parseFloat(String(minRaw ?? ''));
    const minAllocUnit = mineral?.minAllocationUnit && String(mineral.minAllocationUnit).trim();
    if (minAlloc != null && !Number.isNaN(minAlloc) && Number.isFinite(minAlloc) && minAlloc > 0) {
      if (minAllocUnit && minAllocUnit !== unit) {
        Alert.alert(
          'Minimum allocation',
          `Minimum order is ${minAlloc} ${minAllocUnit}. Please select ${minAllocUnit} and adjust the quantity.`
        );
        return;
      }
      if (quantity < minAlloc) {
        Alert.alert('Minimum allocation', `Minimum order for this mineral is ${minAlloc} ${unit}.`);
        return;
      }
    }
    saveFormDraft('buyQuantity', {
      quantity,
      unit,
      mineralType,
      buyerCategory,
      otherBuyerCategoryInput,
    }).catch(() => {});
    navigation.navigate('Delivery', {
      mineral,
      quantity: String(quantity),
      unit,
      mineralType,
      buyerCategory,
    });
  };

  const closeDropdown = () => setOpenDropdown(null);

  return (
    <View style={styles.page}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header – light blue bg, rounded bottom; back = light blue chevron; white circle + lightning; progress + step text */}
        <View style={[styles.header, { width: contentWidth, alignSelf: 'center' }]}>
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.backBtnHover,
              ]}
              onPress={() => navigation.goBack()}
            >
              {({ pressed }) => (
                <Icon
                  name="chevronLeft"
                  size={24}
                  color={pressed ? '#1F2A44' : '#51A2FF'}
                />
              )}
            </Pressable>
            <View style={styles.headerTitleBlock}>
              <View style={styles.lightningBox}>
                <Icon name="lightning" size={20} color="#1F2A44" />
              </View>
              <Text style={styles.headerTitle}>Quantity Selection</Text>
            </View>
          </View>
          <View style={styles.progressBlock}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${PROGRESS_FRACTION * 100}%` }]} />
            </View>
            <Text style={styles.stepText}>{stepLabel}</Text>
          </View>
        </View>

        {/* Content card */}
        <View style={[styles.card, { width: contentWidth - 24, alignSelf: 'center' }]}>
          {/* Product row */}
          <View style={styles.productRow}>
            <View style={styles.thumbWrap}>
              {(mineral?.imageUrl || mineral?.image) ? (
                <Image
                  source={{ uri: String(mineral.imageUrl || mineral.image) }}
                  style={styles.thumb}
                  resizeMode="cover"
                  onLoad={() => console.log('IMG_LOADED', mineral?.imageUrl || mineral?.image)}
                  onError={(e) => console.log('IMG_ERROR', e?.nativeEvent, mineral?.imageUrl || mineral?.image)}
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>
                {(mineral?.name || 'Mineral').replace(/\bPRECIOUS METAL\b/gi, '').trim() || 'Mineral'}
              </Text>
              {listedQtyLine ? (
                <Text style={styles.productAvailLine}>
                  <Text style={styles.productAvailLabel}>{listedQtyLine.title}: </Text>
                  <Text style={styles.productAvailValue}>{listedQtyLine.value}</Text>
                </Text>
              ) : (
                <Text style={styles.productMetaSecondary}>{formatAvailability(mineral)}</Text>
              )}
            </View>
          </View>

          {/* Mineral type dropdown – 2nd image data */}
          <DropdownSelect
            label="MINERAL TYPE"
            value={mineralType}
            options={mineralTypeOptions}
            open={openDropdown === 'mineralType'}
            onToggle={() => setOpenDropdown(openDropdown === 'mineralType' ? null : 'mineralType')}
            onSelect={(v) => { setMineralType(v); closeDropdown(); }}
          />

          {/* Institutional buyer category – 3rd image data */}
          <DropdownSelect
            label="INSTITUTIONAL BUYER CATEGORY"
            value={buyerCategory}
            options={buyerCategoryOptions}
            open={openDropdown === 'buyerCategory'}
            onToggle={() => setOpenDropdown(openDropdown === 'buyerCategory' ? null : 'buyerCategory')}
            onSelect={(v) => { setBuyerCategory(v); closeDropdown(); }}
          />
          {buyerCategory === 'Others' && (
            <View style={styles.otherBuyerCategoryRow}>
              <TextInput
                style={styles.otherBuyerCategoryInput}
                placeholder="Enter institutional buyer category"
                placeholderTextColor="#94A3B8"
                value={otherBuyerCategoryInput}
                onChangeText={setOtherBuyerCategoryInput}
                editable={!addingBuyerCategory}
              />
              <Pressable
                style={[styles.addBuyerCategoryBtn, addingBuyerCategory && styles.addBuyerCategoryBtnDisabled]}
                onPress={async () => {
                  const trimmed = otherBuyerCategoryInput.trim();
                  if (!trimmed) {
                    Alert.alert('Required', 'Please enter a category name.');
                    return;
                  }
                  setAddingBuyerCategory(true);
                  try {
                    const updated = await addBuyerCategory(trimmed);
                    setBuyContent(updated);
                    setBuyerCategory(trimmed);
                    setOtherBuyerCategoryInput('');
                  } catch (e) {
                    Alert.alert('Error', e.message || 'Failed to add category.');
                  } finally {
                    setAddingBuyerCategory(false);
                  }
                }}
                disabled={addingBuyerCategory}
              >
                {addingBuyerCategory ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addBuyerCategoryBtnText}>Add</Text>
                )}
              </Pressable>
            </View>
          )}

          {/* SELECT QUANTITY – 4th image: unit dropdown g/kg/t, presets 5kg 10kg 25 */}
          <View style={styles.quantitySection}>
            <View style={styles.quantityHeader}>
              <Text style={styles.fieldLabel}>SELECT QUANTITY</Text>
              <Pressable>
                {({ pressed }) => (
                  <Text style={[styles.inStock, pressed && { color: HOVER_BLUE }]}>
                    In Stock: {inStockInfo.text}
                  </Text>
                )}
              </Pressable>
            </View>
            <View style={styles.quantityRow}>
              <TouchableOpacity style={styles.quantityBtn} onPress={decrement} activeOpacity={0.7}>
                <Text style={styles.quantityBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.quantityCenter}>
                <TextInput
                  style={[styles.quantityValueInput, isCompactHeight && { fontSize: 44 }]}
                  value={String(quantity)}
                  keyboardType="numeric"
                  inputMode="numeric"
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    if (!cleaned) {
                      setQuantity(0);
                      return;
                    }
                    const next = Math.min(9999, parseInt(cleaned, 10) || 0);
                    setQuantity(next);
                  }}
                  maxLength={4}
                />
                <View style={styles.unitChipWrap}>
                  <Pressable
                    style={({ pressed }) => [styles.unitChip, pressed && styles.unitChipPressed]}
                    onPress={() => setOpenDropdown(openDropdown === 'unit' ? null : 'unit')}
                  >
                    {({ pressed }) => (
                      <>
                        <Text style={[styles.unitText, pressed && { color: HOVER_BLUE }]}>{unit}</Text>
                        <Icon name="chevronDown" size={14} color={pressed ? HOVER_BLUE : '#2563EB'} />
                      </>
                    )}
                  </Pressable>
                  {openDropdown === 'unit' && (
                    <View style={styles.unitDropdownList}>
                      {unitOptions.map((u) => (
                        <Pressable
                          key={u}
                          style={[styles.unitOption, u === unit && styles.dropdownOptionSelected]}
                          onPress={() => { setUnit(u); closeDropdown(); }}
                        >
                          {({ pressed }) => (
                            <>
                              <Text style={[styles.dropdownOptionText, u === unit && styles.dropdownOptionTextSelected, pressed && { color: HOVER_BLUE }]}>{u}</Text>
                              {u === unit && <Icon name="check" size={18} color="#1F2A44" />}
                            </>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.quantityBtn} onPress={increment} activeOpacity={0.7}>
                <Text style={styles.quantityBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.presetRow}>
              {presetQuantities.map((val) => (
                <Pressable
                  key={val}
                  style={[styles.presetBtn, quantity === val && styles.presetBtnActive]}
                  onPress={() => setPreset(val)}
                >
                  <Text style={[styles.presetBtnText, quantity === val && styles.presetBtnTextActive]}>{val}{unit}</Text>
                  {quantity === val && <Icon name="lightning" size={14} color="#fff" style={styles.presetIcon} />}
                </Pressable>
              ))}
            </View>
          </View>

     {/*    <View style={styles.escrowRow}>
            <Icon name="wallet" size={20} color="#6B7280" />
          </View> */}
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Footer button – hover blue */}
      <View style={[styles.footer, { width: contentWidth, alignSelf: 'center', paddingBottom: Math.max(20, isCompactHeight ? 24 : 28) }]}>
        <Pressable
          style={({ pressed }) => [styles.button, { width: contentWidth - 32, alignSelf: 'center' }, pressed && styles.buttonHover]}
          onPress={onConfirm}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 140 },
  // Header – CSS from user
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
  backBtnHover: {
    backgroundColor: 'rgba(81, 162, 255, 0.25)',
  },
  headerTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  lightningBox: {
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
    backgroundColor: '#2B7FFF',
    borderRadius: 99999,
  },
  stepText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#51A2FF',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  productRow: { flexDirection: 'row', marginBottom: 20 },
  thumbWrap: { width: 88, height: 88, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { backgroundColor: '#E2E8F0' },
  productInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  productName: { fontSize: 18, fontWeight: '700', color: '#1F2A44', marginBottom: 4 },
  productMetaSecondary: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  productAvailLine: { fontSize: 12, color: '#0F172A', marginBottom: 2, flexWrap: 'wrap' },
  productAvailLabel: { fontWeight: '600', color: '#475569' },
  productAvailValue: { fontWeight: '700', color: '#059669' },
  productCategory: { fontSize: 11, fontWeight: '600', color: '#64748B', letterSpacing: 0.5 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#475569', letterSpacing: 0.5, marginBottom: 6 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownPressed: { borderColor: '#51A2FF' },
  dropdownText: { fontSize: 15, fontWeight: '700', color: '#1F2A44', flex: 1 },
  dropdownList: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
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
  dropdownOptionText: { fontSize: 15, color: '#1F2A44', flex: 1 },
  dropdownOptionTextSelected: { fontWeight: '600' },
  otherBuyerCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  otherBuyerCategoryInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1F2A44',
    backgroundColor: '#FFFFFF',
  },
  addBuyerCategoryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBuyerCategoryBtnDisabled: { opacity: 0.7 },
  addBuyerCategoryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  quantitySection: { marginTop: 8, marginBottom: 20 },
  quantityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  inStock: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quantityBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  quantityBtnText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  quantityCenter: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, gap: 8 },
  quantityValueInput: {
    fontSize: 58,
    fontWeight: '700',
    color: '#1F2A44',
    minWidth: 80,
    textAlign: 'center',
    paddingVertical: 0,
  },
  unitChipWrap: { position: 'relative' },
  unitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderRadius: 8,
    gap: 4,
  },
  unitChipPressed: { borderWidth: 1, borderColor: '#51A2FF' },
  unitText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  unitDropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    minWidth: 72,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 10,
  },
  unitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 10, marginTop: 2, justifyContent: 'space-between', alignItems: 'center' },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 4,
  },
  presetBtnActive: { backgroundColor: '#1F2A44' },
  presetBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  presetBtnTextActive: { color: '#FFFFFF' },
  presetIcon: {},
  lockPolicyCard: {
    marginTop: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  lockPolicyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  lockPolicyTitle: { fontSize: 15, fontWeight: '700', color: '#1E3A8A' },
  lockPolicyText: { fontSize: 13, lineHeight: 20, color: '#475569' },
  escrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 4,
  },
  escrowText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },
  footerSpacer: { height: 100 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
  },
  button: {
    backgroundColor: '#1F2A44',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  buttonHover: { borderColor: HOVER_BLUE },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
