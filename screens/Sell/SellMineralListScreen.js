import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { getApiBase } from '../../lib/api';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import {
  getBuyContent,
  getCategoryDisplayName,
  getSectionHeaderImageForCategory,
  getBuySubCategoryTileImageUrl,
  getBuyCategoryTileImageUrl,
  getCategoryGridTileWidth,
} from '../../lib/services';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';
import { useHeaderPaddingTop } from '../../lib/headerInsets';
import { CategoryHeroTile } from '../../components/CategoryHeroTile';

const API_BASE = getApiBase();
const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_TOP = Math.round(WINDOW_HEIGHT * 0.04);
const HEADER_BOTTOM = Math.round(WINDOW_HEIGHT * 0.02);

function isPlaceholderImage(uri) {
  if (!uri || typeof uri !== 'string') return true;
  const u = uri.trim().toLowerCase();
  return u.includes('unsplash.com') || u.includes('placeholder');
}

export default function SellMineralListScreen({ route, navigation }) {
  const { category, fromArtisanal } = route.params || {};
  const [minerals, setMinerals] = useState([]);
  const [buyContent, setBuyContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastBuyContentFetchAtRef = useRef(0);
  const { width } = useWindowDimensions();
  const headerPaddingTop = useHeaderPaddingTop(HEADER_TOP);
  const contentWidth = Math.min(width, 420);
  const cardWidth = getCategoryGridTileWidth(contentWidth);

  const headerTitle = getCategoryDisplayName(category) || category || 'Minerals';
  const categoryDisplay = buyContent?.categoryDisplay || {};
  const canonicalCat = useMemo(() => getCategoryDisplayName(category) || category || '', [category]);

  useEffect(() => {
    getBuyContent()
      .then((c) => {
        setBuyContent(c);
        lastBuyContentFetchAtRef.current = Date.now();
      })
      .catch(() => {});
  }, []);

  const loadMinerals = useCallback(() => {
    setLoading(true);
    const url = category ? `${API_BASE}/api/minerals?forSell=1&category=${encodeURIComponent(category)}` : `${API_BASE}/api/minerals?forSell=1`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMinerals(Array.isArray(data) ? data : []))
      .catch(() => setMinerals([]))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      const now = Date.now();
      if (!lastBuyContentFetchAtRef.current || (now - lastBuyContentFetchAtRef.current > 30000)) {
        getBuyContent()
          .then((c) => {
            setBuyContent(c);
            lastBuyContentFetchAtRef.current = Date.now();
          })
          .catch(() => {});
      }
      loadMinerals();
      return undefined;
    }, [loadMinerals]),
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

  const resolveTileUrl = useCallback(
    (subCategory, title, list, disp) => {
      let url = getBuySubCategoryTileImageUrl(buyContent, canonicalCat, title, subCategory) || '';
      if (!url || isPlaceholderImage(url)) {
        if (subCategory === 'General') {
          url = getBuyCategoryTileImageUrl(buyContent, canonicalCat) || '';
        }
      }
      if (!url || isPlaceholderImage(url)) {
        url =
          (disp?.imageUrl && !isPlaceholderImage(disp.imageUrl) && disp.imageUrl) ||
          list[0]?.imageUrl ||
          list[0]?.image ||
          getSectionHeaderImageForCategory(title, category, list, minerals) ||
          '';
      }
      return url && !isPlaceholderImage(url) ? url : null;
    },
    [buyContent, canonicalCat, category, minerals],
  );

  const bySubCategory = (minerals || []).reduce((acc, m) => {
    const sub = m.subCategory && String(m.subCategory).trim() ? String(m.subCategory).trim() : 'General';
    if (!acc[sub]) acc[sub] = [];
    acc[sub].push(m);
    return acc;
  }, {});
  const subCategoryNames = Object.keys(bySubCategory).sort((a, b) => {
    if (a === 'General') return 1;
    if (b === 'General') return -1;
    const minOrder = (list) => {
      let min = 999999;
      list.forEach((m) => {
        if (m.sortOrder != null && typeof m.sortOrder === 'number' && m.sortOrder < min) min = m.sortOrder;
      });
      return min;
    };
    const orderA = minOrder(bySubCategory[a]);
    const orderB = minOrder(bySubCategory[b]);
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
  const sections = subCategoryNames.map((sub) => ({ subCategory: sub, list: bySubCategory[sub] }));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#EFF6FF', '#F8FAFC', '#F1F5FF']} locations={[0, 0.55, 1]} style={styles.gradientBg}>
      <View style={[styles.header, { width: contentWidth, alignSelf: 'center', paddingTop: headerPaddingTop }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backWrap} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Icon name="chevronLeft" size={24} color="#51A2FF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSub}>Choose a type</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { width: contentWidth, alignSelf: 'center' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {sections.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No minerals in this category.</Text>
          </View>
        ) : (
          <View style={[styles.gridWrap, { width: contentWidth, alignSelf: 'center' }]}>
            {sections.map(({ subCategory, list }) => {
              const disp = categoryDisplay[category];
              const sectionTitle =
                subCategory === 'General' ? disp?.displayName || getCategoryDisplayName(category) || category : subCategory;
              const tileUrl = resolveTileUrl(subCategory, sectionTitle, list, disp);
              return (
                <CategoryHeroTile
                  key={subCategory}
                  width={cardWidth}
                  imageUri={tileUrl}
                  label={sectionTitle}
                  onPress={() =>
                    navigation.navigate('SellSubCategory', {
                      category,
                      subCategory,
                      title: sectionTitle,
                      fromArtisanal,
                    })
                  }
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBg: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textMuted },
  header: {
    width: '100%',
    minHeight: 88,
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 35,
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  backWrap: { padding: 4, marginRight: 12 },
  headerTitleWrap: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2A44',
  },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  headerRight: { width: 32 },
  scroll: { flex: 1 },
  /** Match BuyCategoryPickScreen — no extra horizontal padding here (grid applies its own). */
  scrollContent: { paddingBottom: 48, paddingTop: 16 },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    rowGap: 16,
  },
  emptyWrap: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
