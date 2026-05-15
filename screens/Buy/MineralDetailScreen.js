import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMineralById, getBuyContent } from '../../lib/services';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';
import { formatAvailability, getAvailableQuantityHeroLine } from '../../lib/mineralDisplay';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { normalizeRemoteImageUri } from '../../lib/remoteImageUri';

// Figma: 380x252 hero container
const HERO_HEIGHT = 252;
const DEFAULT_ACCEPT_OPTIONS = ['Raw', 'Semi Finished', 'Finished'];

export default function MineralDetailScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 420);
  const { mineral: mineralParam } = route.params || {};
  const [mineral, setMineral] = useState(mineralParam || null);
  const [loading, setLoading] = useState(!!(mineralParam?.id ?? mineralParam?._id));
  const [buyContent, setBuyContent] = useState(null);

  // Refetch on every focus so dashboard changes (availability / quantity) show without stale cache.
  useFocusEffect(
    useCallback(() => {
      const id = mineralParam?.id ?? (mineralParam?._id && String(mineralParam._id));
      if (!id) {
        setLoading(false);
        setMineral(mineralParam || null);
        return undefined;
      }
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      setLoading(true);
      let cancelled = false;
      getMineralById(id)
        .then((data) => {
          if (!cancelled) setMineral(data);
        })
        .catch(() => {
          if (!cancelled) setMineral(mineralParam || null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [mineralParam?.id, mineralParam?._id])
  );

  useEffect(() => {
    let cancelled = false;
    getBuyContent()
      .then((data) => { if (!cancelled) setBuyContent(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      getBuyContent()
        .then((data) => setBuyContent(data))
        .catch(() => {});
      return undefined;
    }, [])
  );

  // WHAT WE ACCEPT: use dashboard-driven list (content API) first so newly added mineral types always show
  const acceptFormats =
    (Array.isArray(buyContent?.quantityStep?.mineralTypeOptions) && buyContent.quantityStep.mineralTypeOptions.length > 0)
      ? buyContent.quantityStep.mineralTypeOptions
      : (Array.isArray(mineral?.mineralTypes) && mineral.mineralTypes.length > 0)
        ? mineral.mineralTypes
        : DEFAULT_ACCEPT_OPTIONS;

  if (!mineral && !loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Mineral not found.</Text>
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

  const categoryLabel = (mineral?.category && String(mineral.category).trim()) ? String(mineral.category).trim() : 'Precious Metal';

  return (
    <View style={styles.pageWrap}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero – same image URL as list/cards so it loads from cache (no reload). Use original-quality only. */}
        <View style={styles.heroWrap}>
          {(mineral.imageUrl || mineral.image) ? (
            <Image
              source={{ uri: String(mineral.imageUrl || mineral.image) }}
              style={styles.heroImage}
              resizeMode="cover"
              onLoad={() => console.log('IMG_LOADED', mineral.imageUrl || mineral.image)}
              onError={(e) => console.log('IMG_ERROR', e?.nativeEvent, mineral.imageUrl || mineral.image)}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroImagePlaceholder]} />
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Icon name="chevronLeft" size={18} color="#51A2FF" />
          </TouchableOpacity>
        </View>

        {/* Title (moved OUTSIDE the image) */}
        <View style={[styles.titleSection, { width: contentWidth, alignSelf: 'center' }]}>
          <View style={styles.heroBadges}>
            <View style={styles.badgeVerified}>
              <Text style={styles.badgeVerifiedText}>{categoryLabel}</Text>
            </View>
          </View>
          <Text style={styles.titleName}>{mineral.name}</Text>
        </View>

        {/* Body – first row: label left, quantity + unit right (below hero image) */}
        <View style={[styles.body, { width: contentWidth, alignSelf: 'center' }]}>
          <View style={styles.availabilityRow}>
            {(() => {
              const qtyLine = getAvailableQuantityHeroLine(mineral);
              if (qtyLine) {
                return (
                  <>
                    <Text style={styles.availabilityRowLabel}>{qtyLine.title}</Text>
                    <Text style={styles.availabilityRowValue} numberOfLines={2}>
                      {qtyLine.value}
                    </Text>
                  </>
                );
              }
              return (
                <>
                  <Text style={styles.availabilityRowLabel}>Availability</Text>
                  <Text style={styles.availabilityRowValue} numberOfLines={2}>
                    {formatAvailability(mineral)}
                  </Text>
                </>
              );
            })()}
          </View>
          <View style={styles.planStrip}>
            <Text style={styles.planStripText}>Step 1: Select verified mineral and quality.</Text>
          </View>

          {(mineral.origin && String(mineral.origin).trim()) || (mineral.purity && String(mineral.purity).trim()) ? (
            <View style={styles.specsRow}>
              {mineral.origin != null && String(mineral.origin).trim() ? (
                <View style={styles.specCard}>
                  <Text style={styles.specLabel}>ORIGIN</Text>
                  <Text style={styles.specValue}>{mineral.origin.trim()}</Text>
                </View>
              ) : null}
              {mineral.purity != null && String(mineral.purity).trim() ? (
                <View style={styles.specCard}>
                  <Text style={styles.specLabel}>PURITY</Text>
                  <Text style={styles.specValue}>{mineral.purity.trim()}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Product Description – from dashboard only */}
          {mineral.description && String(mineral.description).trim() ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Description</Text>
              <View style={styles.descCard}>
                <Text style={styles.narrativeTitle}>INSTITUTIONAL GRADE NARRATIVE</Text>
                <Text style={styles.desc}>{mineral.description.trim()}</Text>
              </View>
            </View>
          ) : null}

          {/* What we accept – same mineral types as dashboard (includes custom e.g. Silica Sand) */}
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

    {/* Due Diligence 
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Due Diligence</Text>
            <Pressable style={styles.diligenceRow} onPress={() => {}}>
              <View style={styles.diligenceIconWrap}>
                <Icon name="lock" size={20} color="#51A2FF" />
              </View>
              <View style={styles.diligenceTextWrap}>
                <Text style={styles.diligenceTitle}>Blockchain Proof</Text>
                <Text style={styles.diligenceSub}>Immutable ledger record</Text>
              </View>
              <Icon name="chevronRight" size={20} color="#94A3B8" />
            </Pressable>
            <Pressable style={styles.diligenceRow} onPress={() => {}}>
              <View style={styles.diligenceIconWrap}>
                <Icon name="trendingUp" size={20} color="#51A2FF" />
              </View>
              <View style={styles.diligenceTextWrap}>
                <Text style={styles.diligenceTitle}>Market Insights</Text>
                <Text style={styles.diligenceSub}>AI price analysis & trends</Text>
              </View>
              <Icon name="chevronRight" size={20} color="#94A3B8" />
            </Pressable>
          </View>
        </View> */}
        </View>
      </ScrollView>

      {/* Fixed bottom: white strip + Secure Allocation button – hover blue */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.button, { width: contentWidth - 40, alignSelf: 'center' }, pressed && styles.buttonHover]}
          onPress={() => navigation.navigate('Quantity', { mineral })}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageWrap: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 120, flexGrow: 1 },
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
  heroImagePlaceholder: {
    backgroundColor: '#101828',
  },
  backBtn: {
    position: 'absolute',
    width: 31.5,
    height: 31.5,
    left: 14,
    top: 42,
    borderRadius: 99999,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  badgeVerified: {
    paddingVertical: 1.75,
    paddingHorizontal: 7,
    borderRadius: 8.5,
    backgroundColor: '#F2C94C',
  },
  badgeVerifiedText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    color: '#1F2A44',
  },
  titleSection: {
    paddingHorizontal: 21,
    paddingTop: 16,
    paddingBottom: 6,
  },
  titleName: {
    fontSize: 26.25,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.65625,
    color: '#101828',
  },
  body: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 21,
    paddingBottom: 24,
    marginTop: 0,
  },
  planStrip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  planStripText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2A44',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  availabilityRowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    maxWidth: '48%',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  availabilityRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  specCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#94A3B8',
    marginBottom: 4,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    color: '#101828',
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#94A3B8',
    marginBottom: 12,
  },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  pillText: { fontSize: 14, fontWeight: '600', color: '#101828' },
  descCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 20,
  },
  narrativeTitle: {
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#94A3B8',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
    color: '#101828',
  },
  diligenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  diligenceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  diligenceTextWrap: { flex: 1 },
  diligenceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 2,
  },
  diligenceSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  button: {
    backgroundColor: '#1F2A44',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonHover: { borderColor: '#51A2FF' },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#101828',
  },
  centeredText: { color: '#fff', fontSize: 16 },
});
