import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import {
  getMinerals,
  getBanners,
  getBuyContent,
  getCategoryDisplayName,
  getCanonicalCategoryKey,
  getBannerImageLayout,
  getBuyCategoryTileImageUrl,
  getCategoryGridTileWidth,
} from '../../lib/services';
import { CategoryHeroTile } from '../../components/CategoryHeroTile';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';
import { useHeaderPaddingTop } from '../../lib/headerInsets';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { normalizeRemoteImageUri } from '../../lib/remoteImageUri';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_TOP = Math.round(WINDOW_HEIGHT * 0.04);
const HEADER_BOTTOM = Math.round(WINDOW_HEIGHT * 0.02);

export default function BuyScreen({ navigation }) {
  const [minerals, setMinerals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [buyBanner, setBuyBanner] = useState(null);
  const [buyContent, setBuyContent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchAtRef = useRef(0);
  const lastBuyContentFetchAtRef = useRef(0);
  const { width } = useWindowDimensions();
  const buyHeaderPaddingTop = useHeaderPaddingTop(HEADER_TOP);
  const contentWidth = Math.min(width, 420);
  const cardWidth = getCategoryGridTileWidth(contentWidth);
  const buyBannerHeight = Math.round(((contentWidth - 40) * 145) / 358);

  useEffect(() => {
    getBanners('buy').then((banners) => {
      setBuyBanner(Array.isArray(banners) && banners.length > 0 ? banners[0] : null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getBuyContent()
      .then((c) => {
        setBuyContent(c);
        lastBuyContentFetchAtRef.current = Date.now();
      })
      .catch(() => {});
  }, []);

  const loadMinerals = useCallback((showLoader = true) => {
    if (showLoader) setLoading(true);
    getMinerals({ forBuy: 1 })
      .then((data) => {
        setMinerals(data);
        setError(null);
        lastFetchAtRef.current = Date.now();
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  // When returning from dashboard/admin, ensure cards reflect latest availableQuantity.
  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      const now = Date.now();
      const shouldShowLoader = !lastFetchAtRef.current || (now - lastFetchAtRef.current > 30000);
      loadMinerals(shouldShowLoader);
      const shouldRefetchBuyContent = !lastBuyContentFetchAtRef.current || (now - lastBuyContentFetchAtRef.current > 30000);
      if (shouldRefetchBuyContent) {
        getBuyContent()
          .then((c) => {
            setBuyContent(c);
            lastBuyContentFetchAtRef.current = Date.now();
          })
          .catch(() => {});
      }
      return undefined;
    }, [loadMinerals])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getBuyContent()
      .then((c) => {
        setBuyContent(c);
        lastBuyContentFetchAtRef.current = Date.now();
      })
      .catch(() => {});
    loadMinerals();
  }, [loadMinerals]);

  if (loading) {
    return (
      <View style={[styles.centered, styles.screenRoot]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading minerals…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, styles.screenRoot]}>
        <Text style={styles.errorText}>Unverified supply chains can cause losses and delays.</Text>
        <Text style={styles.emptyText}>{error}</Text>
      </View>
    );
  }

  const searchLower = (search || '').trim().toLowerCase();
  const filteredMinerals = searchLower
    ? (minerals || []).filter((m) => {
        const name = (m.name || '').toLowerCase();
        const category = (m.category || '').toLowerCase();
        const subCategory = (m.subCategory || '').toLowerCase();
        const id = (m.id || (m._id && String(m._id)) || '').toLowerCase();
        return name.includes(searchLower) || category.includes(searchLower) || subCategory.includes(searchLower) || id.includes(searchLower);
      })
    : minerals || [];

  // Group by category → sub-category → list. Use canonical category so "Gemstones" and "Gemstone" both show under "Gemstone".
  const categoryToSub = {};
  (filteredMinerals || []).forEach((m) => {
    const cat = m.category || 'Other';
    const sub = (m.subCategory && String(m.subCategory).trim()) ? String(m.subCategory).trim() : 'General';
    if (!categoryToSub[cat]) categoryToSub[cat] = {};
    if (!categoryToSub[cat][sub]) categoryToSub[cat][sub] = [];
    categoryToSub[cat][sub].push(m);
  });
  const rawCategories = Object.keys(categoryToSub);
  const canonicalOrder = ['Precious Metal', 'Gemstone', 'Industrial Mineral', 'Critical Mineral', 'Energy Mineral'];
  const uniqueCanonical = [...new Set(rawCategories.map(getCanonicalCategoryKey))];
  const orderedCategoryNames = canonicalOrder.filter((c) => uniqueCanonical.includes(c)).concat(uniqueCanonical.filter((c) => !canonicalOrder.includes(c)));
  const orderedSections = [];
  rawCategories.forEach((cat) => {
    const subToList = categoryToSub[cat];
    const subNames = Object.keys(subToList).sort((a, b) => {
      if (a === 'General') return 1;
      if (b === 'General') return -1;
      const minOrder = (list) => {
        let min = 999999;
        list.forEach((m) => { if (m.sortOrder != null && typeof m.sortOrder === 'number' && m.sortOrder < min) min = m.sortOrder; });
        return min;
      };
      const orderA = minOrder(subToList[a]);
      const orderB = minOrder(subToList[b]);
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });
    subNames.forEach((sub) => {
      orderedSections.push({ category: cat, subCategory: sub, list: categoryToSub[cat][sub] });
    });
  });
  const hasMinerals = orderedSections.length > 0;
  const categoryDisplay = buyContent?.categoryDisplay || {};
  const hasBuyBanner = !!buyBanner;
  const buyBannerSubtitle = buyBanner?.subtitle || buyBanner?.description || '';
  const buyBannerLayout = getBannerImageLayout(buyBanner);

  const openMainCategory = (canonicalCat) => {
    const sectionsInCategory = orderedSections.filter(
      (s) => getCanonicalCategoryKey(s.category) === canonicalCat,
    );
    if (!sectionsInCategory.length) return;
    const sections = sectionsInCategory.map(({ category, subCategory }) => {
      const disp = categoryDisplay[category];
      const title =
        subCategory === 'General'
          ? disp?.displayName || getCategoryDisplayName(category) || category
          : subCategory;
      return { category, subCategory, title };
    });
    navigation.navigate('BuyCategoryPick', { canonicalCat, sections });
  };

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
      {/* Buy screen header – same cart icon as Home Buy CTA; title + tagline + search */}
      <View style={[styles.buyHeader, { width: contentWidth, alignSelf: 'center', paddingTop: buyHeaderPaddingTop }]}>
        <View style={styles.buyHeaderTopRow}>
          <View style={styles.buyHeaderLeft}>
            <View style={styles.buyLogoBox}>
              <Icon name="cart" size={21} color="#1F2A44" />
            </View>
            <View style={styles.buyHeaderTitleWrap}>
              <Text style={styles.buyHeaderTitle}>Buy Minerals</Text>
              <Text style={styles.buyHeaderSubtitle}>Buy Verified Minerals Worldwide</Text>
            </View>
          </View>
          <View style={styles.buyHeaderRight} />
        </View>
        <View style={styles.searchWrap}>
          <View style={styles.searchIconLeft}>
            <Icon name="search" size={14} color="#51A2FF" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search mineral, metal, or category..."
            placeholderTextColor="#6B7280"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={[styles.bannerWrap, { height: buyBannerHeight, width: contentWidth - 40, alignSelf: 'center' }]}>
        {buyBanner?.imageUrl ? (
          <ExpoImage
            source={{ uri: String(buyBanner.imageUrl) }}
            cachePolicy="memory-disk"
            style={styles.bannerImage}
            contentFit={buyBannerLayout.contentFit}
            contentPosition={buyBannerLayout.contentPosition}
            contentStyle={{ transform: buyBannerLayout.transform }}
            transition={120}
            onLoad={() => console.log('IMG_LOADED', buyBanner.imageUrl)}
            onError={(e) => console.log('IMG_ERROR', e, buyBanner.imageUrl)}
          />
        ) : null}
        {!hasBuyBanner && <View style={styles.bannerOverlay} />}
        <View style={styles.bannerContent}>
          {hasBuyBanner && !!buyBanner?.sponsoredTag && (
            <View style={styles.vaultBadge}>
              <Text style={styles.vaultBadgeText}>{buyBanner.sponsoredTag}</Text>
            </View>
          )}
          {!!(hasBuyBanner ? buyBanner?.title : '') && (
            <Text style={styles.bannerTitle}>{buyBanner.title}</Text>
          )}
          {!!(hasBuyBanner ? buyBannerSubtitle : '') && (
            <Text style={styles.bannerSub}>{buyBannerSubtitle}</Text>
          )}
        </View>
      </View>

      {hasMinerals ? (
        <View style={[styles.gridWrap, { width: contentWidth, alignSelf: 'center' }]}>
          {orderedCategoryNames.map((canonicalCat) => (
            <CategoryHeroTile
              key={`main-${canonicalCat}`}
              width={cardWidth}
              imageUri={getBuyCategoryTileImageUrl(buyContent, canonicalCat) || null}
              label={getCategoryDisplayName(canonicalCat) || canonicalCat}
              onPress={() => openMainCategory(canonicalCat)}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.section, styles.sectionPadded]}>
          <Text style={styles.sectionTitle}>{search.trim() ? 'Search' : 'Precious Metals'}</Text>
          <Text style={styles.emptyText}>
            {search.trim() ? 'No minerals match your search.' : 'Unverified supply chains can cause losses and delays.'}
          </Text>
        </View>
      )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  buyHeader: {
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
  buyHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 35,
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  buyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.5,
    flex: 1,
    minWidth: 0,
  },
  buyLogoBox: {
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
  buyHeaderTitleWrap: {
    gap: 2,
    marginRight: 12,
    flexShrink: 1,
    minWidth: 0,
  },
  buyHeaderTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.4375,
    color: '#1F2A44',
  },
  buyHeaderSubtitle: {
    fontSize: 11,
    lineHeight: 14,
    color: '#4B5563',
    fontWeight: '500',
    maxWidth: 210,
  },
  buyHeaderRight: {
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
  vaultBadge: { alignSelf: 'flex-start', backgroundColor: colors.gold, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  vaultBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: colors.white, marginBottom: 6 },
  bannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    rowGap: 16,
    marginBottom: 8,
  },
  section: { marginBottom: 24 },
  sectionPadded: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textMuted },
  errorText: { fontSize: 16, color: colors.error, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
});
