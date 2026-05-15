import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  Alert,
  Share,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Icon } from '../../lib/icons';
import { fetchWithAuth } from '../../lib/api';
import {
  hasSavedPriceBreakdown,
  getPrimaryTotalDisplayString,
} from '../../lib/orderSummaryBreakdown';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const FIGMA_WIDTH = 380;
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);
const HEADER_BLUE = '#51A2FF';
const STEP_LABEL_CONFIRMED = 'STEP 3 OF 3';
const PROGRESS_FRACTION_COMPLETE = 1;

const CHECK_IMAGE = require('../../assets/order-confirmed-check.png');

export default function OrderConfirmedScreen({ route, navigation }) {
  const { orderId, order: orderParam } = route.params || {};
  const [order, setOrder] = useState(orderParam || null);
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth, FIGMA_WIDTH);
  const displayOrderId = order?.orderId || order?.id || orderId || '—';
  const formattedOrderId = typeof displayOrderId === 'string' && displayOrderId !== '—'
    ? (displayOrderId.startsWith('MB-') ? displayOrderId : `MB-ORDER-2026-${String(displayOrderId).padStart(5, '0')}`)
    : '—';
  const showSettlementRow = order && hasSavedPriceBreakdown(order);

  useEffect(() => {
    if (!orderParam && orderId && !order?.id) {
      fetchWithAuth(`/api/orders/${orderId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then(setOrder)
        .catch(() => {});
    }
  }, [orderId, orderParam, order?.id]);

  const copyOrderId = () => {
    const id = formattedOrderId;
    if (id === '—') return;
    if (Platform.OS === 'web') {
      try {
        navigator.clipboard.writeText(id);
        Alert.alert('Copied', 'Order ID copied to clipboard.');
      } catch (e) {
        Share.share({ message: id, title: 'Order ID' });
      }
    } else {
      Share.share({ message: id, title: 'Order ID' });
    }
  };

  const backToHome = () => navigation.getParent()?.navigate('Home');
  const returnToHub = () => navigation.getParent()?.navigate('Buy', { screen: 'BuyList' });

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.wrap, { width: contentWidth }]}>
          {/* Header – same shell, progress track, and step typography as QuantityScreen */}
          <View style={[styles.header, { width: contentWidth, alignSelf: 'center' }]}>
            <View style={styles.headerRow}>
              <View style={styles.headerSideSpacer} />
              <View style={styles.headerTitleBlock}>
                <View style={styles.lightningBox}>
                  <Icon name="lightning" size={20} color="#1F2A44" />
                </View>
                <Text style={styles.headerTitle}>Order Request Processed</Text>
              </View>
            </View>
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${PROGRESS_FRACTION_COMPLETE * 100}%` }]} />
              </View>
              <Text style={styles.stepText}>{STEP_LABEL_CONFIRMED}</Text>
            </View>
          </View>

          {/* Main content – same horizontal padding as previous screens (21px) */}
          <View style={styles.content}>
            {/* Order Received block – green checkmark image above title */}
            <View style={styles.receivedBlock}>
              <View style={styles.checkCircle}>
                <Image source={CHECK_IMAGE} style={styles.checkImage} resizeMode="contain" />
              </View>
              <Text style={styles.receivedTitle}>Order Request Processed For Verification</Text>
              <Text style={styles.receivedSub}>Your minerals are secured and processing for delivery.</Text>
            </View>

            {/* Process Timeline card */}
            <View style={styles.timelineCard}>
              <View style={styles.timelineHeader}>
                <View style={styles.exclamationCircle}>
                  <Text style={styles.exclamationText}>!</Text>
                </View>
                <Text style={styles.timelineTitle}>Process Timeline</Text>
              </View>
              <Text style={styles.timelineIntro}>
                Our institutional desk will facilitate the following within 24 hours:
              </Text>
              <View style={styles.timelineList}>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineItemText}>
                    <Text style={styles.timelineItemTitle}>Final Pricing Confirmation</Text>
                    <Text style={styles.timelineItemSub}>Verified market rate lock-in</Text>
                  </View>
                </View>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineItemText}>
                    <Text style={styles.timelineItemTitle}>Seller Verification</Text>
                    <Text style={styles.timelineItemSub}>Compliance & AML check completion</Text>
                  </View>
                </View>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineItemText}>
                    <Text style={styles.timelineItemTitle}>Logistics Schedule</Text>
                    <Text style={styles.timelineItemSub}>Secure transit & handover mapping</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Order ID card */}
            <View style={styles.orderIdCard}>
              <View style={styles.orderIdRow}>
                <View>
                  <Text style={styles.orderIdLabel}>MINERAL BRIDGE ID</Text>
                  <Text style={styles.orderIdValue}>{formattedOrderId}</Text>
                </View>
                <Pressable style={styles.copyBtn} onPress={copyOrderId}>
                  <Icon name="document" size={20} color="#6A7282" />
                </Pressable>
              </View>
            </View>

            {showSettlementRow ? (
              <View style={styles.settlementRow}>
                <Text style={styles.settlementLabel}>ORDER TOTAL</Text>
                <View style={styles.settlementLine} />
                <Text style={styles.settlementValue}>{getPrimaryTotalDisplayString(order)}</Text>
              </View>
            ) : null}

            {/* Back to Homepage – same button color as Quantity, hover blue */}
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnHover]}
              onPress={backToHome}
            >
              <Icon name="location" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Back to Homepage</Text>
            </Pressable>

            {/* Return to Hub – same secondary button style as Sell success */}
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              onPress={returnToHub}
            >
              <Icon name="home" size={18} color="rgba(31, 42, 68, 0.8)" />
              <Text style={styles.secondaryBtnText}>Return to Hub</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  scrollContent: {},
  wrap: { flex: 1 },
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
  headerSideSpacer: {
    width: 44,
    height: 44,
  },
  headerTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  lightningBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.4,
    color: '#1F2A44',
  },
  progressBlock: { marginTop: 18, alignItems: 'center' },
  progressTrack: {
    width: '100%',
    maxWidth: 112,
    height: 5.23,
    backgroundColor: '#DBEAFE',
    borderRadius: 99999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2B7FFF',
    borderRadius: 99999,
  },
  stepText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#51A2FF',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 21,
    paddingTop: 28,
    gap: 28,
  },
  receivedBlock: {
    alignItems: 'center',
    gap: 14,
  },
  checkCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkImage: {
    width: 72,
    height: 72,
  },
  receivedTitle: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.025,
    color: '#1F2A44',
    textAlign: 'center',
  },
  receivedSub: {
    fontSize: 12.25,
    fontWeight: '500',
    color: '#6A7282',
    textAlign: 'center',
  },
  timelineCard: {
    backgroundColor: 'rgba(239, 246, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(219, 234, 254, 0.6)',
    borderRadius: 21,
    padding: 28,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  exclamationCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F2C94C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exclamationText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1F2A44',
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2A44',
  },
  timelineIntro: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(31, 42, 68, 0.7)',
    lineHeight: 22,
    marginBottom: 20,
  },
  timelineList: { gap: 18 },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F2C94C',
    marginTop: 6,
  },
  timelineItemText: { flex: 1 },
  timelineItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2A44',
  },
  timelineItemSub: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6A7282',
    marginTop: 4,
  },
  orderIdCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 14,
    padding: 17,
  },
  orderIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.1,
    textTransform: 'uppercase',
    color: '#99A1AF',
    marginBottom: 5,
  },
  orderIdValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1F2A44',
  },
  copyBtn: { padding: 8 },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settlementLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.1,
    textTransform: 'uppercase',
    color: '#99A1AF',
  },
  settlementLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(31, 42, 68, 0.15)',
  },
  settlementValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2A44',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    height: 52,
    backgroundColor: '#1F2A44',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: 'rgba(31, 42, 68, 0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnHover: { borderColor: HEADER_BLUE },
  primaryBtnText: {
    fontSize: 15.75,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 49,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14.5,
    marginTop: 10,
  },
  secondaryBtnPressed: { opacity: 0.9 },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1C',
  },
});
