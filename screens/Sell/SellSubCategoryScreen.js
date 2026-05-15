/**
 * Shows minerals for a single sub-category when selling (e.g. Precious Metals → Gold → Gold related items).
 * Navigate here when user taps a section like "Gold" on the Sell screen.
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { getMinerals } from '../../lib/services';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';
import { formatAvailability } from '../../lib/mineralDisplay';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { mergeMineralWithDetails } from '../../data/minerals';
import { CategoryHeroTile } from '../../components/CategoryHeroTile';

const DEFAULT_MINERAL_IMAGE =
  'https://images.unsplash.com/photo-1624365169364-0640dd10e180?w=400';

export default function SellSubCategoryScreen({ route, navigation }) {
  const { category, subCategory, title, sectionImageUrl, fromArtisanal } = route.params || {};
  const displayTitle = title || subCategory || category || 'Minerals';
  const [minerals, setMinerals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const cardWidth = (width - 48) / 2 - 8;

  const loadMinerals = useCallback(() => {
    getMinerals({ forSell: 1 })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const catNorm = (category || '').trim().toLowerCase();
        const subNorm = (subCategory || '').trim().toLowerCase();
        const filtered = list.filter((m) => {
          const mCat = (m.category || '').trim().toLowerCase();
          const mSub =
            m.subCategory && String(m.subCategory).trim()
              ? String(m.subCategory).trim().toLowerCase()
              : 'general';
          const catMatch = !catNorm || mCat === catNorm;
          const subMatch = !subNorm || mSub === subNorm;
          return catMatch && subMatch;
        });
        setMinerals(filtered);
      })
      .catch(() => setMinerals([]))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [category, subCategory]);

  // When returning from dashboard/admin, ensure cards reflect latest availableQuantity.
  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      loadMinerals();
      return undefined;
    }, [loadMinerals]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMinerals();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#EFF6FF', '#F8FAFC', '#F1F5FF']}
      locations={[0, 0.55, 1]}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backWrap} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="chevronLeft" size={24} color="#51A2FF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.headerSub}>
            {minerals.length} mineral{minerals.length !== 1 ? 's' : ''}
          </Text>
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
        {minerals.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No minerals in this category.</Text>
          </View>
        ) : (
          <View style={styles.row}>
            {minerals.map((m) => {
              const raw = m?.image || m?.imageUrl;
              const uri = raw || DEFAULT_MINERAL_IMAGE;
              return (
                <CategoryHeroTile
                  key={m.id || m._id}
                  width={cardWidth}
                  imageUri={uri}
                  label={m.name}
                  subtitle={formatAvailability(m)}
                  skipPlaceholderDetection={!raw}
                  onPress={() =>
                    navigation.navigate('SellIntro', {
                      mineral: mergeMineralWithDetails(m),
                      category: category || m.category,
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
  container: { flex: 1 },
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 16 },
  emptyWrap: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
