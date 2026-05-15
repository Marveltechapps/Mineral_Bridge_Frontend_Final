import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { getSellContent } from '../../lib/services';

const DEFAULT_SALE_CONFIRMED = {
  title: 'Sell request confirmation',
  subtitle: 'Your sell request has been received. Payment protected in escrow.',
};

/** API merges stored dashboard JSON, which may still contain pre-rename strings. */
function normalizeSaleConfirmedFromApi(sc) {
  const def = DEFAULT_SALE_CONFIRMED;
  if (!sc || typeof sc !== 'object') return { ...def };
  let title = sc.title != null && String(sc.title).trim() !== '' ? String(sc.title).trim() : def.title;
  let subtitle =
    sc.subtitle != null && String(sc.subtitle).trim() !== '' ? String(sc.subtitle).trim() : def.subtitle;
  if (/^sale\s+confirmed\.?$/i.test(title)) title = def.title;
  if (/^sale\s+confirmed\b/i.test(subtitle)) subtitle = def.subtitle;
  return { title, subtitle };
}

export default function SellSuccessScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 420);
  const [saleConfirmed, setSaleConfirmed] = useState(DEFAULT_SALE_CONFIRMED);

  useEffect(() => {
    let cancelled = false;
    getSellContent()
      .then((data) => {
        if (cancelled) return;
        const sc = data?.saleConfirmed;
        if (sc && (sc.title != null || sc.subtitle != null)) {
          setSaleConfirmed(normalizeSaleConfirmedFromApi(sc));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const onSellAnother = () => {
    navigation.reset({ index: 0, routes: [{ name: 'SellHome' }] });
  };
  const onBackToMarketplace = () => {
    const tabNav = navigation.getParent();
    if (tabNav?.navigate) tabNav.navigate('Home');
    else navigation.navigate('SellHome');
  };
  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, { maxWidth: contentWidth - 32 }]}>
          {/* Icon: 84px circle #DCFCE7, inner 48px ring 4px #00A63E + checkmark */}
          <View style={styles.iconOuter}>
            <View style={styles.iconRing}>
              <Icon name="check" size={32} color={colors.successGreen} />
            </View>
          </View>

          {/* Title + paragraph (from dashboard sell content when available) */}
          <View style={styles.textBlock}>
            <Text style={styles.title}>{saleConfirmed.title}</Text>
            <Text style={styles.paragraph}>{saleConfirmed.subtitle}</Text>
          </View>

          {/* Buttons + link */}
          <View style={styles.actions}>
            <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]} onPress={onSellAnother}>
              <Text style={styles.primaryBtnText}>Sell Another Item</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]} onPress={onBackToMarketplace}>
              <Text style={styles.secondaryBtnText}>Back to Marketplace</Text>
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
  paragraph: {
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
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
