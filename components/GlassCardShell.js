import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

const DEFAULT_RADIUS = 18;

/**
 * Frosted-glass card wrapper: blur + light tint + soft border + shadow.
 * Children render above the blur (image + text).
 */
export function GlassCardShell({ width, children, borderRadius = DEFAULT_RADIUS, style }) {
  return (
    <View style={[styles.shadowWrap, { width, borderRadius }, style]}>
      <View style={[styles.inner, { borderRadius }]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 38 : 28}
          tint="light"
          style={StyleSheet.absoluteFillObject}
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.frostTint]} />
        <View style={styles.foreground}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 11,
    elevation: 5,
  },
  inner: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  frostTint: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  foreground: {
    position: 'relative',
  },
});

