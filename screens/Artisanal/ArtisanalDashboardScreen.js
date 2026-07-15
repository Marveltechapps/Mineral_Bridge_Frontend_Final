import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Icon } from '../../lib/icons';
import { getBanners, getBannerImageLayout } from '../../lib/services';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
import { navigationRef } from '../../navigation/navigationRef';
import { BANNER_CARD_BORDER, BANNER_CARD_SHADOW } from '../../lib/styles/bannerPresets';
import { useHeaderPaddingTop } from '../../lib/headerInsets';

/** Equal to card side margins — used for body padding and gaps */
const SECTION_GAP = 21;
const DROPDOWN_BLUE = '#51A2FF';
const PROFILE_TOAST_VISIBLE_MS = 3200;
const PROFILE_TOAST_ANIM_MS = 420;

function getMinerTypeLabel(minerType) {
  if (!minerType) return 'Independent Miner';
  if (minerType === 'group') return 'Group Miners';
  return 'Independent Miner';
}

export default function ArtisanalDashboardScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = useHeaderPaddingTop(12);
  const { width: windowWidth } = useWindowDimensions();
  const isNarrowScreen = windowWidth < 360;
  const gridGap = isNarrowScreen ? 8 : 12;
  const gridTitleSize = isNarrowScreen ? 11 : 12;
  const gridSubtitleSize = isNarrowScreen ? 10 : 11;
  const [profile, setProfile] = useState(null);
  /** Shown only when Step 7 navigates here with profileJustActivated */
  const [showProfileSuccess, setShowProfileSuccess] = useState(false);
  const profileToastAnim = useRef(new Animated.Value(0)).current;
  const showEmergencyAlert = route?.params?.showEmergencyAlert ?? false;
  const [showEmergencyToast, setShowEmergencyToast] = useState(showEmergencyAlert);
  const [artisanalBannerTop, setArtisanalBannerTop] = useState(null);
  const [artisanalBannerBottom, setArtisanalBannerBottom] = useState(null);

  useEffect(() => {
    getBanners('artisanal')
      .then((banners) => {
        const list = Array.isArray(banners) ? banners : [];
        const byPos = list.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        setArtisanalBannerTop(byPos[0] ?? null);
        setArtisanalBannerBottom(byPos[1] ?? null);
      })
      .catch(() => {});
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
    return () => {
      cancelled = true;
    };
  }, []);

  /** Profile activated toast: once after first-time flow, with smooth slide/fade */
  useEffect(() => {
    if (route?.params?.profileJustActivated !== true) return undefined;

    let cancelled = false;
    let exitTimer;
    setShowProfileSuccess(true);
    profileToastAnim.setValue(0);

    const enter = Animated.timing(profileToastAnim, {
      toValue: 1,
      duration: PROFILE_TOAST_ANIM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    enter.start(() => {
      if (cancelled) return;
      exitTimer = setTimeout(() => {
        Animated.timing(profileToastAnim, {
          toValue: 0,
          duration: PROFILE_TOAST_ANIM_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished || cancelled) return;
          setShowProfileSuccess(false);
          // Clear one-shot after dismiss so reopen does not show again
          navigation.setParams?.({ profileJustActivated: undefined });
        });
      }, PROFILE_TOAST_VISIBLE_MS);
    });

    return () => {
      cancelled = true;
      enter.stop();
      if (exitTimer) clearTimeout(exitTimer);
      profileToastAnim.stopAnimation();
    };
  }, [route?.params?.profileJustActivated, navigation, profileToastAnim]);

  const minerTypeLabel = getMinerTypeLabel(profile?.minerType);
  const sellFlowButtonLabel = hasBottomBanner
    ? artisanalBannerBottom?.buttonText || 'START INSTITUTIONAL SELL FLOW'
    : 'START INSTITUTIONAL SELL FLOW';
  const topBannerLayout = getBannerImageLayout(artisanalBannerTop);
  const bottomBannerLayout = getBannerImageLayout(artisanalBannerBottom);
  const bannerCardWidth = Math.max(1, windowWidth - SECTION_GAP * 2);
  const topBannerHeight = Math.round((bannerCardWidth * 195) / 358);
  /** Sell image card stays in the scrollable body (same inset/gap as other cards) */
  const sellBannerHeight = Math.round((bannerCardWidth * 160) / 358);
  const footerPadBottom = Math.max(insets.bottom, SECTION_GAP);

  const onStartSellFlow = () => {
    navigation.goBack();
    if (navigationRef.isReady()) {
      navigationRef.navigate('Main', {
        screen: 'Sell',
        params: { fromArtisanal: true },
      });
    }
  };

  const renderTopBannerOverlay = () => (
    <>
      <View style={styles.bannerTagRow}>
        {(hasTopBanner ? !!artisanalBannerTop?.sponsoredTag : true) && (
          <View style={styles.bannerTag}>
            <Text style={styles.bannerTagText}>
              {hasTopBanner ? artisanalBannerTop.sponsoredTag : 'SUSTAINABILITY INITIATIVE'}
            </Text>
          </View>
        )}
        {!hasTopBanner && (
          <View style={styles.marketBanner}>
            <Text style={styles.marketBannerText}>MARKET ACTIVE</Text>
          </View>
        )}
      </View>
      {!!(hasTopBanner ? artisanalBannerTop?.title : 'Empowering Small Scale Miners') && (
        <Text style={styles.bannerTitle}>
          {hasTopBanner ? artisanalBannerTop.title : 'Empowering Small Scale Miners'}
        </Text>
      )}
      {!!(hasTopBanner ? artisanalBannerTop?.subtitle : 'through Fair Trade') && (
        <Text style={styles.bannerTitle2}>
          {hasTopBanner ? artisanalBannerTop.subtitle : 'through Fair Trade'}
        </Text>
      )}
      {!!(hasTopBanner ? topBannerSubtitle : 'GLOBAL SUPPORT • DIRECT MARKET ACCESS') && (
        <Text style={styles.bannerSubtitle}>
          {hasTopBanner ? topBannerSubtitle : 'GLOBAL SUPPORT • DIRECT MARKET ACCESS'}
        </Text>
      )}
    </>
  );

  const renderSellBannerOverlay = () => (
    <>
      <View style={styles.bannerTagRow}>
        {(hasBottomBanner ? !!artisanalBannerBottom?.sponsoredTag : true) && (
          <View style={styles.marketBanner}>
            <Text style={styles.marketBannerText}>
              {hasBottomBanner ? artisanalBannerBottom.sponsoredTag : 'MARKET ACTIVE'}
            </Text>
          </View>
        )}
      </View>
      {!!(hasBottomBanner ? artisanalBannerBottom?.title : 'Sell — Minerals') && (
        <Text style={styles.liquidateTitle} numberOfLines={2}>
          {hasBottomBanner ? artisanalBannerBottom.title : 'Sell — Minerals'}
        </Text>
      )}
      {!!(hasBottomBanner ? bottomBannerSubtitle : sellFlowButtonLabel) && (
        <Text style={styles.liquidateSubtitle} numberOfLines={1}>
          {hasBottomBanner ? bottomBannerSubtitle : sellFlowButtonLabel}
        </Text>
      )}
    </>
  );

  return (
    <View style={styles.wrapper}>
      {/* 1) Static header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
        </View>
      </View>

      {/* 2) Scrollable body — lives in remaining space between header & footer */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={[styles.cardShell, { height: topBannerHeight }]}>
          <View style={styles.bannerFill}>
            {bannerTopImage ? (
              <>
                <ExpoImage
                  source={{
                    uri:
                      typeof bannerTopImage === 'string'
                        ? String(bannerTopImage)
                        : String(bannerTopImage?.uri),
                  }}
                  cachePolicy="memory-disk"
                  style={StyleSheet.absoluteFill}
                  contentFit={topBannerLayout.contentFit}
                  contentPosition={topBannerLayout.contentPosition}
                  contentStyle={{ transform: topBannerLayout.transform }}
                  transition={120}
                />
                <View style={styles.bannerInner}>{renderTopBannerOverlay()}</View>
              </>
            ) : (
              <View style={[styles.bannerInner, styles.bannerInnerNoImage]}>
                {renderTopBannerOverlay()}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.gridRow, { gap: gridGap }]}>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('SafetyTraining')}>
            <View style={[styles.gridIconWrap, { backgroundColor: '#DBEAFE' }]}>
              <Icon name="construct" size={32} color="#155DFC" />
            </View>
            <Text style={[styles.gridCardTitle, { fontSize: gridTitleSize, lineHeight: gridTitleSize + 4 }]}>
              SAFETY & TRAINING
            </Text>
            <Text style={[styles.gridCardSubtitle, { fontSize: gridSubtitleSize, lineHeight: gridSubtitleSize + 4 }]}>
              Build verified safety compliance
            </Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('InstitutionalAssets')}>
            <View style={[styles.gridIconWrap, { backgroundColor: '#DBEAFE' }]}>
              <Icon name="pickaxe" size={32} color="#155DFC" />
            </View>
            <Text style={[styles.gridCardTitle, { fontSize: gridTitleSize, lineHeight: gridTitleSize + 4 }]}>
              INSTITUTIONAL ASSETS
            </Text>
            <Text style={[styles.gridCardSubtitle, { fontSize: gridSubtitleSize, lineHeight: gridSubtitleSize + 4 }]}>
              Request assets through verified channels
            </Text>
          </Pressable>
        </View>

        <View style={[styles.gridRow, { gap: gridGap }]}>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('FairTradeProof')}>
            <View style={[styles.gridIconWrap, { backgroundColor: '#D1FAE5' }]}>
              <Icon name="checkCircle" size={32} color="#009966" />
            </View>
            <Text style={[styles.gridCardTitle, { fontSize: gridTitleSize, lineHeight: gridTitleSize + 4 }]}>
              FAIR TRADE PROOF
            </Text>
            <Text style={[styles.gridCardSubtitle, { fontSize: gridSubtitleSize, lineHeight: gridSubtitleSize + 4 }]}>
              Prove traceability and fair trade
            </Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('EmergencyResponse')}>
            <View style={[styles.gridIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="warning" size={32} color="#E7000B" />
            </View>
            <Text style={[styles.gridCardTitle, { fontSize: gridTitleSize, lineHeight: gridTitleSize + 4 }]}>
              EMERGENCY RESPONSE
            </Text>
            <Text style={[styles.gridCardSubtitle, { fontSize: gridSubtitleSize, lineHeight: gridSubtitleSize + 4 }]}>
              Report incidents for rapid response
            </Text>
          </Pressable>
        </View>

        {/* Sell image card — scrolls with the other body cards */}
        <View style={[styles.cardShell, { height: sellBannerHeight }]}>
          <View style={styles.bannerFill}>
            {bannerBottomImage ? (
              <>
                <ExpoImage
                  source={{
                    uri:
                      typeof bannerBottomImage === 'string'
                        ? String(bannerBottomImage)
                        : String(bannerBottomImage?.uri),
                  }}
                  cachePolicy="memory-disk"
                  style={StyleSheet.absoluteFill}
                  contentFit={bottomBannerLayout.contentFit}
                  contentPosition={bottomBannerLayout.contentPosition}
                  contentStyle={{ transform: bottomBannerLayout.transform }}
                  transition={120}
                />
                <View style={[styles.bannerInner, styles.sellBannerInner]}>{renderSellBannerOverlay()}</View>
              </>
            ) : (
              <View style={[styles.bannerInner, styles.bannerInnerNoImage, styles.sellBannerInner]}>
                {renderSellBannerOverlay()}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Static bottom — sell button only (not the image card) */}
      <View style={[styles.sellFooter, { paddingBottom: footerPadBottom }]}>
        <Pressable
          style={({ pressed }) => [styles.sellBtn, pressed && styles.pressed]}
          onPress={onStartSellFlow}
          accessibilityRole="button"
          accessibilityLabel={sellFlowButtonLabel}
        >
          <Text style={styles.sellBtnText}>{sellFlowButtonLabel}</Text>
          <Icon name="chevronRight" size={20} color={colors.white} />
        </Pressable>
      </View>

      {showProfileSuccess && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: 72 + footerPadBottom,
              opacity: profileToastAnim,
              transform: [
                {
                  translateY: profileToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Icon name="checkCircle" size={22} color={DROPDOWN_BLUE} />
          <Text style={styles.toastText}>
            Profile activated. You can now trade through verified institutional channels.
          </Text>
        </Animated.View>
      )}
      {showEmergencyToast && (
        <View style={[styles.toast, { bottom: 72 + footerPadBottom }]}>
          <Icon name="checkCircle" size={22} color="#15803D" />
          <View style={styles.toastTextWrap}>
            <Text style={styles.toastTitle}>Institutional Emergency Alert Sent</Text>
            <Text style={styles.toastSub}>Response teams and regional chiefs have been notified</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1.25,
    borderBottomColor: '#DBEAFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    paddingBottom: 20,
    paddingHorizontal: SECTION_GAP,
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bodyContent: {
    flexGrow: 1,
    paddingTop: SECTION_GAP,
    paddingBottom: SECTION_GAP,
    paddingHorizontal: SECTION_GAP,
    gap: SECTION_GAP,
  },
  cardShell: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    ...BANNER_CARD_BORDER,
    ...BANNER_CARD_SHADOW,
  },
  bannerFill: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
  },
  bannerInner: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'flex-end',
  },
  sellBannerInner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerInnerNoImage: {
    backgroundColor: colors.primary,
  },
  bannerTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  bannerTag: {
    backgroundColor: colors.gold,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bannerTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  marketBanner: {
    backgroundColor: colors.gold,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  marketBannerText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 20,
  },
  bannerTitle2: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 20,
  },
  bannerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    letterSpacing: 1,
  },
  liquidateTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  liquidateSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: 'row',
  },
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
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.3,
    width: '100%',
  },
  gridCardSubtitle: {
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  sellFooter: {
    paddingTop: SECTION_GAP,
    paddingHorizontal: SECTION_GAP,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignSelf: 'stretch',
  },
  sellBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  pressed: { opacity: 0.92 },
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    paddingHorizontal: SECTION_GAP,
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
  toastText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  toastTextWrap: { flex: 1 },
  toastTitle: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  toastSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
