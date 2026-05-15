import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Icon } from '../../lib/icons';
import { getBanners, getBannerImageLayout } from '../../lib/services';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
import { navigationRef } from '../../navigation/navigationRef';
import { BANNER_CARD_BORDER, BANNER_CARD_SHADOW } from '../../lib/styles/bannerPresets';
import { normalizeRemoteImageUri } from '../../lib/remoteImageUri';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const CLOSE_BTN_UP_OFFSET = Math.round(WINDOW_HEIGHT * -0.06);
const DROPDOWN_BLUE = '#51A2FF';
const PROGRESS_BLUE = '#2B7FFF';

function getMinerTypeLabel(minerType) {
  if (!minerType) return 'Independent Miner';
  if (minerType === 'group') return 'Group Miners';
  return 'Independent Miner';
}

export default function ArtisanalDashboardScreen({ navigation, route }) {
  const { width: windowWidth } = useWindowDimensions();
  const isNarrowScreen = windowWidth < 360;
  const gridGap = isNarrowScreen ? 8 : 12;
  const gridHorizontalPad = isNarrowScreen ? 14 : 21;
  const gridTitleSize = isNarrowScreen ? 11 : 12;
  const gridSubtitleSize = isNarrowScreen ? 10 : 11;
  const [profile, setProfile] = useState(null);
  const [showProfileSuccess, setShowProfileSuccess] = useState(true);
  const showEmergencyAlert = route?.params?.showEmergencyAlert ?? false;
  const [showEmergencyToast, setShowEmergencyToast] = useState(showEmergencyAlert);
  const [artisanalBannerTop, setArtisanalBannerTop] = useState(null);
  const [artisanalBannerBottom, setArtisanalBannerBottom] = useState(null);

  useEffect(() => {
    getBanners('artisanal').then((banners) => {
      const list = Array.isArray(banners) ? banners : [];
      const byPos = list.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      setArtisanalBannerTop(byPos[0] ?? null);
      setArtisanalBannerBottom(byPos[1] ?? null);
    }).catch(() => {});
  }, []);

  const hasTopBanner = !!artisanalBannerTop;
  const hasBottomBanner = !!artisanalBannerBottom;
  const bannerTopImage = hasTopBanner
    ? artisanalBannerTop?.imageUrl
    : route?.params?.bannerTopImage ?? profile?.sustainabilityBannerImage ?? profile?.bannerTopImage;
  const bannerBottomImage = hasBottomBanner
    ? artisanalBannerBottom?.imageUrl
    : route?.params?.bannerBottomImage ?? profile?.liquidateBannerImage ?? profile?.bannerBottomImage;
  const topBannerSubtitle = artisanalBannerTop?.description || artisanalBannerTop?.subtitle || '';
  const bottomBannerSubtitle = artisanalBannerBottom?.description || artisanalBannerBottom?.subtitle || '';

  useEffect(() => {
    if (showEmergencyAlert) setShowEmergencyToast(true);
  }, [showEmergencyAlert]);

  useEffect(() => {
    if (showEmergencyToast) {
      const t = setTimeout(() => setShowEmergencyToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [showEmergencyToast]);

  useEffect(() => {
    let cancelled = false;
    fetchWithAuth('/api/artisanal/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setProfile(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowProfileSuccess(false), 3500);
    return () => clearTimeout(t);
  }, []);

  const minerTypeLabel = getMinerTypeLabel(profile?.minerType);
  const sellFlowButtonLabel = hasBottomBanner
    ? (artisanalBannerBottom?.buttonText || 'START INSTITUTIONAL SELL FLOW')
    : 'START INSTITUTIONAL SELL FLOW';
  const topBannerLayout = getBannerImageLayout(artisanalBannerTop);
  const bottomBannerLayout = getBannerImageLayout(artisanalBannerBottom);
  const bannerCardWidth = Math.max(1, windowWidth - 42);
  // Match Home banner 1 sizing (same height ratio) for Artisanal top banner.
  const topBannerHeight = Math.round((bannerCardWidth * 195) / 358);
  const bottomBannerHeight = Math.round((bannerCardWidth * 208) / 358);

  const onStartSellFlow = () => {
    navigation.goBack();
    if (navigationRef.isReady()) {
      navigationRef.navigate('Main', {
        screen: 'Sell',
        params: { fromArtisanal: true },
      });
    }
  };

  const onCloseToHome = () => {
    navigation.goBack();
    if (navigationRef.isReady()) {
      navigationRef.navigate('Main', { screen: 'Home' });
    }
  };

  return (
    <View style={styles.wrapper}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconBox}>
              <Icon name="people" size={20} color={colors.primary} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>My Verified ASM Site</Text>
              <Text style={styles.headerSubtitle}>{minerTypeLabel} - trusted trade enabled</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnHover]}
            onPress={onCloseToHome}
          >
            <Icon name="close" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.bannerCard, { height: topBannerHeight }]}>
        <View style={styles.bannerContent}>
          {bannerTopImage ? (
            <View style={styles.bannerBgImage}>
              <ExpoImage
                source={{
                  uri: typeof bannerTopImage === 'string'
                    ? String(bannerTopImage)
                    : String(bannerTopImage?.uri),
                }}
                cachePolicy="memory-disk"
                style={[styles.bannerBgImage, styles.bannerBgImageStyle]}
                contentFit={topBannerLayout.contentFit}
                contentPosition={topBannerLayout.contentPosition}
                contentStyle={{ transform: topBannerLayout.transform }}
                transition={120}
                onLoad={() => console.log('IMG_LOADED', typeof bannerTopImage === 'string' ? bannerTopImage : bannerTopImage?.uri)}
                onError={(e) => console.log('IMG_ERROR', e, typeof bannerTopImage === 'string' ? bannerTopImage : bannerTopImage?.uri)}
              />
              <View style={styles.bannerOverlay} />
              <View style={styles.bannerInner}>
          <View style={styles.bannerTagRow}>
            {(hasTopBanner ? !!artisanalBannerTop?.sponsoredTag : true) && (
              <View style={styles.bannerTag}>
                <Text style={styles.bannerTagText}>{hasTopBanner ? artisanalBannerTop.sponsoredTag : 'SUSTAINABILITY INITIATIVE'}</Text>
              </View>
            )}
            {!hasTopBanner && (
              <View style={styles.marketBanner}>
                <Text style={styles.marketBannerText}>MARKET ACTIVE</Text>
              </View>
            )}
          </View>
          {!!(hasTopBanner ? artisanalBannerTop?.title : 'Empowering Small Scale Miners') && (
            <Text style={styles.bannerTitle}>{hasTopBanner ? artisanalBannerTop.title : 'Empowering Small Scale Miners'}</Text>
          )}
          {!!(hasTopBanner ? artisanalBannerTop?.subtitle : 'through Fair Trade') && (
            <Text style={styles.bannerTitle2}>{hasTopBanner ? artisanalBannerTop.subtitle : 'through Fair Trade'}</Text>
          )}
          {!!(hasTopBanner ? topBannerSubtitle : 'GLOBAL SUPPORT • DIRECT MARKET ACCESS') && (
            <Text style={styles.bannerSubtitle}>{hasTopBanner ? topBannerSubtitle : 'GLOBAL SUPPORT • DIRECT MARKET ACCESS'}</Text>
          )}
              </View>
            </View>
          ) : (
            <View style={[styles.bannerInner, styles.bannerInnerNoImage]}>
          <View style={styles.bannerTagRow}>
            {(hasTopBanner ? !!artisanalBannerTop?.sponsoredTag : true) && (
              <View style={styles.bannerTag}>
                <Text style={styles.bannerTagText}>{hasTopBanner ? artisanalBannerTop.sponsoredTag : 'SUSTAINABILITY INITIATIVE'}</Text>
              </View>
            )}
            {!hasTopBanner && (
              <View style={styles.marketBanner}>
                <Text style={styles.marketBannerText}>MARKET ACTIVE</Text>
              </View>
            )}
          </View>
          {!!(hasTopBanner ? artisanalBannerTop?.title : 'Empowering Small Scale Miners') && (
            <Text style={styles.bannerTitle}>{hasTopBanner ? artisanalBannerTop.title : 'Empowering Small Scale Miners'}</Text>
          )}
          {!!(hasTopBanner ? artisanalBannerTop?.subtitle : 'through Fair Trade') && (
            <Text style={styles.bannerTitle2}>{hasTopBanner ? artisanalBannerTop.subtitle : 'through Fair Trade'}</Text>
          )}
          {!!(hasTopBanner ? topBannerSubtitle : 'GLOBAL SUPPORT • DIRECT MARKET ACCESS') && (
            <Text style={styles.bannerSubtitle}>{hasTopBanner ? topBannerSubtitle : 'GLOBAL SUPPORT • DIRECT MARKET ACCESS'}</Text>
          )}
            </View>
          )}
        </View>
      </View>

      <View style={[styles.gridRow, { gap: gridGap, paddingHorizontal: gridHorizontalPad }]}>
        <Pressable
          style={styles.gridCard}
          onPress={() => navigation.navigate('SafetyTraining')}
        >
          <View style={[styles.gridIconWrap, { backgroundColor: '#DBEAFE' }]}>
            <Icon name="construct" size={32} color="#155DFC" />
          </View>
          <Text style={[styles.gridCardTitle, { fontSize: gridTitleSize, lineHeight: gridTitleSize + 4 }]}>SAFETY & TRAINING</Text>
            <Text style={[styles.gridCardSubtitle, { fontSize: gridSubtitleSize, lineHeight: gridSubtitleSize + 4 }]}>Build verified safety compliance</Text>
        </Pressable>
        <Pressable
          style={styles.gridCard}
          onPress={() => navigation.navigate('InstitutionalAssets')}
        >
          <View style={[styles.gridIconWrap, { backgroundColor: '#DBEAFE' }]}>
            <Icon name="pickaxe" size={32} color="#155DFC" />
          </View>
          <Text style={[styles.gridCardTitle, { fontSize: gridTitleSize, lineHeight: gridTitleSize + 4 }]}>INSTITUTIONAL ASSETS</Text>
            <Text style={[styles.gridCardSubtitle, { fontSize: gridSubtitleSize, lineHeight: gridSubtitleSize + 4 }]}>Request assets through verified channels</Text>
        </Pressable>
      </View>
      <View style={[styles.gridRow, { gap: gridGap, paddingHorizontal: gridHorizontalPad }]}>
        <Pressable
          style={styles.gridCard}
          onPress={() => navigation.navigate('FairTradeProof')}
        >
          <View style={[styles.gridIconWrap, { backgroundColor: '#D1FAE5' }]}>
            <Icon name="checkCircle" size={32} color="#009966" />
          </View>
          <Text style={[styles.gridCardTitle, { fontSize: gridTitleSize, lineHeight: gridTitleSize + 4 }]}>FAIR TRADE PROOF</Text>
            <Text style={[styles.gridCardSubtitle, { fontSize: gridSubtitleSize, lineHeight: gridSubtitleSize + 4 }]}>Prove traceability and fair trade</Text>
        </Pressable>
        <Pressable
          style={styles.gridCard}
          onPress={() => navigation.navigate('EmergencyResponse')}
        >
          <View style={[styles.gridIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="warning" size={32} color="#E7000B" />
          </View>
          <Text style={[styles.gridCardTitle, { fontSize: gridTitleSize, lineHeight: gridTitleSize + 4 }]}>EMERGENCY RESPONSE</Text>
            <Text style={[styles.gridCardSubtitle, { fontSize: gridSubtitleSize, lineHeight: gridSubtitleSize + 4 }]}>Report incidents for rapid response</Text>
        </Pressable>
      </View>

      <View style={styles.liquidateSection}>
        <View style={[styles.liquidateBanner, { height: bottomBannerHeight }]}>
          <View style={styles.liquidateBannerContent}>
            {bannerBottomImage ? (
              <View style={[styles.bannerBgImage, styles.liquidateBgImage]}>
                <ExpoImage
                  source={{
                    uri: typeof bannerBottomImage === 'string'
                      ? String(bannerBottomImage)
                      : String(bannerBottomImage?.uri),
                  }}
                  cachePolicy="memory-disk"
                  style={[styles.bannerBgImage, styles.bannerBgImageStyle, styles.liquidateBgImage]}
                  contentFit={bottomBannerLayout.contentFit}
                  contentPosition={bottomBannerLayout.contentPosition}
                  contentStyle={{ transform: bottomBannerLayout.transform }}
                  transition={120}
                  onLoad={() => console.log('IMG_LOADED', typeof bannerBottomImage === 'string' ? bannerBottomImage : bannerBottomImage?.uri)}
                  onError={(e) => console.log('IMG_ERROR', e, typeof bannerBottomImage === 'string' ? bannerBottomImage : bannerBottomImage?.uri)}
                />
                <View style={styles.bannerOverlay} />
                <View style={styles.liquidateInner}>
                  <View style={styles.liquidateTagRow}>
                    {(hasBottomBanner ? !!artisanalBannerBottom?.sponsoredTag : true) && (
                      <View style={styles.marketBanner}>
                        <Text style={styles.marketBannerText}>{hasBottomBanner ? artisanalBannerBottom.sponsoredTag : 'MARKET ACTIVE'}</Text>
                      </View>
                    )}
                  </View>
                  {!!(hasBottomBanner ? artisanalBannerBottom?.title : 'Liquidate Inventory') && (
                    <Text style={styles.liquidateTitle}>{hasBottomBanner ? artisanalBannerBottom.title : 'Liquidate Inventory'}</Text>
                  )}
                  {!!(hasBottomBanner ? bottomBannerSubtitle : 'INSTITUTIONAL ASSISTED TRADE WITH GPS VALIDATION.') && (
                    <Text style={styles.liquidateSubtitle}>{hasBottomBanner ? bottomBannerSubtitle : 'INSTITUTIONAL ASSISTED TRADE WITH GPS VALIDATION.'}</Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={[styles.liquidateInner, styles.bannerInnerNoImage]}>
                <View style={styles.liquidateTagRow}>
                  {(hasBottomBanner ? !!artisanalBannerBottom?.sponsoredTag : true) && (
                    <View style={styles.marketBanner}>
                      <Text style={styles.marketBannerText}>{hasBottomBanner ? artisanalBannerBottom.sponsoredTag : 'MARKET ACTIVE'}</Text>
                    </View>
                  )}
                </View>
                {!!(hasBottomBanner ? artisanalBannerBottom?.title : 'Liquidate Inventory') && (
                  <Text style={styles.liquidateTitle}>{hasBottomBanner ? artisanalBannerBottom.title : 'Liquidate Inventory'}</Text>
                )}
                {!!(hasBottomBanner ? bottomBannerSubtitle : 'INSTITUTIONAL ASSISTED TRADE WITH GPS VALIDATION.') && (
                  <Text style={styles.liquidateSubtitle}>{hasBottomBanner ? bottomBannerSubtitle : 'INSTITUTIONAL ASSISTED TRADE WITH GPS VALIDATION.'}</Text>
                )}
              </View>
            )}
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.liquidateSellBtn, pressed && styles.liquidateSellBtnPressed]}
          onPress={onStartSellFlow}
        >
          <Text style={styles.liquidateSellBtnText}>{sellFlowButtonLabel}</Text>
          <Icon name="chevronRight" size={20} color={colors.white} />
        </Pressable>
      </View>
    </ScrollView>
      {showProfileSuccess && (
        <View style={styles.profileToast}>
          <Icon name="checkCircle" size={22} color={DROPDOWN_BLUE} />
          <Text style={styles.profileToastText}>Profile activated. You can now trade through verified institutional channels.</Text>
        </View>
      )}
      {showEmergencyToast && (
        <View style={styles.emergencyToast}>
          <Icon name="checkCircle" size={22} color="#15803D" />
          <View style={styles.emergencyToastTextWrap}>
            <Text style={styles.emergencyToastLine1}>Institutional Emergency Alert Sent</Text>
            <Text style={styles.emergencyToastLine2}>Response teams and regional chiefs have been notified</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  profileToast: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    paddingHorizontal: 21,
    borderTopWidth: 1.25,
    borderTopColor: '#DBEAFE',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  profileToastText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  emergencyToast: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    paddingHorizontal: 21,
    borderTopWidth: 1.25,
    borderTopColor: '#DBEAFE',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  emergencyToastTextWrap: { flex: 1 },
  emergencyToastLine1: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  emergencyToastLine2: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 90 },
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnHover: {
    backgroundColor: 'rgba(81, 162, 255, 0.25)',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: CLOSE_BTN_UP_OFFSET,
  },
  closeBtnHover: {
    backgroundColor: 'rgba(81, 162, 255, 0.25)',
  },
  headerTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4, color: colors.primary },
  headerSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  bannerCard: {
    marginHorizontal: 21,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    ...BANNER_CARD_BORDER,
    ...BANNER_CARD_SHADOW,
  },
  bannerContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerBgImage: {
    width: '100%',
    height: '100%',
  },
  bannerBgImageStyle: { borderRadius: 16 },
  liquidateBgImage: { height: '100%' },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  bannerInner: {
    flex: 1,
    padding: 16,
    paddingTop: 14,
    justifyContent: 'flex-end',
  },
  bannerInnerNoImage: {
    backgroundColor: colors.primary,
  },
  bannerTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  bannerTag: {
    backgroundColor: colors.gold,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bannerTagText: { fontSize: 9, fontWeight: '900', color: '#000000', letterSpacing: 1 },
  marketBanner: {
    backgroundColor: colors.gold,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  marketBannerText: { fontSize: 9, fontWeight: '900', color: '#000000', letterSpacing: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '900', color: colors.white, lineHeight: 20 },
  bannerTitle2: { fontSize: 16, fontWeight: '900', color: colors.white, lineHeight: 20 },
  bannerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    letterSpacing: 1,
  },
  gridRow: { flexDirection: 'row', paddingHorizontal: 21, marginTop: 21 },
  gridCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  gridIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.3,
    width: '100%',
  },
  gridCardSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  liquidateSection: {
    marginHorizontal: 21,
    marginTop: 21,
    marginBottom: 24,
  },
  liquidateBanner: {
    borderRadius: 14,
    overflow: 'hidden',
    ...BANNER_CARD_BORDER,
    ...BANNER_CARD_SHADOW,
  },
  liquidateBannerContent: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden',
  },
  liquidateInner: {
    flex: 1,
    padding: 28,
    justifyContent: 'flex-end',
  },
  liquidateTagRow: { flexDirection: 'row', marginBottom: 12 },
  liquidateTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  liquidateSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    letterSpacing: 1,
  },
  liquidateSellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    alignSelf: 'stretch',
  },
  liquidateSellBtnPressed: { opacity: 0.9 },
  liquidateSellBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
});
