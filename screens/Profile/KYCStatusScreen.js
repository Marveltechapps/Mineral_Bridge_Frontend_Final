import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const SUBMITTED_TOP_MARGIN = Math.round(WINDOW_HEIGHT * 0.03);
const DROPDOWN_BLUE = '#51A2FF';

const DOCUMENTS = [
  { id: 'national-id', label: 'National ID', icon: 'idCard', screen: 'NationalIdDetail' },
  { id: 'passport', label: 'Passport', icon: 'document', screen: 'NationalIdDetail' },
  { id: 'driving-license', label: 'Driving license', icon: 'truck', screen: 'NationalIdDetail' },
];

export default function KYCStatusScreen({ navigation }) {
  const [documents, setDocuments] = useState([]);
  const [kycStatus, setKycStatus] = useState('pending');
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/kyc/status');
      if (!res.ok) throw new Error('Failed to fetch KYC status');
      const data = await res.json();
      setDocuments(data.documents || []);
      setKycStatus(data.kycStatus || 'pending');
    } catch {
      setDocuments([]);
      setKycStatus('pending');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      fetchStatus();
      return undefined;
    }, [fetchStatus])
  );

  const onBack = () => navigation.goBack();

  const getDocByType = (idType) => {
    const doc = documents.find((d) => d.idType === idType);
    if (doc) return doc;
    if (idType === 'driving-license') return documents.find((d) => d.idType === 'corporate');
    return null;
  };
  const isUploaded = (idType) => {
    const doc = getDocByType(idType);
    return !!(doc && doc.frontUrl);
  };

  const onPressDoc = (doc) => {
    const uploaded = isUploaded(doc.id);
    const serverDoc = getDocByType(doc.id);
    if (uploaded && serverDoc) {
      navigation.navigate(doc.screen, {
        docLabel: doc.label,
        docIcon: doc.icon,
        idType: doc.id,
        frontUrl: serverDoc.frontUrl,
        backUrl: serverDoc.backUrl,
        kycStatus,
      });
    } else {
      navigation.navigate('DocumentUpload', {
        idType: doc.id,
        docLabel: doc.label,
        docIcon: doc.icon,
      });
    }
  };

  const isApproved = ['approved', 'verified'].includes(kycStatus);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconWrap}>
              <Icon name="shieldCheck" size={20} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>TRUSTED IDENTITY VERIFICATION</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>TRACK VERIFICATION STATUS</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.docCard}>
            {DOCUMENTS.map((doc, index) => {
              const uploaded = isUploaded(doc.id);
              return (
                <TouchableOpacity
                  key={doc.id}
                  style={[styles.docRow, index < DOCUMENTS.length - 1 && styles.docRowBorder]}
                  activeOpacity={0.7}
                  onPress={() => onPressDoc(doc)}
                >
                  <Icon name={doc.icon} size={24} color={colors.textMuted} style={styles.docIcon} />
                  <View style={styles.docTextWrap}>
                    <Text style={styles.docLabel}>{doc.label}</Text>
                  </View>
                  <View
                    style={[
                      styles.verifiedBadge,
                      !uploaded && styles.uploadBadge,
                      uploaded && !isApproved && styles.pendingBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.verifiedBadgeText,
                        !uploaded && styles.uploadBadgeText,
                        uploaded && !isApproved && styles.pendingBadgeText,
                      ]}
                    >
                      {!uploaded ? 'Upload' : isApproved ? 'Verified' : 'Pending'}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={20} color={colors.textLight} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.disclaimerBlock}>
          <View style={styles.disclaimerIconWrap}>
            <Icon name="check" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.disclaimerText}>
            Your KYC data is encrypted and access-controlled. Verification helps prevent fraud and protects fair trade.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
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
  content: { padding: 24, paddingBottom: 48 },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 16,
    marginTop: SUBMITTED_TOP_MARGIN,
  },
  docCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  docRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  docIcon: { marginRight: 14 },
  docTextWrap: { flex: 1 },
  docLabel: { fontSize: 16, fontWeight: '600', color: colors.primary },
  loadingWrap: { paddingVertical: 48, alignItems: 'center' },
  verifiedBadge: {
    backgroundColor: colors.successGreenBg,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.success,
  },
  verifiedBadgeText: { fontSize: 12, fontWeight: '700', color: colors.success },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  pendingBadgeText: { color: '#92400E' },
  uploadBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: DROPDOWN_BLUE,
  },
  uploadBadgeText: { color: DROPDOWN_BLUE },
  disclaimerBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  disclaimerIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'justify',
  },
});
