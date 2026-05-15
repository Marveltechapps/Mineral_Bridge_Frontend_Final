import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { fetchWithAuth } from '../../lib/api';
import { Icon } from '../../lib/icons';
import { getBuyContent } from '../../lib/services';
import { USE_CONFIRMED_PRICE_AUTHORITY } from '../../config/pricing';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const FIGMA_WIDTH = 380;
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);

// Default transport/fee for order summary (overridden by dashboard Buy content → Pricing internal)
const DEFAULT_TRANSPORT = 0;
const DEFAULT_FEE_PERCENT = 0.01;

function parsePrice(priceDisplay) {
  if (priceDisplay == null || typeof priceDisplay !== 'string') return null;
  const match = String(priceDisplay).replace(/,/g, '').match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

function fmtMoney(n) {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaymentScreen({ route, navigation }) {
  const { width, height } = useWindowDimensions();
  const { mineral, quantity, addressId, deliveryDetails, unit = 'kg' } = route.params || {};
  const [placing, setPlacing] = useState(false);
  const [buyContent, setBuyContent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getBuyContent()
      .then((data) => { if (!cancelled) setBuyContent(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const priceDisplay = mineral?.price ?? mineral?.priceDisplay ?? '';
  const pricePerUnit = useMemo(() => parsePrice(priceDisplay), [priceDisplay]);
  const q = useMemo(() => Number(quantity) || 0, [quantity]);
  const paymentStep = buyContent?.paymentStep || {};
  const transportFromDashboard = typeof paymentStep.defaultTransport === 'number' && Number.isFinite(paymentStep.defaultTransport)
    ? paymentStep.defaultTransport
    : DEFAULT_TRANSPORT;
  const feePercentFromDashboard = typeof paymentStep.feePercent === 'number' && Number.isFinite(paymentStep.feePercent)
    ? paymentStep.feePercent
    : DEFAULT_FEE_PERCENT;
  const subtotal = useMemo(() => {
    if (pricePerUnit == null) return null;
    return pricePerUnit * q;
  }, [pricePerUnit, q]);
  const transport = transportFromDashboard;
  const fee = useMemo(() => {
    if (subtotal == null || !Number.isFinite(subtotal)) return 0;
    return subtotal * feePercentFromDashboard;
  }, [subtotal, feePercentFromDashboard]);
  const totalDue = useMemo(() => {
    if (subtotal == null) return null;
    return subtotal + transport + fee;
  }, [subtotal, transport, fee]);
  const totalDueText = USE_CONFIRMED_PRICE_AUTHORITY
    ? 'Price pending'
    : totalDue != null && Number.isFinite(totalDue)
      ? fmtMoney(totalDue)
      : '—';

  const contentWidth = Math.min(width, FIGMA_WIDTH);
  const isCompactHeight = height < 740;

  const placeOrder = async () => {
    if (!mineral?.id) {
      Alert.alert('Error', 'Missing mineral.');
      return;
    }
    if (!addressId && !deliveryDetails) {
      Alert.alert('Error', 'Missing delivery address.');
      return;
    }
    setPlacing(true);
    try {
      const res = await fetchWithAuth('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          mineralId: mineral.id,
          mineralName: mineral.name,
          quantity: String(quantity || '1'),
          amount: mineral.price || null,
          addressId: addressId || undefined,
          type: 'buy',
          mineralType: route.params?.mineralType || 'raw',
          buyerCategory: route.params?.buyerCategory || null,
          deliveryMethod: route.params?.deliveryMethod || 'Direct Delivery',
          subtotal: subtotal != null ? subtotal : null,
          transportFee: transport > 0 ? transport : null,
          feePercent: feePercentFromDashboard,
          totalDue: totalDue != null ? totalDue : null,
          unit: unit || 'kg',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to place order');
      }
      const order = await res.json();
      navigation.navigate('OrderConfirmed', {
        orderId: order.id || order._id,
        order,
        totalDue: USE_CONFIRMED_PRICE_AUTHORITY ? null : totalDueText,
      });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.wrap, { width: contentWidth }]}>
          {/* Header – same format, margin and order as Logistics (no inline Step 3 of 3) */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Icon name="chevronLeft" size={22} color="#51A2FF" />
              </TouchableOpacity>
              <View style={styles.headerTitleBlock}>
                <View style={styles.headerIconBox}>
                  <Icon name="wallet" size={20} color="#1F2A44" />
                </View>
                <Text style={styles.headerTitle} numberOfLines={1}>Confirm Secure Payment</Text>
              </View>
            </View>
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.stepText}>STEP 3 OF 3</Text>
              <Text style={styles.stepSubtext}>Escrow Protected Transaction</Text>
            </View>
          </View>

          {/* Content – padding 21 21 0, gap 14 */}
          <View style={styles.content}>
            {/* Card 1: Total Due – #1F2A44, 35px radius, amount + card icon; SUBTOTAL / TRANSPORT / FEE (1%) */}
            <View style={styles.totalDueCard}>
              <Text style={styles.totalDueLabel}>{USE_CONFIRMED_PRICE_AUTHORITY ? 'PRICING' : 'TOTAL DUE'}</Text>
              <View style={styles.totalDueAmountRow}>
                <Text style={styles.totalDueAmount}>{totalDueText}</Text>
                <View style={styles.totalDueCardIcon}>
                  <Icon name="card" size={22} color="rgba(255,255,255,0.6)" />
                </View>
              </View>
              {USE_CONFIRMED_PRICE_AUTHORITY ? (
                <Text style={styles.pendingPriceNote}>
                  Final amount is set by our team after review. You will see it in order details once confirmed.
                </Text>
              ) : (
                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>SUBTOTAL</Text>
                    <Text style={styles.summaryValue}>
                      {subtotal != null && Number.isFinite(subtotal) ? fmtMoney(subtotal) : '—'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>TRANSPORT</Text>
                    <Text style={styles.summaryValue}>{fmtMoney(transport)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>FEE (1%)</Text>
                    <Text style={styles.summaryValue}>{fmtMoney(fee)}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Card 2: Escrow Protected – rgba(239,246,255,0.5), #DBEAFE border, 14px radius */}
            <View style={styles.escrowCard}>
              <Icon name="shieldCheck" size={14} color="#155DFC" />
              <View style={styles.escrowContent}>
                <Text style={styles.escrowTitle}>ESCROW PROTECTED</Text>
                <Text style={styles.escrowSub}>
                  Funds are locked in a smart contract and only released upon cryptographic verification of physical custody transfer.
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={{ height: isCompactHeight ? 136 : 120 }} />
      </ScrollView>

      {/* Footer – border top #F3F4F6, Submit Order button – hover blue */}
      <View style={[styles.footerWrap, { width: contentWidth }]}>
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.submitBtn, { width: contentWidth - 42, alignSelf: 'center' }, !placing && pressed && styles.submitBtnHover]}
            onPress={placeOrder}
            disabled={placing}
          >
            {placing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon name="lock" size={14} color="#F2C94C" />
                <Text style={styles.submitBtnText}>Confirm Payment in Secure Flow</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  wrap: { flex: 1 },
  header: {
    backgroundColor: '#EFF6FF',
    paddingTop: 12 + HEADER_EXTRA_TOP,
    paddingBottom: 20,
    paddingHorizontal: 21,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 35,
    height: 35,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
  headerTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginLeft: 10 },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 10.5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 15.75, fontWeight: '700', color: '#1F2A44', letterSpacing: -0.4 },
  progressBlock: { marginTop: 20, alignItems: 'center' },
  progressTrack: {
    width: '100%',
    maxWidth: 112,
    height: 5.25,
    backgroundColor: '#DBEAFE',
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2B7FFF',
    borderRadius: 9999,
    elevation: 2,
  },
  stepText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#51A2FF',
    textAlign: 'center',
  },
  stepSubtext: {
    fontSize: 10.5,
    fontWeight: '400',
    color: '#8EC5FF',
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 21,
    paddingTop: 21,
    gap: 14,
  },
  totalDueCard: {
    backgroundColor: '#1F2A44',
    borderRadius: 35,
    padding: 21,
    shadowColor: 'rgba(28, 57, 142, 0.05)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  totalDueLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#F2C94C',
    marginBottom: 4,
  },
  totalDueAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  totalDueAmount: {
    fontSize: 26.25,
    fontWeight: '900',
    letterSpacing: -0.025,
    color: '#FFFFFF',
    flex: 1,
  },
  totalDueCardIcon: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 15,
    gap: 10.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', maxWidth: '60%' },
  pendingPriceNote: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 17,
  },
  escrowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10.5,
    padding: 14,
    backgroundColor: 'rgba(239, 246, 255, 0.5)',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
  },
  escrowContent: { flex: 1, gap: 3.5 },
  escrowTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#1C398E',
    marginBottom: 2,
  },
  escrowSub: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 16,
    color: '#1C398E',
    opacity: 0.8,
  },
  footerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    width: '100%',
    paddingTop: 22,
    paddingBottom: 28,
    paddingHorizontal: 21,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    height: 49,
    backgroundColor: '#1F2A44',
    borderRadius: 14.5,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: 'rgba(28, 57, 142, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  submitBtnHover: { borderColor: '#51A2FF' },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    color: '#FFFFFF',
  },
});
