import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { Icon } from '../../lib/icons';
import { getFormDrafts, saveFormDraft } from '../../lib/services';
import { useDebouncedFormDraft } from '../../lib/useFormDraft';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);
const STEP_NUM = 1;
const TOTAL_STEPS = 6;
const STEP_LABEL = `STEP ${STEP_NUM} OF ${TOTAL_STEPS}: SELECT PROFILE TYPE`;
const PROGRESS_FRACTION = STEP_NUM / TOTAL_STEPS;
const DROPDOWN_BLUE = '#51A2FF';
const PROGRESS_BLUE = '#2B7FFF';

const OPERATION_TYPES = [
  { id: 'individual', label: 'Independent Miner', icon: 'person', subtitle: 'SOLO OPERATOR/SMALL LEASEHOLDER' },
  { id: 'group', label: 'Group Miners', icon: 'people', subtitle: 'GROUP OPERATORS/BIG LEASEHOLDER' },
];

export default function ArtisanalStep1Screen({ navigation }) {
  const [operationType, setOperationType] = useState('individual');

  useEffect(() => {
    getFormDrafts()
      .then((drafts) => {
        if (drafts?.artisanalStep1?.operationType === 'individual' || drafts?.artisanalStep1?.operationType === 'group') {
          setOperationType(drafts.artisanalStep1.operationType);
        }
      })
      .catch(() => {});
  }, []);

  useDebouncedFormDraft('artisanalStep1', { operationType }, { deps: [operationType] });

  const onContinue = () => {
    saveFormDraft('artisanalStep1', { operationType }).catch(() => {});
    navigation.navigate('ArtisanalLocationDetails', { minerType: operationType });
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Operation Type</Text>
          </View>
          <Text style={styles.sectionSubtitle}>SELECT YOUR ORGANIZATIONAL STRUCTURE</Text>

          {OPERATION_TYPES.map((opt) => (
            <Pressable
              key={opt.id}
              style={[styles.optionCard, operationType === opt.id && styles.optionCardSelected]}
              onPress={() => setOperationType(opt.id)}
            >
              <View style={styles.optionIconWrap}>
                <Icon
                  name={opt.icon}
                  size={24}
                  color={operationType === opt.id ? DROPDOWN_BLUE : '#64748B'}
                />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, operationType === opt.id && styles.optionTitleSelected]}>
                  {opt.label}
                </Text>
                {opt.subtitle ? (
                  <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                ) : null}
              </View>
              <View style={[styles.radioOuter, operationType === opt.id && styles.radioOuterSelected]}>
                {operationType === opt.id ? (
                  <View style={styles.radioInner} />
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
        <View style={styles.footerSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={({ pressed }) => [styles.continueBtn, pressed && styles.continueBtnPressed]} onPress={onContinue}>
          <Text style={styles.continueBtnText}>Save & Continue</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  headerTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
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
  progressFill: { height: '100%', backgroundColor: PROGRESS_BLUE, borderRadius: 99999 },
  stepText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: DROPDOWN_BLUE,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  section: { marginBottom: 16 },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1F2A44' },
  sectionSubtitle: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 20 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  optionCardSelected: { borderColor: DROPDOWN_BLUE, borderWidth: 2 },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextWrap: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2A44' },
  optionTitleSelected: { color: '#1F2A44' },
  optionSubtitle: { fontSize: 10.78, fontWeight: '600', color: '#64748B', letterSpacing: 0.5, marginTop: 4 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: DROPDOWN_BLUE, backgroundColor: 'transparent' },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DROPDOWN_BLUE,
  },
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
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
