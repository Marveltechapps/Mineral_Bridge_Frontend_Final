import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  useWindowDimensions,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useHeaderPaddingTop } from '../../lib/headerInsets';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_TOP = Math.round(WINDOW_HEIGHT * 0.04);
const HEADER_BOTTOM = Math.round(WINDOW_HEIGHT * 0.02);
/** Public mining page — [Mineral Bridge mining](http://mineralbridge.com/mining/) */
const MINING_WEB_URL = 'http://mineralbridge.com/mining/';

export default function ArtisanalScreen() {
  const { width, height } = useWindowDimensions();
  const headerPaddingTop = useHeaderPaddingTop(HEADER_TOP);
  const contentWidth = Math.min(width, 420);
  const isCompactHeight = height < 740;
  const titleSize = isCompactHeight ? 18 : 20;
  const descSize = isCompactHeight ? 13 : 14;
  const descLineHeight = isCompactHeight ? 20 : 22;
  const buttonTextSize = isCompactHeight ? 15 : 16;

  const openMiningPage = () => {
    Linking.openURL(MINING_WEB_URL).catch(() => {
      Alert.alert('Could not open page', 'Please open mineralbridge.com/mining in your browser.');
    });
  };

  const headerMarginTop = Math.round(height * 0.03);
  const headerMarginBottom = Math.round(height * 0.05);
  /** Icon + title row: 5% up, then 1% down (net 4% up). */
  const headerRowTranslateY = -Math.round(height * 0.05) + Math.round(height * 0.01);
  /** Move the main card (and all its content) up by 4% of screen height (two × 2%). */
  const cardTranslateY = -Math.round(height * 0.04);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: headerPaddingTop, marginTop: headerMarginTop, marginBottom: headerMarginBottom },
        ]}
      >
        <View style={[styles.headerRow, { transform: [{ translateY: headerRowTranslateY }] }]}>
          <View style={styles.logoBox}>
            <Image
              source={require('../../assets/icon-pickaxe.png')}
              style={[styles.logoIcon, styles.logoIconScale]}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.headerTitle}>Mining</Text>
        </View>
      </View>

      <ScrollView
        style={styles.contentWrap}
        contentContainerStyle={[styles.contentWrapInner, { width: contentWidth, alignSelf: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { transform: [{ translateY: cardTranslateY }] }]}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconGlobe}>🌐</Text>
          </View>
          <Text style={[styles.cardTitle, { fontSize: titleSize }]}>Artisanal miner program</Text>
          <Text style={[styles.cardDescription, { fontSize: descSize, lineHeight: descLineHeight }]}>
            Verify your mining site and complete ASM onboarding to access verified trading and institutional support.
          </Text>
          <TouchableOpacity
            style={styles.learnMoreBtn}
            onPress={openMiningPage}
            activeOpacity={0.8}
          >
            <Text style={[styles.learnMoreText, { fontSize: buttonTextSize }]}>Continue</Text>
            <Text style={styles.externalIcon}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    width: '100%',
    minHeight: 120,
    paddingHorizontal: 21,
    paddingBottom: HEADER_BOTTOM,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
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
  /** Icon + title aligned from the left; whole row offset upward via translateY on the row. */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    gap: 10.5,
    minHeight: 40,
  },
  logoBox: {
    width: 35,
    height: 35,
    borderRadius: 14.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  logoIcon: { width: 21, height: 21 },
  logoIconScale: { transform: [{ scale: 0.96 }] },
  headerTitle: { fontSize: 17.5, fontWeight: '700', color: colors.primary },
  contentWrap: { flex: 1 },
  contentWrapInner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'center',
    marginHorizontal: 0,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconGlobe: { fontSize: 36 },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 12,
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  learnMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  learnMoreText: { fontSize: 16, fontWeight: '700', color: colors.white },
  externalIcon: { fontSize: 16, color: colors.white, fontWeight: '600' },
});
