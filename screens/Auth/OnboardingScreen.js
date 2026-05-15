import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { colors } from '../../lib/theme';
import { getBanners, getBannerImageLayout } from '../../lib/services';
import { normalizeRemoteImageUri } from '../../lib/remoteImageUri';

/** Top image band height (simple split — not full-bleed). */
const IMAGE_HEIGHT_RATIO = 0.55;

const EMPTY_SLIDES = Array.from({ length: 3 }, (_, i) => ({
  title: '',
  description: '',
  showSkip: i < 2,
  imageUrl: null,
}));

export default function OnboardingScreen({ onComplete, onSkip }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    getBanners('onboarding')
      .then((banners) => {
        if (cancelled) return;
        if (!Array.isArray(banners) || banners.length === 0) {
          setSlides([]);
          setLoadError('Unable to load onboarding content right now.');
          return;
        }
        const byTargetPage = new Map(
          banners
            .filter((b) => b && typeof b === 'object')
            .map((b) => [String(b.targetPage || ''), b])
        );
        const byPosition = banners
          .filter((b) => b?.imageUrl)
          .slice()
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const next = [];
        for (let i = 0; i < 3; i++) {
          const b =
            byTargetPage.get(`onboarding_${i + 1}`) ??
            byPosition.find((x) => (x.position ?? 0) === i) ??
            byPosition[i];
          if (!b?.imageUrl) continue;
          next.push({
            title: typeof b.title === 'string' ? b.title : '',
            description:
              typeof b.subtitle === 'string'
                ? b.subtitle
                : typeof b.description === 'string'
                  ? b.description
                  : '',
            showSkip: i < 2,
            imageUrl: String(b.imageUrl),
            fitMode: b.fitMode,
            offsetX: b.offsetX,
            offsetY: b.offsetY,
            zoom: b.zoom,
          });
        }
        setSlides(next);
        if (next.length === 0) {
          setLoadError('Unable to load onboarding content right now.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlides([]);
          setLoadError('Unable to load onboarding content right now.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const safeSlides = slides.length > 0 ? slides : EMPTY_SLIDES;
  const safeIndex = Math.min(index, Math.max(0, safeSlides.length - 1));
  const slide = safeSlides[safeIndex] || EMPTY_SLIDES[0];
  const slideLayout = getBannerImageLayout(slide);
  const isLast = index === slides.length - 1;
  const isCompactHeight = windowHeight < 740;

  // Use a shorter hero on compact screens so title/description/button never overlap.
  const imageRatio = isCompactHeight ? 0.48 : IMAGE_HEIGHT_RATIO;
  const imageHeight = Math.round(windowHeight * imageRatio);
  const horizontalPad = Math.max(16, Math.min(28, Math.round(windowWidth * 0.06)));
  const titleSize = Math.max(22, Math.min(30, Math.round(windowWidth * 0.07)));
  const titleLineHeight = Math.round(titleSize * 1.22);
  const bodySize = Math.max(14, Math.min(17, Math.round(windowWidth * 0.043)));
  const bodyLineHeight = Math.round(bodySize * 1.5);
  const buttonTextSize = Math.max(16, Math.min(18, Math.round(windowWidth * 0.046)));
  const buttonBottomOffset = Math.max(12, insets.bottom + (isCompactHeight ? 8 : 4));

  return (
    <View style={styles.container}>
      <View style={[styles.imageBand, { height: imageHeight }]}>
        {loading ? (
          <View style={[styles.placeholder, styles.placeholderCentered, { height: imageHeight }]}>
            <ActivityIndicator size="large" color={colors.white} />
            {slide.showSkip && (
              <TouchableOpacity
                style={[styles.skipBtn, { top: insets.top + 8 }]}
                onPress={onSkip}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : slide.imageUrl ? (
          <View style={[styles.slideImage, { height: imageHeight }]}>
            <ExpoImage
              key={`${safeIndex}-${slide.imageUrl}`}
              source={{ uri: String(slide.imageUrl) }}
              cachePolicy="memory-disk"
              style={styles.slideImageLayer}
              contentFit={slideLayout.contentFit}
              contentPosition={slideLayout.contentPosition}
              contentStyle={{ transform: slideLayout.transform }}
              transition={120}
              onLoad={() => console.log('IMG_LOADED', slide.imageUrl)}
              onError={(e) => console.log('IMG_ERROR', e, slide.imageUrl)}
            />
            {slide.showSkip && (
              <TouchableOpacity
                style={[styles.skipBtn, { top: insets.top + 8 }]}
                onPress={onSkip}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.placeholder, styles.placeholderCentered, { height: imageHeight }]}>
            {slide.showSkip && (
              <TouchableOpacity
                style={[styles.skipBtn, { top: insets.top + 8 }]}
                onPress={onSkip}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.skipTextDark}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={[styles.bottomPanel, { paddingHorizontal: horizontalPad }]}>
        <View style={styles.dots}>
          {safeSlides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === safeIndex && styles.dotActive,
                i === safeIndex ? styles.dotActiveSize : styles.dotInactiveSize,
              ]}
            />
          ))}
        </View>
        {!!slide.title && <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleLineHeight }]}>{slide.title}</Text>}
        {!!slide.description && <Text style={[styles.desc, { fontSize: bodySize, lineHeight: bodyLineHeight }]}>{slide.description}</Text>}
        <TouchableOpacity
          style={[
            styles.button,
            { marginBottom: buttonBottomOffset },
          ]}
          onPress={() => (safeIndex === safeSlides.length - 1 ? onComplete() : setIndex((i) => i + 1))}
        >
          <Text style={[styles.buttonText, { fontSize: buttonTextSize }]}>{safeIndex === safeSlides.length - 1 ? 'Get Started' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  imageBand: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  slideImage: {
    width: '100%',
  },
  slideImageLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    width: '100%',
    backgroundColor: colors.borderLight,
  },
  placeholderCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#0f172a',
  },
  skipBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  skipTextDark: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  bottomPanel: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: colors.white,
    minHeight: 0,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotActiveSize: { width: 24 },
  dotInactiveSize: { width: 8 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 32,
    marginBottom: 14,
  },
  desc: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: 12,
    flexShrink: 1,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
