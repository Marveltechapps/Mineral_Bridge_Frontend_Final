import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Dimensions,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { fetchWithAuth, getApiBase } from '../../lib/api';
import { normalizeRemoteImageUri } from '../../lib/remoteImageUri';
import {
  getBanners,
  sortMineralCategories,
  getBannerImageLayout,
  getBuyContent,
  getCategoryDisplayName,
  getBuyCategoryTileImageUrl,
  getCategoryGridTileWidth,
} from '../../lib/services';
import { CategoryHeroTile } from '../../components/CategoryHeroTile';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';
import { useHeaderPaddingTop } from '../../lib/headerInsets';

const FALLBACK_EMAIL = 'support@mineralbridge.com';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_TOP = Math.round(WINDOW_HEIGHT * 0.04);
const HEADER_BOTTOM = Math.round(WINDOW_HEIGHT * 0.02);
const BULK_CARD_MARGIN_TOP = Math.round(WINDOW_HEIGHT * 0.04);

const API_BASE = getApiBase();

const FALLBACK_CATEGORIES = [
  { id: '1', label: 'Precious metals' },
  { id: '2', label: 'Gemstone' },
  { id: '3', label: 'Industrial mineral' },
  { id: '4', label: 'Critical mineral' },
  { id: '5', label: 'Energy mineral' },
  { id: '6', label: 'Other' },
];

