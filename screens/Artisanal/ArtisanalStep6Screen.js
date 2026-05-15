import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { Icon } from '../../lib/icons';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);
const STEP_NUM = 6;
const TOTAL_STEPS = 7;
const STEP_LABEL = `STEP ${STEP_NUM} OF ${TOTAL_STEPS}: ETHICAL AUDIT`;
const PROGRESS_FRACTION = STEP_NUM / TOTAL_STEPS;
const DROPDOWN_BLUE = '#51A2FF';
const PROGRESS_BLUE = '#2B7FFF';
const GREEN_ACCENT = '#50C878';
const GREEN_BG = '#E6F8ED';
const RED_ACCENT = '#FF4500';
const RED_BG = '#FBEBEB';

const ETHICAL_QUESTIONS = [
  { id: 'minors', text: 'No minors under legal age (18) are employed at this mine.' },
  { id: 'forcedLabor', text: 'No forced or compulsory labor is used in mining operations.' },
  { id: 'safeConditions', text: 'All workers have safe working conditions (PPE, ventilation, no hazards).' },
  { id: 'environmental', text: 'Environmental protections are followed (no illegal dumping).' },
  { id: 'licenses', text: 'Mining is conducted with valid licenses and permits.' },
  { id: 'childLabor', text: 'No child labor or hazardous work for youth under 18.' },
  { id: 'legalSource', text: 'Minerals are legally sourced (no conflict zones or smuggling).' },
  { id: 'workersRights', text: "Workers' rights are respected (fair wages, no discrimination)." },
];

export default function ArtisanalStep6Screen({ route, navigation }) {
  const prev = route.params || {};
  const [answers, setAnswers] = useState({});
  const [laborPledge, setLaborPledge] = useState(false);

  const setAnswer = (id, value) => {
    setAnswers((a) => ({ ...a, [id]: value }));
  };

  const allAnswered = ETHICAL_QUESTIONS.every((q) => answers[q.id] === 'yes' || answers[q.id] === 'no');
  const canContinue = allAnswered && laborPledge;

  const onContinue = () => {
    if (!canContinue) return;
    navigation.navigate('ArtisanalStep7', {
      ...prev,
      ethicalAnswers: answers,
      laborPledge,
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ethical Verification</Text>
          <Text style={styles.sectionSubtitle}>MANDATORY SAFETY AND HUMAN RIGHTS COMPLIANCE AUDIT</Text>

          {ETHICAL_QUESTIONS.map((q) => (
            <View key={q.id} style={styles.questionCard}>
              <Text style={styles.questionText}>{q.text}</Text>
              <View style={styles.optionsRow}>
                <Pressable
                  style={[
                    styles.optionCard,
                    answers[q.id] === 'yes' && styles.optionYesSelected,
                  ]}
                  onPress={() => setAnswer(q.id, 'yes')}
                >
                  <View
                    style={[
                      styles.optionIconWrap,
                      answers[q.id] === 'yes' && styles.optionIconWrapYes,
                    ]}
                  >
                    <Icon
                      name="check"
                      size={12}
                      color={answers[q.id] === 'yes' ? '#FFFFFF' : '#64748B'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      answers[q.id] === 'yes' && styles.optionTextSelectedYes,
                    ]}
                  >
                    YES
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.optionCard,
                    answers[q.id] === 'no' && styles.optionNoSelected,
                  ]}
                  onPress={() => setAnswer(q.id, 'no')}
                >
                  <View
                    style={[
                      styles.optionIconWrap,
                      answers[q.id] === 'no' && styles.optionIconWrapNo,
                    ]}
                  >
                    <Icon
                      name="close"
                      size={12}
                      color={answers[q.id] === 'no' ? '#FFFFFF' : '#64748B'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      answers[q.id] === 'no' && styles.optionTextSelectedNo,
                    ]}
                  >
                    NO
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}

          <View style={styles.pledgeSection}>
            <Text style={styles.pledgeTitle}>Additional Labor Pledge</Text>
            <Pressable
              style={({ pressed }) => [
                styles.pledgeCard,
                laborPledge && styles.pledgeCardSelected,
                pressed && styles.pledgeCardPressed,
              ]}
              onPress={() => setLaborPledge(!laborPledge)}
            >
              <View style={[styles.pledgeRadio, laborPledge && styles.pledgeRadioSelected]}>
                {laborPledge ? <View style={styles.pledgeRadioInner} /> : null}
              </View>
              <View style={styles.pledgeContent}>
                <Text style={styles.pledgeText}>
                  I solemnly swear that NO MINORS under legal age are employed at this mine.
                </Text>
                <Text style={styles.pledgeHint}>YES ONLY - REQUIRED FOR LISTING.</Text>
              </View>
            </Pressable>
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
          <Text style={styles.continueBtnText}>Submit Step</Text>
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
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1F2A44', marginBottom: 8 },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2A44',
    marginBottom: 12,
    lineHeight: 20,
  },
  optionsRow: { flexDirection: 'row', gap: 12 },
  optionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  optionIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconWrapYes: { backgroundColor: GREEN_ACCENT },
  optionIconWrapNo: { backgroundColor: RED_ACCENT },
  optionYesSelected: {
    backgroundColor: GREEN_BG,
    borderColor: GREEN_ACCENT,
  },
  optionNoSelected: {
    backgroundColor: RED_BG,
    borderColor: RED_ACCENT,
  },
  optionText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  optionTextSelectedYes: { color: GREEN_ACCENT },
  optionTextSelectedNo: { color: RED_ACCENT },
  pledgeSection: { marginTop: 8, marginBottom: 16 },
  pledgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2A44',
    marginBottom: 12,
  },
  pledgeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
  },
  pledgeCardSelected: {
    borderColor: DROPDOWN_BLUE,
    backgroundColor: '#EFF6FF',
  },
  pledgeCardPressed: {
    backgroundColor: '#DBEAFE',
    borderColor: DROPDOWN_BLUE,
  },
  pledgeRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  pledgeRadioSelected: { borderColor: DROPDOWN_BLUE, backgroundColor: 'transparent' },
  pledgeRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DROPDOWN_BLUE,
  },
  pledgeContent: { flex: 1 },
  pledgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2A44',
    lineHeight: 20,
  },
  pledgeHint: {
    fontSize: 11,
    fontWeight: '600',
    color: DROPDOWN_BLUE,
    marginTop: 4,
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
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
