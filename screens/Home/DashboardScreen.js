import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  Linking,
  RefreshControl,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { getMe, getMarketInsights, getBanners, getUnreadNotificationCount, getBannerImageLayout } from '../../lib/services';
import { colors, fonts } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { useArtisanalCanAccess } from '../../lib/ArtisanalAccessContext';
import { useHeaderPaddingTop } from '../../lib/headerInsets';
import { normalizeRemoteImageUri } from '../../lib/remoteImageUri';

const ACCESS_BUTTON_GREEN = '#16A34A';
const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_TOP = Math.round(WINDOW_HEIGHT * 0.02); // 2% of screen height
const HEADER_BOTTOM = Math.round(WINDOW_HEIGHT * 0.02); // 2% of screen height

export default function DashboardScreen({ navigation }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const contentMaxWidth = Math.min(windowWidth, 420);
  const ctaRowGapBelowBanner = Math.round(windowHeight * 0.03); // 2% + 1% from prior layout
  const ctaRowMarginUp = Math.round(windowHeight * 0.03);
  // Buy/Sell row, Home banner 2, and Artisanal card share the same top offset
  const stackedSectionMarginTop = Math.max(0, ctaRowGapBelowBanner - ctaRowMarginUp);
  const sectionMarginDown1Pct = Math.round(windowHeight * 0.01);
  const { isAfrican } = useArtisanalCanAccess();
  const headerPaddingTop = useHeaderPaddingTop(HEADER_TOP);
  const [user, setUser] = useState(null);
  const [insights, setInsights] = useState([]);
  const [homeBanners, setHomeBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAccessRestrictedToast, setShowAccessRestrictedToast] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const homeBanner1Height = Math.round(((windowWidth - 32) * 195) / 358);
  const homeBanner2Height = Math.round(((windowWidth - 32) * 160) / 358);

  const onBuyPress = () => {
    if (isAfrican) {
      Alert.alert(
        'Buying not available',
        'Artisanal users are not allowed to buy minerals. You can sell minerals from the Sell tab.',
        [{ text: 'OK', onPress: () => navigation.getParent()?.navigate('Sell') }]
      );
      return;
    }
    navigation.getParent()?.navigate('Buy');
  };

  const refreshUnreadCount = useCallback(() => {
    getUnreadNotificationCount()
      .then(setUnreadNotificationCount)
      .catch(() => setUnreadNotificationCount(0));
  }, []);

  const loadDashboardData = useCallback((showLoader = true) => {
    if (showLoader) setLoading(true);
    Promise.all([
      getMe().catch(() => null),
      getMarketInsights().catch(() => []),
      getBanners('home').catch(() => []),
      getUnreadNotificationCount().catch(() => 0),
    ]).then(([userData, insightsData, bannersData, unread]) => {
      setUser(userData);
      setInsights(Array.isArray(insightsData) ? insightsData : []);
      setHomeBanners(Array.isArray(bannersData) ? bannersData : []);
      setUnreadNotificationCount(typeof unread === 'number' ? unread : 0);
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, []);

  useEffect(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  useFocusEffect(
    useCallback(() => {
      refreshUnreadCount();
      const interval = setInterval(refreshUnreadCount, 45000);
      return () => clearInterval(interval);
    }, [refreshUnreadCount])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData(false);
  }, [loadDashboardData]);

  const onArtisanalAccessPress = () => {
    if (isAfrican) {
      navigation.navigate('RegionEligible');
    } else {
      setShowAccessRestrictedToast(true);
    }
  };

  useEffect(() => {
    if (!showAccessRestrictedToast) return;
    const t = setTimeout(() => setShowAccessRestrictedToast(false), 4000);
    return () => clearTimeout(t);
  }, [showAccessRestrictedToast]);

  const hasMarketInsights = Array.isArray(insights) && insights.length > 0;
  const sortedHomeBanners = [...homeBanners].sort((a, b) => {
    const posA = Number.isFinite(Number(a?.position)) ? Number(a.position) : 999;
    const posB = Number.isFinite(Number(b?.position)) ? Number(b.position) : 999;
    if (posA !== posB) return posA - posB;
    const pageA = a?.targetPage === 'home' ? 0 : 1;
    const pageB = b?.targetPage === 'home' ? 0 : 1;
    return pageA - pageB;
  });
  const bannerForSlot = (slot) =>
    homeBanners.find((b) => b?.targetPage === 'home' && Number(b?.position) === slot)
    || homeBanners.find((b) => Number(b?.position) === slot)
    || sortedHomeBanners.find((b) => Number(b?.position) === slot)
    || null;
  const banner0 = bannerForSlot(0) || sortedHomeBanners[0] || null;
  const banner1 = bannerForSlot(1) || null;
  const banner0Layout = getBannerImageLayout(banner0);
  const banner1Layout = getBannerImageLayout(banner1);
  const hasBanner = !!banner0;
  const hasBanner1 = !!banner1;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screenWrap}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      {/* Header – Figma: #EFF6FF, 106px, rounded bottom 35px, pickaxe logo + Mineral Bridge only (no MEMBER DASHBOARD) */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <Image
                source={require('../../assets/icon-pickaxe.png')}
                style={[styles.logoIcon, styles.logoIconScale]}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Mineral Bridge</Text>
              <Text style={styles.headerSubtitle}>Trade Verified Minerals Worldwide</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
              <Icon name="notifications" size={22} color="#51A2FF" />
              {unreadNotificationCount > 0 ? (
                <View style={[styles.bellBadge, unreadNotificationCount > 9 && styles.bellBadgeWide]}>
                  <Text style={styles.bellBadgeText}>
                    {unreadNotificationCount > 99 ? '99+' : String(unreadNotificationCount)}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => navigation.getParent()?.navigate('Profile')}>
              <Text style={styles.avatarText}>{user?.name ? user.name.slice(0, 2).toUpperCase() : 'MB'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.main, { width: contentMaxWidth, alignSelf: 'center' }]}>
        {/* Home banner from dashboard (Content & Marketing). Fallback only when no dashboard banner exists. */}
        <View style={[styles.bannerWrap, { height: homeBanner1Height, marginBottom: 16 + sectionMarginDown1Pct }]}>
          {hasBanner && banner0.imageUrl ? (
            <ExpoImage
              source={{ uri: String(banner0.imageUrl) }}
              cachePolicy="memory-disk"
              style={styles.bannerImage}
              contentFit={banner0Layout.contentFit}
              contentPosition={banner0Layout.contentPosition}
              contentStyle={{ transform: banner0Layout.transform }}
              transition={120}
              onLoad={() => console.log('IMG_LOADED', banner0.imageUrl)}
              onError={(e) => console.log('IMG_ERROR', e, banner0.imageUrl)}
            />
          ) : null}
          {!hasBanner && <View style={styles.bannerOverlay} />}
          <View style={styles.bannerContent}>
            {hasBanner && !!banner0.sponsoredTag ? (
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredBadgeText}>{banner0.sponsoredTag}</Text>
              </View>
            ) : null}
            {!!(hasBanner ? banner0.title : '') && (
              <Text style={styles.bannerTitle}>{banner0.title}</Text>
            )}
            {!!(hasBanner ? (banner0.description || banner0.subtitle) : '') && (
              <Text style={styles.bannerSub}>
                {banner0.description || banner0.subtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Primary CTAs – 1st: blue shopping bag (Buy), 2nd: golden briefcase (Sell). Use assets/icon-buy.png & icon-sell.png when added. */}
        <View
          style={[
            styles.ctaRow,
            { marginTop: stackedSectionMarginTop, marginBottom: 12 + sectionMarginDown1Pct },
          ]}
        >
          <TouchableOpacity style={styles.ctaCard} onPress={onBuyPress} activeOpacity={0.9}>
            <View style={styles.ctaIconWrap}>
              <Icon name="cart" size={22} color="#1447E6" />
            </View>
            <Text style={styles.ctaTitle}>Buy Minerals</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaCard} onPress={() => navigation.getParent()?.navigate('Sell')}>
            <View style={styles.ctaIconWrap}>
              <Icon name="briefcase" size={22} color="#B48811" />
            </View>
            <Text style={styles.ctaTitle}>Sell Minerals</Text>
          </TouchableOpacity>
        </View>

        {/* Own Mining – 2nd Home banner from dashboard (Content & Marketing). Fallback only when no dashboard banner exists. */}
        <TouchableOpacity
          style={[
            styles.ctaCardWide,
            {
              marginTop: stackedSectionMarginTop,
              height: homeBanner2Height,
              marginBottom: 12 + sectionMarginDown1Pct,
            },
            hasBanner1 && styles.ownMiningWithImage,
          ]}
          onPress={() => {
            if (hasBanner1 && banner1.linkUrl) {
              Linking.openURL(banner1.linkUrl).catch(() => {});
            } else {
              // Open Mining tab and show Mining home screen (not artisanal steps/dashboard)
              navigation.getParent()?.navigate('Mining', { screen: 'ArtisanalHome' });
            }
          }}
          activeOpacity={0.9}
        >
          {hasBanner1 && banner1.imageUrl ? (
            <ExpoImage
              source={{ uri: String(banner1.imageUrl) }}
              cachePolicy="memory-disk"
              style={StyleSheet.absoluteFillObject}
              contentFit={banner1Layout.contentFit}
              contentPosition={banner1Layout.contentPosition}
              contentStyle={{ transform: banner1Layout.transform }}
              transition={120}
              onLoad={() => console.log('IMG_LOADED', banner1.imageUrl)}
              onError={(e) => console.log('IMG_ERROR', e, banner1.imageUrl)}
            />
          ) : null}
          {!hasBanner1 && <View style={styles.ownMiningOverlay} />}
          <View style={styles.ownMiningTextWrap}>
            <View style={styles.ownMiningTitleRow}>
              {!!(hasBanner1 ? banner1.title : '') && (
                <Text style={styles.ctaTitleWhite}>{banner1.title}</Text>
              )}
              {hasBanner1 && banner1.sponsoredTag ? (
                <View style={styles.ownMiningSponsoredBadge}>
                  <Text style={styles.ownMiningSponsoredText}>{banner1.sponsoredTag}</Text>
                </View>
              ) : null}
            </View>
            {!!(hasBanner1 ? (banner1.description || banner1.subtitle) : '') && (
              <Text style={styles.ctaSubWhite} numberOfLines={2}>
                {banner1.description || banner1.subtitle}
              </Text>
            )}
          </View>
          <View style={styles.ctaIconWrapDark}>
            <Icon name="pickaxe" size={28} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Artisanal Mining – only African (by phone) can access; non-African gets toast */}
        <TouchableOpacity
          style={[
            styles.artisanalCard,
            { marginTop: stackedSectionMarginTop, marginBottom: 16 + sectionMarginDown1Pct },
          ]}
          onPress={onArtisanalAccessPress}
        >
          <View style={styles.artisanalContent}>
            <View style={styles.artisanalIconWrap}>
              <Icon name="trendingUp" size={24} color="#15803D" />
            </View>
            <View style={styles.artisanalTextWrap}>
              <Text style={styles.artisanalTitle}>For Artisanal Miners</Text>
              <Text style={styles.artisanalSub}>Institutional access to safety training, equipments.</Text>
            </View>
            <View style={styles.accessButton}>
              <Text style={styles.accessButtonText}>Enter</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Market Insights – only when dashboard has added items; title + content */}
        {hasMarketInsights && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Market Insights</Text>
            <View style={styles.insightsCardWrap}>
              {insights.map((item, idx) => (
                <View key={item.id || idx} style={[styles.insightRow, idx === insights.length - 1 && styles.insightRowLast]}>
                  <View style={styles.insightTextWrap}>
                    <Text style={styles.insightTitle}>{item.label || item.title || 'Insight'}</Text>
                    {(item.content || item.body) ? (
                      <Text style={styles.insightContent} numberOfLines={3}>{item.content || item.body}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

      </View>
    </ScrollView>
    {/* Non-African toast: green bar at bottom (tab bar area), same color as Access button */}
    {showAccessRestrictedToast && (
      <View style={styles.accessRestrictedToast}>
        <Text style={styles.accessRestrictedToastText}>
          Artisanal Profile Allowed only for African Users.
        </Text>
      </View>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 48 },
  accessRestrictedToast: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: ACCESS_BUTTON_GREEN,
    paddingVertical: 14,
    paddingHorizontal: 20,
    paddingBottom: Math.max(14, 34),
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessRestrictedToastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    width: '100%',
    minHeight: 120,
    paddingHorizontal: 21,
    paddingBottom: HEADER_BOTTOM,
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10.5 },
  logoBox: {
    width: 35,
    height: 35,
    borderRadius: 14.5,
    backgroundColor: colors.white,
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
  logoIcon: { width: 21, height: 21 },
  logoIconScale: { transform: [{ scale: 0.96 }] },
  headerTitleWrap: { gap: 2 },
  headerTitle: {
    fontSize: 17.5,
    fontFamily: fonts.bold,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.4375,
    color: '#1F2A44',
  },
  headerSubtitle: {
    fontSize: 11,
    lineHeight: 14,
    color: '#4B5563',
    fontWeight: '500',
    maxWidth: 210,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellBtn: { position: 'relative', padding: 4 },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeWide: { paddingHorizontal: 4, minWidth: 22 },
  bellBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
  avatar: { width: 35, height: 35, borderRadius: 99999, backgroundColor: 'rgba(255,255,255,0.01)', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: 'rgba(0,0,0,0.1)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3, elevation: 2 },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#1F2A44' },
  main: { padding: 16, paddingTop: Math.round(WINDOW_HEIGHT * 0.02) }, // 2% top padding for first banner
  bannerWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#1F2A44',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  bannerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  bannerContent: { flex: 1, justifyContent: 'flex-end', padding: 16, paddingTop: 12 },
  sponsoredBadge: { alignSelf: 'flex-start', backgroundColor: colors.gold, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  sponsoredBadgeText: { fontSize: 10, fontWeight: '800', color: '#1F2A44' },
  bannerTitle: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: 4 },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  ctaCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIconWrap: {
    width: 50,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: '#1F2A44', textAlign: 'center' },
  ctaSub: { fontSize: 12, color: '#6A7282', marginTop: 4 },
  ctaCardWide: {
    backgroundColor: '#1F2A44',
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    overflow: 'hidden',
    elevation: 4,
  },
  ownMiningWithImage: { position: 'relative' },
  ownMiningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31,42,68,0.68)',
  },
  ctaIconWrapDark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  ownMiningTextWrap: { flex: 1, marginRight: 12, zIndex: 1 },
  ownMiningTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaTitleWhite: { fontSize: 18, fontWeight: '700', color: colors.white },
  ctaSubWhite: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  ownMiningSponsoredBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ownMiningSponsoredText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  artisanalCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  artisanalContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  artisanalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artisanalTextWrap: { flex: 1 },
  artisanalTitle: { fontSize: 14, fontWeight: '700', color: '#1F2A44' },
  artisanalSub: { fontSize: 12, color: '#6A7282', marginTop: 4 },
  accessButton: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  accessButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  section: { marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2A44', marginBottom: 12 },
  insightsCardWrap: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  insightRow: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  insightRowLast: { borderBottomWidth: 0 },
  insightTextWrap: { flex: 1 },
  insightTitle: { fontSize: 14, fontWeight: '600', color: '#1F2A44', marginBottom: 4 },
  insightContent: { fontSize: 12, color: '#6A7282', lineHeight: 18 },
});