export default function SellScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [supportEmail, setSupportEmail] = useState(FALLBACK_EMAIL);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [sellBanner, setSellBanner] = useState(null);
  const [buyContent, setBuyContent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchAtRef = useRef(0);
  const { width } = useWindowDimensions();
  const fromArtisanal = route?.params?.fromArtisanal === true;
  const sellHeaderPaddingTop = useHeaderPaddingTop(HEADER_TOP);
  const contentWidth = Math.min(width, 420);
  const cardWidth = getCategoryGridTileWidth(contentWidth);
  const sellBannerHeight = Math.round(((contentWidth - 40) * 145) / 358);

  useEffect(() => {
    getBanners('sell').then((banners) => {
      setSellBanner(Array.isArray(banners) && banners.length > 0 ? banners[0] : null);
    }).catch(() => {});
    getBuyContent().then(setBuyContent).catch(() => {});
  }, []);

  const loadSellData = useCallback((showLoader = true) => {
    let cancelled = false;
    if (showLoader) setCategoriesLoading(true);
    (async () => {
      try {
        const res = await fetchWithAuth('/api/support-config');
        if (res.ok && !cancelled) {
          const cfg = await res.json();
          if (cfg.supportEmail) setSupportEmail(cfg.supportEmail);
        }
      } catch { /* ignore */ }
    })();
    getBuyContent().then((c) => { if (!cancelled) setBuyContent(c); }).catch(() => {});
    fetch(`${API_BASE}/api/minerals?forSell=1`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (cancelled) return;
        const catSet = [...new Set((list || []).map((m) => m.category || 'Other').filter(Boolean))];
        const catsOrdered = sortMineralCategories(catSet);
        setCategories(catsOrdered.length ? catsOrdered.map((label, i) => ({ id: String(i), label })) : FALLBACK_CATEGORIES);
        lastFetchAtRef.current = Date.now();
      })
      .catch(() => { if (!cancelled) setCategories(FALLBACK_CATEGORIES); })
      .finally(() => {
        if (!cancelled) {
          setCategoriesLoading(false);
          setRefreshing(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      const now = Date.now();
      const shouldShowLoader = !lastFetchAtRef.current || (now - lastFetchAtRef.current > 30000);
      const cleanup = loadSellData(shouldShowLoader);
      return cleanup;
    }, [loadSellData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSellData();
  }, [loadSellData]);

  const searchLower = (search || '').trim().toLowerCase();
  const filteredCategories = searchLower
    ? categories.filter((cat) => (cat.label || '').toLowerCase().includes(searchLower))
    : categories;
  const hasSellBanner = !!sellBanner;
  const sellBannerSubtitle = sellBanner?.subtitle || sellBanner?.description || '';
  const sellBannerLayout = getBannerImageLayout(sellBanner);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header – #EFF6FF, rounded bottom 35px, title left + search */}
      <View style={[styles.sellHeader, { width: contentWidth, alignSelf: 'center', paddingTop: sellHeaderPaddingTop }]}>
        <View style={styles.sellHeaderTopRow}>
          <View style={styles.sellHeaderLeft}>
            <View style={styles.sellLogoBox}>
              <Icon name="briefcase" size={21} color="#1F2A44" />
            </View>
            <View style={styles.sellHeaderTitleWrap}>
              <Text style={styles.sellHeaderTitle}>Sell Minerals</Text>
              <Text
                style={styles.sellHeaderSubtitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                Sell Minerals Globally with Confidence
              </Text>
            </View>
          </View>
          <View style={styles.sellHeaderRight} />
        </View>
        <View style={styles.searchWrap}>
          <View style={styles.searchIconLeft}>
            <Icon name="search" size={14} color="#51A2FF" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search mineral type..."
            placeholderTextColor="#6B7280"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={[styles.bannerWrap, { height: sellBannerHeight, width: contentWidth - 40, alignSelf: 'center' }]}>
        {sellBanner?.imageUrl ? (
          <ExpoImage
            source={{ uri: String(sellBanner.imageUrl) }}
            cachePolicy="memory-disk"
            style={styles.bannerImage}
            contentFit={sellBannerLayout.contentFit}
            contentPosition={sellBannerLayout.contentPosition}
            contentStyle={{ transform: sellBannerLayout.transform }}
            transition={120}
            onLoad={() => console.log('IMG_LOADED', sellBanner.imageUrl)}
            onError={(e) => console.log('IMG_ERROR', e, sellBanner.imageUrl)}
          />
        ) : null}
        {!hasSellBanner && <View style={styles.bannerOverlay} />}
        <View style={styles.bannerContent}>
          {hasSellBanner && !!sellBanner?.sponsoredTag && (
            <View style={styles.exportBadge}>
              <Text style={styles.exportBadgeText}>{sellBanner.sponsoredTag}</Text>
            </View>
          )}
          {!!(hasSellBanner ? sellBanner?.title : '') && (
            <Text style={styles.bannerTitle}>{sellBanner.title}</Text>
          )}
          {!!(hasSellBanner ? sellBannerSubtitle : '') && (
            <Text style={styles.bannerSub}>{sellBannerSubtitle}</Text>
          )}
        </View>
      </View>

      <View style={[styles.gridWrap, { width: contentWidth, alignSelf: 'center' }]}>
        {categoriesLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading categories…</Text>
          </View>
        ) : (
          filteredCategories.map((cat) => {
            const canonical = getCategoryDisplayName(cat.label) || cat.label;
            const tileUrl = getBuyCategoryTileImageUrl(buyContent, canonical) || null;
            const displayLabel = getCategoryDisplayName(cat.label) || cat.label;
            return (
              <CategoryHeroTile
                key={cat.id}
                width={cardWidth}
                imageUri={tileUrl}
                label={displayLabel}
                onPress={() => navigation.navigate('SellMineralList', { category: cat.label, fromArtisanal })}
              />
            );
          })
        )}
      </View>
      {!categoriesLoading && filteredCategories.length === 0 && (
        <View style={styles.emptySearchWrap}>
          <Text style={styles.emptySearchText}>
            {searchLower ? 'No category matches your search.' : 'Selling outside verified systems risks unfair pricing.'}
          </Text>
        </View>
      )}

      <View style={[styles.bulkCard, { width: contentWidth - 40, alignSelf: 'center' }]}>
        <View style={styles.bulkCardTextWrap}>
          <Text style={styles.bulkCardTitle}>Selling in bulk?</Text>
          <Text style={styles.bulkCardSub}>Contact our enterprise team.</Text>
        </View>
        <TouchableOpacity
          style={styles.bulkCardButton}
          activeOpacity={0.8}
          onPress={() => {
            const subject = encodeURIComponent('Mineral Bridge - Bulk Selling Inquiry');
            const body = encodeURIComponent('Hi Mineral Bridge Enterprise Team,\n\nI am interested in selling minerals in bulk. Please provide details on:\n\n');
            Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`);
          }}
        >
          <Text style={styles.bulkCardButtonText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 48 },
  sellHeader: {
    width: '100%',
    minHeight: 120,
    paddingHorizontal: 21,
    paddingBottom: HEADER_BOTTOM,
    gap: 21,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 16,
  },
  sellHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 35,
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  sellHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.5,
    flex: 1,
    minWidth: 0,
  },
  sellLogoBox: {
    width: 35,
    height: 35,
    borderRadius: 14.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  sellHeaderTitleWrap: {
    gap: 2,
    marginRight: 12,
    flexShrink: 1,
    minWidth: 0,
  },
  sellHeaderTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.4375,
    color: '#1F2A44',
  },
  sellHeaderSubtitle: {
    fontSize: 11,
    lineHeight: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  sellHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 35,
    justifyContent: 'flex-end',
  },
  searchWrap: {
    height: 42,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    paddingVertical: 3.5,
    paddingLeft: 38.5,
    paddingRight: 14,
    position: 'relative',
  },
  searchIconLeft: {
    position: 'absolute',
    left: 14,
    top: 14,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 12.25,
    lineHeight: 15,
    color: colors.primary,
    paddingVertical: 0,
  },
  bannerWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginBottom: 20,
    marginTop: 0,
    backgroundColor: '#1F2A44',
  },
  bannerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  bannerContent: { flex: 1, justifyContent: 'flex-end', padding: 20, paddingTop: 16 },
  exportBadge: { alignSelf: 'flex-start', backgroundColor: colors.gold, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  exportBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: colors.white, marginBottom: 6 },
  bannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 },
  bulkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 0,
    marginTop: BULK_CARD_MARGIN_TOP,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bulkCardTextWrap: { flex: 1 },
  bulkCardTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  bulkCardSub: { fontSize: 13, color: colors.textMuted },
  bulkCardButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  bulkCardButtonText: { fontSize: 14, fontWeight: '600', color: colors.white },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, rowGap: 16 },
  emptySearchWrap: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  emptySearchText: { fontSize: 14, color: colors.textMuted },
  loadingWrap: { width: '100%', paddingVertical: 24, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 14, color: colors.textMuted },
});
