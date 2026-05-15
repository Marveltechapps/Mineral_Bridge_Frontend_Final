import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getMinerals,
  getBuyContent,
  getCategoryDisplayName,
  getBuySubCategoryTileImageUrl,
  getBuyCategoryTileImageUrl,
  getSectionHeaderImageForCategory,
  getCategoryGridTileWidth,
} from '../../lib/services';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { CategoryHeroTile } from '../../components/CategoryHeroTile';

function isPlaceholderImage(uri) {
  if (!uri || typeof uri !== 'string') return true;
  const u = uri.trim().toLowerCase();
  return u.includes('unsplash.com') || u.includes('placeholder');
}

export default function BuyCategoryPickScreen({ route, navigation }) {
  const { canonicalCat, sections } = route.params || {};
  const displayHeading = getCategoryDisplayName(canonicalCat) || canonicalCat || 'Category';
  const [minerals, setMinerals] = useState([]);
  const [buyContent, setBuyContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastBuyContentFetchAtRef = useRef(0);
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 420);
  const tileWidth = getCategoryGridTileWidth(contentWidth);

  const load = useCallback(() => {
    getMinerals({ forBuy: 1 })
      .then((data) => setMinerals(Array.isArray(data) ? data : []))
      .catch(() => setMinerals([]))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
    getBuyContent()
      .then((c) => {
        setBuyContent(c);
        lastBuyContentFetchAtRef.current = Date.now();
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refetch buyContent on focus so tile images reflect latest dashboard imports.
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (!lastBuyContentFetchAtRef.current || (now - lastBuyContentFetchAtRef.current > 30000)) {
        getBuyContent()
          .then((c) => {
            setBuyContent(c);
            lastBuyContentFetchAtRef.current = Date.now();
          })
          .catch(() => {});
      }
      return undefined;
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const resolveTileUrl = (category, subCategory, title, list, disp) => {
    const subRaw = subCategory != null ? String(subCategory).trim() : '';
    const titleRaw = title != null ? String(title).trim() : '';
    const effectiveLabel = subRaw && subRaw.toLowerCase() !== 'general' ? subRaw : titleRaw;

    // If backend sends empty subCategory for a tile (common for "Lithium" etc),
    // treat it like "General" so getBuySubCategoryTileImageUrl uses the section title label.
    const subKeyForLookup = effectiveLabel ? 'General' : subRaw || 'General';

    let url = getBuySubCategoryTileImageUrl(buyContent, canonicalCat, effectiveLabel || titleRaw, subKeyForLookup) || '';
    if ((!url || isPlaceholderImage(url)) && subRaw.toLowerCase() === 'general') {
      url = getBuyCategoryTileImageUrl(buyContent, canonicalCat) || '';
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
  };

  const categoryDisplay = buyContent?.categoryDisplay || {};

  if (loading) {
    return (
      <View style={[styles.centered, styles.screenRoot]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const sectionList = Array.isArray(sections) ? sections : [];

  return (
    <View style={styles.screenRoot}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backWrap} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="chevronLeft" size={24} color="#51A2FF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayHeading}
          </Text>
          <Text style={styles.headerSub}>Choose a type</Text>
        </View>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        <View style={[styles.gridWrap, { width: contentWidth, alignSelf: 'center' }]}>
          {sectionList.map(({ category, subCategory, title }) => {
            const key = `${category}-${subCategory}`;
            const catNorm = (category || '').trim().toLowerCase();
            const subRaw = subCategory != null ? String(subCategory).trim() : '';
            const titleRaw = title != null ? String(title).trim() : '';
            const effectiveSub = subRaw && subRaw.toLowerCase() !== 'general' ? subRaw : titleRaw;
            const subNorm = effectiveSub ? effectiveSub.toLowerCase() : 'general';
            const list = minerals.filter((m) => {
              const mCat = (m.category || '').trim().toLowerCase();
              const mSub = (m.subCategory && String(m.subCategory).trim())
                ? String(m.subCategory).trim().toLowerCase()
                : 'general';
              return mCat === catNorm && mSub === subNorm;
            });
            const disp =
              categoryDisplay?.[category] ||
              categoryDisplay?.[getCategoryDisplayName(category)] ||
              categoryDisplay?.[String(category || '').trim()] ||
              null;
            const uri = resolveTileUrl(category, subCategory, title, list, disp);
            return (
              <CategoryHeroTile
                key={key}
                width={tileWidth}
                imageUri={uri}
                label={title}
                onPress={() =>
                  navigation.navigate('BuySubCategory', {
                    category,
                    subCategory,
                    title,
                  })
                }
              />
            );
          })}
        </View>
        {sectionList.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No sub-categories for this group.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textMuted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backWrap: { padding: 4, marginRight: 8 },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2A44' },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  headerRight: { width: 36 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48, paddingTop: 16 },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    rowGap: 16,
  },
  emptyWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
