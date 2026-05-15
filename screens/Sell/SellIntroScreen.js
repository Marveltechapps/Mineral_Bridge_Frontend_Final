import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { getSellContent, getBuyContent, getMineralById } from '../../lib/services';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';
import { formatAvailability, getAvailableQuantityHeroLine } from '../../lib/mineralDisplay';
import { mergeMineralWithDetails } from '../../data/minerals';
import { normalizeRemoteImageUri } from '../../lib/remoteImageUri';

const HERO_HEIGHT = 220;
const ACCEPT_OPTIONS = ['Raw', 'Semi Finished', 'Finished'];
const COMPLIANCE_ITEMS = [
  'Legal ownership documentation',
  'Ethical sourcing verification',
  'Free of conflict zone origin',
];

/**
 * Sell Intro – same layout for all minerals (Gold, Silver, Diamonds, Copper, etc.).
 * Uses each mineral’s own image and name: hero image = mineral.image, title & product description = mineral.name.
 */
export default function SellIntroScreen({ route, navigation }) {
  const { mineral: mineralParam, category, fromArtisanal } = route.params || {};
  const [mineral, setMineral] = useState(mineralParam);
  const mineralName = mineral?.name || 'mineral';
  const [sellContent, setSellContent] = useState(null);
  const [buyContent, setBuyContent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSellContent()
      .then((data) => { if (!cancelled) setSellContent(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getBuyContent()
      .then((data) => { if (!cancelled) setBuyContent(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Refetch buy content when screen is focused so WHAT WE ACCEPT shows newly added mineral types
  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      getBuyContent()
        .then((data) => setBuyContent(data))
        .catch(() => {});
      return undefined;
    }, [])
  );

  // Refetch mineral on focus so availability / quantity from dashboard stay current
  useFocusEffect(
    useCallback(() => {
      const id = mineralParam?.id ?? (mineralParam?._id && String(mineralParam._id));
      if (!id) return undefined;
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      let cancelled = false;
      getMineralById(id)
        .then((data) => {
          if (!cancelled) setMineral(mergeMineralWithDetails(data));
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [mineralParam?.id, mineralParam?._id])
  );

  // WHAT WE ACCEPT: always use dashboard-driven list (buy content API) so newly added mineral types (e.g. Silica Sand) show
  const mineralTypesFromBuy = buyContent?.quantityStep?.mineralTypeOptions;
  const acceptFormats =
    (Array.isArray(mineralTypesFromBuy) && mineralTypesFromBuy.length > 0 ? mineralTypesFromBuy : null) ||
    ACCEPT_OPTIONS;
  const complianceFromContent = sellContent?.requiredCompliance;
  const complianceItems = Array.isArray(complianceFromContent) && complianceFromContent.length > 0 ? complianceFromContent : COMPLIANCE_ITEMS;
  const qtyLine = getAvailableQuantityHeroLine(mineral);

  return (
    <View style={styles.pageWrap}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero – each mineral’s own image, gradient, back, title = mineral name, subtitle */}
        <View style={styles.heroWrap}>
          {(mineral?.image || mineral?.imageUrl) ? (
            <Image
              source={{ uri: String(mineral.image || mineral.imageUrl) }}
              style={styles.heroImage}
              resizeMode="cover"
              onLoad={() => console.log('IMG_LOADED', mineral?.image || mineral?.imageUrl)}
              onError={(e) => console.log('IMG_ERROR', e?.nativeEvent, mineral?.image || mineral?.imageUrl)}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]} />
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Icon name="chevronLeft" size={22} color="#51A2FF" />
          </TouchableOpacity>
        </View>

        {/* Title (moved OUTSIDE the image) */}
        <View style={styles.titleSection}>
          <Text style={styles.titleName}>{mineralName}</Text>
          <View style={styles.availabilityRow}>
            <Text style={styles.availabilityLabel}>{qtyLine?.title || 'Availability'}</Text>
            <Text style={styles.availabilityValue} numberOfLines={2}>
              {qtyLine?.value || formatAvailability(mineral)}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.planStrip}>
            <Text style={styles.planStripText}>Sell in 3 steps: Add details, Schedule pickup, Get paid securely.</Text>
          </View>
          {/* Product Description – from dashboard only (no hardcoded narrative) */}
          {(mineral?.description && String(mineral.description).trim()) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Description</Text>
              <View style={styles.descCard}>
                <Text style={styles.narrativeLabel}>INSTITUTIONAL GRADE NARRATIVE</Text>
                <Text style={styles.descText}>{mineral.description.trim()}</Text>
              </View>
            </View>
          ) : null}

          {/* WHAT WE ACCEPT – display only (no selection, no hover) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WHAT WE ACCEPT</Text>
            <View style={styles.pillsRow}>
              {acceptFormats.map((opt) => (
                <View key={opt} style={styles.pill}>
                  <Text style={styles.pillText}>{opt}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* REQUIRED COMPLIANCE – checkmarks */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>REQUIRED COMPLIANCE</Text>
            {complianceItems.map((item) => (
              <View key={item} style={styles.complianceRow}>
                <View style={styles.checkWrap}>
                  <Icon name="checkCircle" size={22} color={colors.successGreen} />
                </View>
                <Text style={styles.complianceText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom – Add Mineral Details */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonHover]}
          onPress={() =>
            navigation.navigate('SellDetails', {
              mineral,
              category,
              acceptedFormat: mineral?.defaultAcceptedFormat || (acceptFormats[0] || 'Raw'),
              fromArtisanal,
            })
          }
        >
          <Text style={styles.ctaButtonText}>Add Mineral Details</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageWrap: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 100, flexGrow: 1 },
  heroWrap: {
    width: '100%',
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: { backgroundColor: '#101828' },
  backBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    left: 16,
    top: 48,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  titleName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 6,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  availabilityLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    maxWidth: '48%',
  },
  availabilityValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  planStrip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  planStripText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2A44',
  },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.primary, marginBottom: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 12,
  },
  descCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  narrativeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 8,
  },
  descText: { fontSize: 14, lineHeight: 22, color: colors.primary, textAlign: 'justify' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  pillText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  complianceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkWrap: { marginRight: 12 },
  complianceText: { fontSize: 12, color: colors.primary, flex: 1 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonHover: { opacity: 0.9 },
  ctaButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
