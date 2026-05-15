import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';

export default function SuccessScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 420);

  const onBackToMarketplace = () => {
    const tabNav = navigation.getParent();
    if (tabNav?.navigate) tabNav.navigate('Home');
    else navigation.navigate('Buy');
  };

  const onBuyMore = () => {
    navigation.getParent()?.navigate('Buy');
  };

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, { maxWidth: contentWidth - 32 }]}>
          <View style={styles.iconOuter}>
            <View style={styles.iconRing}>
              <Icon name="check" size={32} color={colors.successGreen} />
            </View>
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title}>Order complete</Text>
            <Text style={styles.subtitle}>
              Order complete in a verified and transparent trade flow.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              onPress={onBuyMore}
            >
              <Text style={styles.primaryBtnText}>Buy Another Item</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              onPress={onBackToMarketplace}
            >
              <Text style={styles.secondaryBtnText}>Return to Hub</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 22,
  },
  content: {
    width: '100%',
    maxWidth: 336,
    alignItems: 'center',
  },
  iconOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.successGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: colors.successGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 7,
    marginBottom: 28,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 28,
    textAlign: 'center',
    color: '#101828',
  },
  subtitle: {
    fontSize: 12.25,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
    color: '#6B7280',
    maxWidth: '90%',
  },
  actions: {
    width: '100%',
    gap: 10.5,
    paddingTop: 14,
  },
  primaryBtn: {
    width: '100%',
    height: 49,
    backgroundColor: '#1F2A44',
    borderRadius: 14.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    width: '100%',
    height: 49,
    backgroundColor: '#E0ECFF', // slightly stronger blue-tinted background to stand out
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: { opacity: 0.9 },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    color: '#1C1C1C',
  },
});
