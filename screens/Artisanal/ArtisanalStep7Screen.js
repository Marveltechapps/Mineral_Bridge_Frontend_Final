import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Icon } from '../../lib/icons';
import { fetchWithAuth } from '../../lib/api';
import { colors } from '../../lib/theme';
import { navigationRef } from '../../navigation/navigationRef';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const CARD_MARGIN_TOP = WINDOW_HEIGHT * 0.1;
const SUBTITLE_MARGIN_TOP = WINDOW_HEIGHT * 0.02;
const PROFILE_READY_MARGIN_UP = WINDOW_HEIGHT * 0.05;
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);
const STEP_NUM = 6;
const TOTAL_STEPS = 6;
const STEP_LABEL = `STEP ${STEP_NUM} OF ${TOTAL_STEPS}`;
const PROGRESS_FRACTION = 1;
const DROPDOWN_BLUE = '#51A2FF';
const PROGRESS_BLUE = '#2B7FFF';

export default function ArtisanalStep7Screen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 420);
  const params = route.params || {};
  const [submitting, setSubmitting] = useState(false);

  const submitPayload = {
    minerType: params.minerType,
    country: params.country,
    countryCode: params.countryCode,
    district: params.district,
    region: params.stateProvince,
    village: params.village,
    gps: params.gps,
    miningAreaType: params.miningAreaType,
    mineralType: params.mineralType,
    operationQuantity: params.operationQuantity,
    operationQuantityUnit: params.operationQuantityUnit,
    miningMethod: params.miningMethod,
    yearsExperience: params.yearsExperience,
    numberOfWorkers: params.numberOfWorkers,
    estimatedMonthlyOutput: params.estimatedMonthlyOutput,
    outputUnit: params.outputUnit,
    equipment: params.equipment || [],
    licenseUri: params.licenseUri,
    licenseUrl: params.licenseUrl,
    licenseName: params.licenseName,
    childLaborProhibition: params.childLaborProhibition,
    ethicalAnswers: params.ethicalAnswers || {},
    laborPledge: params.laborPledge,
    status: 'submitted',
  };

  const onGoToDashboard = async () => {
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/artisanal/profile', {
        method: 'POST',
        body: JSON.stringify(submitPayload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save profile');
      }
      if (navigationRef.isReady()) {
        navigationRef.navigate('ArtisanalDashboard');
      } else {
        const rootNav = navigation.getParent()?.getParent?.();
        if (rootNav) rootNav.navigate('ArtisanalDashboard');
        else navigation.reset({ index: 0, routes: [{ name: 'ArtisanalDashboard' }] });
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.page, styles.successPage]}>
      <View style={[styles.header, { width: contentWidth, alignSelf: 'center' }]}>
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
        contentContainerStyle={[styles.readyScrollContent, { width: contentWidth, alignSelf: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.blueCard}>
          <View style={styles.iconRingOnly}>
            <Icon name="check" size={52} color={colors.successGreen} style={{ transform: [{ scaleX: 1.25 }, { scaleY: 1.15 }] }} />
          </View>
          <View style={styles.licensedBadge}>
            <Icon name="shieldCheck" size={14} color="#51A2FF" />
            <Text style={styles.licensedBadgeText}>READY TO SUBMIT</Text>
          </View>
          <Text style={styles.successTitle}>Profile Ready</Text>
          <Text style={styles.successSubtitle}>Profile complete. You can now trade through verified channels.</Text>
        </View>
        <View style={styles.footerSpacer} />
      </ScrollView>

      <View style={[styles.footer, { width: contentWidth, alignSelf: 'center' }]}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            styles.fullWidthBtn,
            pressed && styles.primaryBtnPressed,
            submitting && styles.submitBtnDisabled,
          ]}
          onPress={onGoToDashboard}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Open Artisanal Dashboard</Text>
              <Icon name="chevronRight" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  successPage: { backgroundColor: '#F8FAFC' },
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
  readyScrollContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
  },
  section: { marginBottom: 16 },
  readyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
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
    gap: 12,
  },
  fullWidthBtn: {
    width: '100%',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1F2A44',
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitBtnPressed: { opacity: 0.9 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  successScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 22,
  },
  successContent: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  blueCard: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: CARD_MARGIN_TOP,
  },
  iconRingOnly: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 5,
    borderColor: colors.successGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'visible',
  },
  iconOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.successGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: colors.successGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  licensedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: CARD_MARGIN_TOP,
  },
  licensedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#64748B',
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    textAlign: 'center',
    color: '#101828',
    marginTop: -PROFILE_READY_MARGIN_UP,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: SUBTITLE_MARGIN_TOP,
  },
  successParagraph: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
    color: '#6B7280',
    maxWidth: '90%',
  },
  successList: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  successListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  successListIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.successGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successListText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2A44',
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    gap: 10.5,
    marginTop: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    width: '100%',
    height: 49,
    backgroundColor: '#1F2A44',
    borderRadius: 14.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    width: '100%',
    height: 49,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnPressed: { opacity: 0.9 },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    color: '#1C1C1C',
  },
});
