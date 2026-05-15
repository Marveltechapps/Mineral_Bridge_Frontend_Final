import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
const SPLASH_BG = '#000000';
const SPLASH_DURATION_MS = 2500;
const SPLASH_SOURCE = require('../../assets/splash.png');

export default function SplashScreen({ onComplete }) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t = setTimeout(() => onCompleteRef.current?.(), SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.fullScreen}>
      <Image
        source={SPLASH_SOURCE}
        cachePolicy="memory-disk"
        style={styles.fullBleed}
        contentFit="contain"
        contentPosition="center"
        priority="high"
        transition={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
  fullBleed: {
    ...StyleSheet.absoluteFillObject,
  },
});
