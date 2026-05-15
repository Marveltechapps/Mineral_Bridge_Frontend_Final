import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const CANCEL_TOP = Math.round(WINDOW_HEIGHT * 0.03);
const CARD_PADDING = 24;

export default function RegionEligibleScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const contentWidth = Math.min(width - 24, 420);
  const isCompactHeight = height < 740;
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVerifying(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const onClose = () => navigation.goBack();
  const onContinue = () => {
    navigation.goBack();
    navigation.getParent()?.navigate('Mining', { screen: 'ArtisanalStep1' });
  };

  if (verifying) {
    return (
      <View style={styles.verifyingContainer}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="close" size={24} color="#1F2A44" />
        </TouchableOpacity>

        <View style={styles.verifyingContent}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.verifyingText}>Verifying Region Eligibility...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { width: contentWidth, padding: isCompactHeight ? 20 : CARD_PADDING, paddingTop: isCompactHeight ? 40 : 44 }]}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="close" size={22} color="#1F2A44" />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <Icon name="globe" size={48} color={colors.successGreen} />
        </View>

        <Text style={[styles.title, isCompactHeight && { fontSize: 20 } ]}>Region Eligible</Text>
        <Text style={[styles.desc, isCompactHeight && { lineHeight: 20, marginBottom: 18 }]}>
          You are eligible for trusted artisanal trading access.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={onContinue}
        >
          <Text style={styles.ctaText}>Start Mining Verification Flow</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  verifyingContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  cancelBtn: {
    position: 'absolute',
    top: CANCEL_TOP,
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  verifyingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  verifyingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2A44',
    marginTop: 20,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.headerBg,
    borderRadius: 20,
    padding: CARD_PADDING,
    paddingTop: 44,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: CANCEL_TOP,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: colors.successGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2A44',
    marginBottom: 12,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  cta: {
    width: '100%',
    backgroundColor: '#1F2A44',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
