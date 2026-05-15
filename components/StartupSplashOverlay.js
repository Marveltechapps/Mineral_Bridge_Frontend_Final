import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { SPLASH_SCREEN_IMAGE } from '../lib/splashScreenImage';

const SPLASH_BG = '#000000';

export default function StartupSplashOverlay({
  visible,
  minDurationMs = 900,
  onDone,
}) {
  const presentedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      presentedRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => onDone?.(), minDurationMs);
    return () => clearTimeout(t);
  }, [visible, minDurationMs, onDone]);

  const hideNativeOnce = () => {
    if (presentedRef.current) return;
    presentedRef.current = true;
    SplashScreen.hideAsync().catch(() => {});
  };

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Image
        source={SPLASH_SCREEN_IMAGE}
        cachePolicy="memory-disk"
        style={styles.fullBleed}
        contentFit="contain"
        contentPosition="center"
        priority="high"
        transition={0}
        onLoad={hideNativeOnce}
        onError={hideNativeOnce}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: SPLASH_BG,
  },
  fullBleed: {
    ...StyleSheet.absoluteFillObject,
  },
});
