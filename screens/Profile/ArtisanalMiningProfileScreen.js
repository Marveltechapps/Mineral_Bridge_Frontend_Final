import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth, getApiBase, getToken } from '../../lib/api';
import { getArtisanalCanAccess } from '../../lib/services';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';
const GOLD = '#F2C94C';
const DARK_NAVY = '#1A1F36';
const GREEN = '#00A63E';
const RED = '#B91C1C';

const ETHICAL_QUESTIONS = [
  { id: 'minors', label: 'No minors under legal age (18) employed' },
  { id: 'forcedLabor', label: 'No forced or compulsory labor' },
  { id: 'safeConditions', label: 'Safe working conditions (PPE)' },
  { id: 'environmental', label: 'Environmental protections followed' },
  { id: 'licenses', label: 'Valid licenses and permits' },
  { id: 'childLabor', label: 'No child labor or hazardous work' },
  { id: 'legalSource', label: 'Legally sourced minerals' },
  { id: 'workersRights', label: "Workers' rights respected" },
];

function formatCoord(val) {
  if (val == null) return '—';
  const n = Number(val);
  if (Number.isNaN(n)) return String(val);
  return n.toFixed(4);
}

function FieldRow({ label, value, isLast }) {
  return (
    <View style={[styles.fieldRow, !isLast && styles.fieldRowBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

export default function ArtisanalMiningProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(null);

  useEffect(() => {
    getArtisanalCanAccess()
      .then((r) => setCanAccess(!!(r && r.canAccess)))
      .catch(() => setCanAccess(false));
  }, []);

  useEffect(() => {
    if (canAccess === false) return;
    fetchWithAuth('/api/artisanal/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [canAccess]);

  const onBack = () => navigation.goBack();

  if (canAccess === false) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
              <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
            </Pressable>
            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerTitle}>Artisanal Mining Profile</Text>
            </View>
            <View style={styles.headerRight} />
          </View>
        </View>
        <View style={styles.centered}>
          <Icon name="alertCircle" size={48} color={RED} />
          <Text style={[styles.emptyText, { marginTop: 16 }]}>Not Available</Text>
          <Text style={styles.emptySubtext}>
            Artisanal Mining is only available for users who signed in with an eligible African country number.
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
              <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
            </Pressable>
            <View style={styles.headerTitleBlock}>
              <View style={styles.headerIconWrap}>
                <Icon name="pickaxe" size={20} color={colors.primary} />
              </View>
              <Text style={styles.headerTitle}>ASM PROFILE</Text>
            </View>
            <View style={styles.headerRight} />
          </View>
        </View>
        <View style={styles.centered}>
          <Icon name="pickaxe" size={48} color={colors.textLight} />
          <Text style={styles.emptyText}>No verified artisanal profile found.</Text>
          <Text style={styles.emptySubtext}>Complete mining registration to unlock trusted trade access.</Text>
        </View>
      </View>
    );
  }

  const p = profile;
  const gpsLat = p.gps?.latitude ?? p.gps?.lat;
  const gpsLng = p.gps?.longitude ?? p.gps?.lng;
  const hasGps = gpsLat != null && gpsLng != null;
  const latStr = gpsLat != null ? `${formatCoord(Math.abs(gpsLat))}° ${gpsLat >= 0 ? 'N' : 'S'}` : '—';
  const lngStr = gpsLng != null ? `${formatCoord(Math.abs(gpsLng))}° ${gpsLng >= 0 ? 'E' : 'W'}` : '—';

  const minerTypeLabel = (p.minerType || 'individual').charAt(0).toUpperCase() + (p.minerType || 'individual').slice(1);
  const workersCount = p.workers != null ? Number(p.workers) : null;
  const workersLabel = workersCount != null
    ? (workersCount === 1 ? '1 Person' : `${workersCount} Persons`)
    : '—';
  const yearsCount = p.yearsExperience != null ? Number(p.yearsExperience) : null;
  const experienceLabel = yearsCount != null
    ? (yearsCount === 1 ? '1 Year' : `${yearsCount} Years`)
    : '—';

  const mineralLabel = p.mineralType || '—';
  const opQtyNum = p.operationQuantity != null ? Number(p.operationQuantity) : null;
  const opUnitStr = p.operationQuantityUnit ? String(p.operationQuantityUnit) : '';
  const operationQuantityLabel =
    opQtyNum != null && !Number.isNaN(opQtyNum) && opUnitStr ? `${opQtyNum} ${opUnitStr}` : '—';
  const outputLabel = p.monthlyOutput ? `${p.monthlyOutput} ${p.outputUnit || 'kg'} / Month` : '—';

  const equipmentList = Array.isArray(p.equipment) ? p.equipment : [];
  const ethicalAnswers = p.ethicalAnswers || {};

  const areaTypeMap = { river: 'River', openpit: 'Open Pit', mountain: 'Mountain', underground: 'Underground' };
  const areaTypeLabel = p.miningAreaType ? (areaTypeMap[p.miningAreaType] || p.miningAreaType) : '—';

  const methodMap = { manual: 'Manual', 'semi-mech': 'Semi-Mechanized', mechanized: 'Mechanized' };
  const methodLabel = p.method ? (methodMap[p.method] || p.method) : '—';

  const openLicenseFile = async () => {
    try {
      const base = getApiBase();
      const token = await getToken();
      const tokenQ = token ? `?token=${encodeURIComponent(token)}` : '';
      const url = `${base}/api/artisanal/profile/license${tokenQ}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open', 'Unable to open the license file on this device.');
      }
    } catch {
      Alert.alert('Error', 'Cannot open this file.');
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconWrap}>
              <Icon name="pickaxe" size={20} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>ASM PROFILE</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroSiteName}>{mineralLabel} — {minerTypeLabel}</Text>
          <Text style={styles.heroId}>{p.country || '—'} · {p.district || '—'}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>OPERATION TYPE</Text>
              <Text style={styles.heroStatValue}>{minerTypeLabel}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>WORKFORCE</Text>
              <Text style={styles.heroStatValue}>{workersLabel}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>EXPERIENCE</Text>
              <Text style={styles.heroStatValue}>{experienceLabel}</Text>
            </View>
          </View>
        </View>

        {/* Geographic Traceability */}
        <Text style={styles.sectionTitle}>GEOGRAPHIC TRACEABILITY</Text>
        <View style={styles.sectionCard}>
          {hasGps && (
            <View style={styles.coordRow}>
              <View style={styles.coordLeft}>
                <Icon name="location" size={20} color={DROPDOWN_BLUE} />
                <View style={styles.coordTextWrap}>
                  <Text style={styles.coordLabel}>COORDINATES</Text>
                  <Text style={styles.coordValue}>{latStr}, {lngStr}</Text>
                </View>
              </View>
              <View style={styles.anchoredBadge}>
                <Text style={styles.anchoredText}>ANCHORED</Text>
              </View>
            </View>
          )}
          <FieldRow label="Country" value={p.country} />
          <FieldRow label="Region / State" value={p.region} />
          <FieldRow label="District" value={p.district} />
          <FieldRow label="Village / Town" value={p.village} />
          <FieldRow label="Mining Area Type" value={areaTypeLabel} isLast />
        </View>

        {/* Operational Details */}
        <Text style={styles.sectionTitle}>OPERATIONAL DETAILS</Text>
        <View style={styles.sectionCard}>
          <FieldRow label="Mineral Name" value={mineralLabel} />
          <FieldRow label="Quantity" value={operationQuantityLabel} />
          <FieldRow label="Mining Method" value={methodLabel} />
          <FieldRow label="Years of Experience" value={experienceLabel} />
          <FieldRow label="Number of Workers" value={workersLabel} isLast />
        </View>

        {/* Production Capacity */}
        <Text style={styles.sectionTitle}>PRODUCTION CAPACITY</Text>
        <View style={styles.sectionCard}>
          <FieldRow label="Primary Mineral" value={mineralLabel} />
          <FieldRow label="Monthly Output" value={outputLabel} />
          <FieldRow
            label="Equipment"
            value={equipmentList.length > 0 ? equipmentList.map((e) => String(e).charAt(0).toUpperCase() + String(e).slice(1)).join(', ') : 'None'}
            isLast
          />
        </View>

        {/* Regulatory & Compliance */}
        <Text style={styles.sectionTitle}>REGULATORY & COMPLIANCE</Text>
        <View style={styles.sectionCard}>
          {p.licenseName && (
            <TouchableOpacity
              style={[styles.fieldRow, styles.fieldRowBorder]}
              onPress={openLicenseFile}
              activeOpacity={0.6}
            >
              <Text style={styles.fieldLabel}>Mining License File</Text>
              <View style={styles.licenseFileRow}>
                <Icon name="document" size={16} color={DROPDOWN_BLUE} />
                <Text style={styles.licenseFileText} numberOfLines={1}>{p.licenseName}</Text>
                <Icon name="openOutline" size={14} color={DROPDOWN_BLUE} />
              </View>
            </TouchableOpacity>
          )}
          <FieldRow label="Child Labor" value={p.childLaborFree ? 'Accepted' : 'Not Accepted'} />
          <FieldRow label="Labor Pledge" value={p.laborPledgeSigned ? 'Signed' : 'Not Signed'} />
          <FieldRow label="Status" value={p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Draft'} isLast />
        </View>

        {/* Ethical Verification */}
        <Text style={styles.sectionTitle}>ETHICAL VERIFICATION</Text>
        <View style={styles.sectionCard}>
          {ETHICAL_QUESTIONS.map((q, idx) => {
            const answer = ethicalAnswers[q.id];
            const isYes = answer === 'yes' || answer === true;
            const isNo = answer === 'no' || answer === false;
            const answered = isYes || isNo;
            const isLast = idx === ETHICAL_QUESTIONS.length - 1;
            return (
              <View key={q.id} style={[styles.fieldRow, !isLast && styles.fieldRowBorder]}>
                <Text style={styles.ethicalText}>{q.label}</Text>
                <View style={styles.complianceBadge}>
                  <View style={[
                    styles.ethicalDot,
                    answered && (isYes ? styles.ethicalDotGreen : styles.ethicalDotRed),
                  ]} />
                  <Text style={[
                    styles.ethicalAnswer,
                    answered && { color: isYes ? GREEN : RED },
                  ]}>
                    {isYes ? 'Yes' : isNo ? 'No' : '—'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
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
  headerTitleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  headerRight: { width: 44 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.primary, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: 4 },

  heroCard: {
    backgroundColor: DARK_NAVY,
    borderRadius: 18,
    padding: 22,
    marginBottom: 28,
  },
  heroSiteName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  heroId: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 22 },
  heroStats: { flexDirection: 'row', gap: 10 },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  heroStatLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' },
  heroStatValue: { fontSize: 13, fontWeight: '800', color: GOLD, textAlign: 'center' },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  fieldRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    flex: 1,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '55%',
  },

  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  coordLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  coordTextWrap: { marginLeft: 12 },
  coordLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  coordValue: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 3 },
  anchoredBadge: {
    backgroundColor: '#DBEAFE',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  anchoredText: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },

  licenseFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    maxWidth: '60%',
  },
  licenseFileText: {
    fontSize: 14,
    fontWeight: '600',
    color: DROPDOWN_BLUE,
    flexShrink: 1,
  },

  complianceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  ethicalText: { flex: 1, fontSize: 13, color: colors.primary, fontWeight: '500' },
  ethicalDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.textLight },
  ethicalDotGreen: { backgroundColor: GREEN },
  ethicalDotRed: { backgroundColor: RED },
  ethicalAnswer: { fontSize: 13, fontWeight: '700', color: colors.textLight },
});
