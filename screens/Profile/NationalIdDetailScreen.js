import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Image } from 'react-native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { getApiBase, getToken } from '../../lib/api';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DOC_CARD_TOP_MARGIN = Math.round(WINDOW_HEIGHT * 0.04);
const DROPDOWN_BLUE = '#51A2FF';

function formatUploadDate() {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Uploaded on ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function NationalIdDetailScreen({ navigation, route }) {
  const docLabel = route?.params?.docLabel || 'National ID';
  const docIcon = route?.params?.docIcon || 'document';
  const idType = route?.params?.idType;
  const frontUrl = route?.params?.frontUrl;
  const backUrl = route?.params?.backUrl;
  const kycStatus = route?.params?.kycStatus;
  const isApproved = ['approved', 'verified'].includes(kycStatus);
  const [imageUris, setImageUris] = useState({ front: null, back: null });

  const onBack = () => navigation.goBack();
  const hasImageData = !!(frontUrl && typeof frontUrl === 'string');

  useEffect(() => {
    if (!hasImageData || !idType) return;
    const base = getApiBase();
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const tokenQ = token ? `&token=${encodeURIComponent(token)}` : '';
        const frontUri = `${base}/api/kyc/documents/${encodeURIComponent(idType)}/image?side=front${tokenQ}`;
        const backUri = `${base}/api/kyc/documents/${encodeURIComponent(idType)}/image?side=back${tokenQ}`;
        if (!cancelled) {
          setImageUris({ front: frontUri, back: backUri });
        }
      } catch {
        if (!cancelled) setImageUris({ front: null, back: null });
      }
    })();
    return () => { cancelled = true; };
  }, [hasImageData, idType]);

  const frontDisplay = imageUris.front;
  const backDisplay = imageUris.back;
  const hasImage = hasImageData && !!frontDisplay;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconWrap}>
                <Icon name={docIcon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.headerTitle}>{docLabel}</Text>
                <View style={[styles.verifiedBadge, !isApproved && styles.pendingBadge]}>
                  <Text style={[styles.verifiedBadgeText, !isApproved && styles.pendingBadgeText]}>
                    {isApproved ? 'Verified' : 'Pending'}
                  </Text>
                </View>
            </View>
            <Text style={styles.headerSubtitle}>{formatUploadDate()}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.docPlaceholder}>
          {hasImage ? (
            <View style={styles.docImageWrap}>
              <Image source={{ uri: frontDisplay }} style={styles.docImage} resizeMode="contain" />
              {backDisplay && (
                <Image source={{ uri: backDisplay }} style={[styles.docImage, styles.docImageBack]} resizeMode="contain" />
              )}
            </View>
          ) : (
            <View style={styles.docPlaceholderInner}>
              <View style={styles.docIconWrap}>
                <Icon name={docIcon} size={44} color={colors.textLight} />
                <View style={styles.docLockOverlay}>
                  <Icon name="lock" size={16} color={colors.textLight} />
                </View>
              </View>
              <Text style={styles.docPlaceholderText}>ENCRYPTED & PREVIOUSLY LOCKED</Text>
            </View>
          )}
        </View>

        <Text style={styles.quoteText}>"Institutional document records are non-editable once verified."</Text>
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
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 4,
  },
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
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.primary, letterSpacing: 0.3 },
  verifiedBadge: {
    backgroundColor: colors.successGreenBg,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.success,
  },
  verifiedBadgeText: { fontSize: 12, fontWeight: '700', color: colors.success },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  pendingBadgeText: { color: '#92400E' },
  headerSubtitle: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  headerRight: { width: 44 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  docPlaceholder: {
    minHeight: 280,
    backgroundColor: colors.borderLight,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: DOC_CARD_TOP_MARGIN,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docPlaceholderInner: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  docImageWrap: { flex: 1, width: '100%', padding: 16 },
  docImage: {
    width: '100%',
    minHeight: 180,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
  },
  docImageBack: { marginTop: 16 },
  docIconWrap: { position: 'relative', marginBottom: 16 },
  docLockOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPlaceholderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 1,
  },
  quoteText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
});
