import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateChildLaborAccepted } from '../../lib/artisanalValidations';
import { pickDocumentStable } from '../../lib/stablePicker';
import { File as ExpoFile } from 'expo-file-system';
import { Icon } from '../../lib/icons';

function uint8ToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);
const STEP_NUM = 5;
const TOTAL_STEPS = 6;
const STEP_LABEL = `STEP ${STEP_NUM} OF ${TOTAL_STEPS}: COMPLIANCE CHECK`;
const PROGRESS_FRACTION = STEP_NUM / TOTAL_STEPS;
const DROPDOWN_BLUE = '#51A2FF';
const PROGRESS_BLUE = '#2B7FFF';
const GREEN_ACCENT = '#50C878';
const GREEN_BG = '#E6F8ED';
const RED_ACCENT = '#FF4500';
const RED_BG = '#FBEBEB';
const ARTISANAL_STEP5_LICENSE_KEY = 'artisanal_step5_license';

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

export default function ArtisanalStep5Screen({ route, navigation }) {
  const prev = route.params || {};
  const [childLaborAccepted, setChildLaborAccepted] = useState(false);
  const [licenseFile, setLicenseFile] = useState(null);
  const [answers, setAnswers] = useState({});
  const [laborPledge, setLaborPledge] = useState(false);

  const setAnswer = (id, value) => {
    setAnswers((a) => ({ ...a, [id]: value }));
  };

  const allAnswered = ETHICAL_QUESTIONS.every((q) => answers[q.id] === 'yes' || answers[q.id] === 'no');
  const canContinue = childLaborAccepted && allAnswered && laborPledge;

  const onContinue = () => {
    const childLabor = validateChildLaborAccepted(childLaborAccepted);
    if (!childLabor.valid) {
      Alert.alert('Required', childLabor.message, [{ text: 'OK' }]);
      return;
    }
    if (!allAnswered) {
      Alert.alert('Required', 'Please answer all ethical verification questions.', [{ text: 'OK' }]);
      return;
    }
    if (!laborPledge) {
      Alert.alert('Required', 'Please accept the Additional Labor Pledge to continue.', [{ text: 'OK' }]);
      return;
    }
    AsyncStorage.removeItem(ARTISANAL_STEP5_LICENSE_KEY).catch(() => {});
    navigation.navigate('ArtisanalStep7', {
      ...prev,
      childLaborProhibition: childLaborAccepted,
      licenseUri: licenseFile?.dataUrl || licenseFile?.uri,
      licenseName: licenseFile?.name,
      ethicalAnswers: answers,
      laborPledge,
    });
  };

  const [uploading, setUploading] = useState(false);
  const isMounted = useRef(true);

  const onUploadLicense = () => {
    setUploading(true);
    pickDocumentStable(
      { type: ['image/*', 'application/pdf'], maxBytes: 5 * 1024 * 1024 },
      async (file) => {
        if (!isMounted.current) return;
        try {
          const expoFile = new ExpoFile(file.uri);
          const bytes = await expoFile.bytes();
          if (!isMounted.current) return;
          const base64 = uint8ToBase64(bytes);
          const mime = file.mimeType || (file.name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
          const dataUrl = `data:${mime};base64,${base64}`;
          const data = { uri: file.uri, name: file.name, dataUrl };
          InteractionManager.runAfterInteractions(() => {
            if (!isMounted.current) { setUploading(false); return; }
            setLicenseFile(data);
            AsyncStorage.setItem(ARTISANAL_STEP5_LICENSE_KEY, JSON.stringify({ uri: file.uri, name: file.name })).catch(() => {});
            setUploading(false);
          });
        } catch (err) {
          if (isMounted.current) Alert.alert('Upload error', err.message || 'Could not process document.');
          if (isMounted.current) setUploading(false);
        }
      },
      (msg) => {
        if (isMounted.current) {
          Alert.alert(msg === 'File too large' ? 'File too large' : 'Upload error', msg === 'File too large' ? 'Please choose a file under 5MB.' : msg || 'Could not pick document.');
        }
        setUploading(false);
      },
      () => { if (isMounted.current) setUploading(false); }
    );
  };

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ARTISANAL_STEP5_LICENSE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const data = JSON.parse(raw);
          if (data?.uri) setLicenseFile({ uri: data.uri, name: data.name });
        } catch (_) {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
          <Text style={styles.sectionTitle}>Compliance & Trust</Text>
          <Text style={styles.sectionSubtitle}>INSTITUTIONAL VERIFICATION REQUIREMENTS</Text>

          <Pressable
            style={[styles.licenseCard, licenseFile && styles.licenseCardFilled, uploading && styles.licenseCardDisabled]}
            onPress={onUploadLicense}
            disabled={uploading}
          >
            <View style={styles.licenseIconWrap}>
              <Icon name="document" size={24} color={DROPDOWN_BLUE} />
            </View>
            <View style={styles.licenseTextWrap}>
              <Text style={styles.licenseTitle}>MINING LICENSE (Optional)</Text>
              <Text style={styles.licenseSubtitle} numberOfLines={2}>
                {uploading
                  ? 'Processing document…'
                  : (licenseFile
                    ? licenseFile.name
                    : 'upload a photo or PDF of your license')}
              </Text>
            </View>
            <View style={styles.uploadIconWrap}>
              {uploading ? (
                <ActivityIndicator size="small" color={DROPDOWN_BLUE} />
              ) : (
                <Icon name="upload" size={22} color={DROPDOWN_BLUE} />
              )}
            </View>
          </Pressable>

          <Pressable
            style={[styles.childLaborCard, childLaborAccepted && styles.childLaborCardSelected]}
            onPress={() => setChildLaborAccepted(!childLaborAccepted)}
          >
            <View style={styles.childLaborIconWrap}>
              <Icon name="warning" size={22} color={DROPDOWN_BLUE} />
            </View>
            <View style={styles.childLaborContent}>
              <Text style={styles.childLaborTitle}>CHILD LABOR PROHIBITION</Text>
              <Text style={styles.childLaborDeclaration}>
                I declare that NO MINORS are employed at this site.
              </Text>
            </View>
            <View style={[styles.radioOuter, childLaborAccepted && styles.radioOuterSelected]}>
              {childLaborAccepted ? <View style={styles.radioInner} /> : null}
            </View>
          </Pressable>

          <Text style={[styles.sectionTitle, styles.ethicalSectionTitle]}>Ethical Verification</Text>
          <Text style={[styles.sectionSubtitle, styles.ethicalSectionSubtitle]}>
            MANDATORY SAFETY AND HUMAN RIGHTS COMPLIANCE AUDIT
          </Text>

          {ETHICAL_QUESTIONS.map((q) => (
            <View key={q.id} style={styles.questionCard}>
              <Text style={styles.questionText}>{q.text}</Text>
              <View style={styles.optionsRow}>
                <Pressable
                  style={[styles.optionCard, answers[q.id] === 'yes' && styles.optionYesSelected]}
                  onPress={() => setAnswer(q.id, 'yes')}
                >
                  <View style={[styles.optionIconWrap, answers[q.id] === 'yes' && styles.optionIconWrapYes]}>
                    <Icon name="check" size={12} color={answers[q.id] === 'yes' ? '#FFFFFF' : '#64748B'} />
                  </View>
                  <Text style={[styles.optionText, answers[q.id] === 'yes' && styles.optionTextSelectedYes]}>
                    YES
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.optionCard, answers[q.id] === 'no' && styles.optionNoSelected]}
                  onPress={() => setAnswer(q.id, 'no')}
                >
                  <View style={[styles.optionIconWrap, answers[q.id] === 'no' && styles.optionIconWrapNo]}>
                    <Icon name="close" size={12} color={answers[q.id] === 'no' ? '#FFFFFF' : '#64748B'} />
                  </View>
                  <Text style={[styles.optionText, answers[q.id] === 'no' && styles.optionTextSelectedNo]}>
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
          <Text style={styles.continueBtnText}>Verify & Continue</Text>
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
  sectionSubtitle: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 20 },
  licenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  licenseIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(81, 162, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  licenseTextWrap: { flex: 1 },
  licenseTitle: { fontSize: 12, fontWeight: '700', color: '#1F2A44', letterSpacing: 0.5 },
  licenseSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  uploadIconWrap: { padding: 4 },
  licenseCardFilled: { borderColor: DROPDOWN_BLUE, backgroundColor: '#EFF6FF' },
  licenseCardDisabled: { opacity: 0.7 },
  childLaborCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
  },
  childLaborCardSelected: {
    borderColor: DROPDOWN_BLUE,
    backgroundColor: '#EFF6FF',
  },
  childLaborIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(81, 162, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  childLaborContent: { flex: 1 },
  childLaborTitle: { fontSize: 12, fontWeight: '700', color: '#1F2A44', letterSpacing: 0.5 },
  childLaborDeclaration: { fontSize: 11, color: '#64748B', marginTop: 4 },
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
  ethicalSectionTitle: { marginTop: 28 },
  ethicalSectionSubtitle: { marginBottom: 16 },
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
