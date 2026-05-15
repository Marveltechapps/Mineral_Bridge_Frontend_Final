import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { fetchWithAuth } from '../../lib/api';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { USE_CONFIRMED_PRICE_AUTHORITY } from '../../config/pricing';

function parsePrice(priceDisplay) {
  if (priceDisplay == null || typeof priceDisplay !== 'string') return null;
  const match = String(priceDisplay).replace(/,/g, '').match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_MARGIN_UP_PERCENT = 0.06;
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * HEADER_MARGIN_UP_PERCENT);
const MARGIN_UP_3_PERCENT = WINDOW_HEIGHT * 0.03;
const HOVER_BLUE = '#51A2FF';
const PROGRESS_BLUE = '#51A2FF';

const PAYMENT_CONDITIONS = [
  'Assay results verified',
  'Material specs confirmed',
  'Custody handover complete',
];

export default function SellSettlementScreen({ route, navigation }) {
  const { mineral, category, quantity, unit, type, origin, addressId } = route.params || {};
  const [submitting, setSubmitting] = useState(false);

  const pricePerUnit = useMemo(() => parsePrice(mineral?.priceDisplay || mineral?.price), [mineral]);
  const qty = useMemo(() => Number(quantity) || 1, [quantity]);
  const estimatedPayoutNum = useMemo(() => {
    if (pricePerUnit == null) return null;
    return pricePerUnit * qty;
  }, [pricePerUnit, qty]);
  const estimatedPayout = estimatedPayoutNum != null
    ? estimatedPayoutNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

  const submit = async () => {
    if (!mineral?.id) {
      Alert.alert('Error', 'Missing mineral.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/listings', {
        method: 'POST',
        body: JSON.stringify({
          mineralId: mineral.id,
          category: category || mineral.category,
          quantity: Number(quantity) || 1,
          unit: unit || 'kg',
          type: type || 'raw',
          origin: origin || '',
          photos: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create listing');
      }
      const listing = await res.json();
      if (!addressId) {
        throw new Error('Delivery address is required. Please complete the Logistics step and select or add an address.');
      }
      const orderRes = await fetchWithAuth('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          mineralId: mineral.id,
          mineralName: mineral.name,
          quantity: String(quantity || '1'),
          amount: mineral?.price || mineral?.priceDisplay || null,
          addressId,
          type: 'sell',
          mineralType: type || 'raw',
          unit: unit || 'kg',
          listingId: listing.id || null,
          estimatedPayout: estimatedPayoutNum,
          subtotal: estimatedPayoutNum,
          totalDue: estimatedPayoutNum,
        }),
      });
      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create sell order. It may not appear in Order & Settlements until fixed.');
      }
      navigation.navigate('SellSuccess', { listingId: listing.id });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      {/* Header – same format as Logistics: back, title, Step 3 of 3, progress bar */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]}
            onPress={() => navigation.goBack()}
          >
            {({ pressed }) => (
              <Icon name="chevronLeft" size={24} color={pressed ? '#1F2A44' : HOVER_BLUE} />
            )}
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>Confirm Secure Settlement</Text>
          </View>
        </View>
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.stepText}>STEP 3 OF 3</Text>
          <Text style={styles.stepSubtext}>Settlement</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Estimated Payout */}
        <View style={styles.payoutCard}>
          <Text style={styles.payoutLabel}>
            {USE_CONFIRMED_PRICE_AUTHORITY ? 'PAYOUT AMOUNT' : 'AI ESTIMATED PAYOUT'}
          </Text>
          <Text style={styles.payoutAmount}>
            {USE_CONFIRMED_PRICE_AUTHORITY ? 'Awaiting confirmation' : `~$${estimatedPayout}`}
          </Text>
          <Text style={styles.payoutStatus}>
            {USE_CONFIRMED_PRICE_AUTHORITY
              ? 'Final payout is set by our team after review and testing.'
              : 'Pending sample test approval'}
          </Text>
        </View>

        {/* Sample Test Must Be Approved First – teal flask/test-tube icon */}
        <View style={styles.sampleApprovalCard}>
          <View style={styles.sampleApprovalHeader}>
            <View style={styles.sampleApprovalIconWrap}>
              <Icon name="flask" size={22} color="#0D9488" />
            </View>
            <Text style={styles.sampleApprovalTitle}>Sample Test Must Be Approved First</Text>
          </View>
          <Text style={styles.paymentReleasedLabel}>PAYMENT RELEASED ONLY AFTER:</Text>
          <View style={styles.conditionsList}>
            {PAYMENT_CONDITIONS.map((item, i) => (
              <View key={i} style={styles.conditionItem}>
                <View style={styles.conditionCheckWrap}>
                  <Icon name="check" size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.conditionItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Funds Reserved – blue circle with white border and white check */}
        <View style={styles.fundsCard}>
          <View style={styles.fundsIconWrap}>
            <Icon name="check" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.fundsTextWrap}>
            <Text style={styles.fundsTitle}>FUNDS RESERVED</Text>
            <Text style={styles.fundsDesc}>
              Escrow smart contract ready. <Text style={styles.fundsDescBold}>Instant transfer upon approval.</Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer – same button color as previous screens (primary dark blue) */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonHover]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.ctaButtonText}>Confirm Sale</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
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
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnHover: {
    backgroundColor: 'rgba(81, 162, 255, 0.25)',
  },
  headerTitleBlock: { flex: 1, justifyContent: 'center' },
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
    backgroundColor: PROGRESS_BLUE,
    borderRadius: 99999,
  },
  stepText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: HOVER_BLUE,
    textAlign: 'center',
  },
  stepSubtext: {
    fontSize: 10.5,
    fontWeight: '400',
    lineHeight: 14,
    color: '#8EC5FF',
    marginTop: 4,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: MARGIN_UP_3_PERCENT, paddingBottom: 100 },
  payoutCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16.64,
    padding: 20.8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 16,
  },
  payoutLabel: {
    fontSize: 11.44,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 8,
  },
  payoutAmount: {
    fontSize: 29.12,
    fontWeight: '700',
    color: '#1F2A44',
    marginBottom: 6,
  },
  payoutStatus: {
    fontSize: 13.52,
    color: colors.textMuted,
  },
  sampleApprovalCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
    marginTop: MARGIN_UP_3_PERCENT,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sampleApprovalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.5,
    marginBottom: 16,
  },
  sampleApprovalIconWrap: {
    width: 35,
    height: 35,
    borderRadius: 14.5,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleApprovalTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    color: '#1F2A44',
  },
  paymentReleasedLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 10,
  },
  conditionsList: { gap: 10.5 },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.5,
  },
  conditionCheckWrap: {
    width: 17.5,
    height: 17.5,
    borderRadius: 9,
    backgroundColor: colors.successGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionItemText: {
    fontSize: 10.5,
    fontWeight: '600',
    lineHeight: 14,
    color: '#364153',
  },
  fundsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginTop: MARGIN_UP_3_PERCENT,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  fundsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: HOVER_BLUE,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fundsTextWrap: { flex: 1 },
  fundsTitle: {
    fontSize: 13.72,
    fontWeight: '700',
    color: HOVER_BLUE,
    marginBottom: 4,
  },
  fundsDesc: { fontSize: 12.74, color: HOVER_BLUE, lineHeight: 17.64 },
  fundsDescBold: { fontWeight: '700', color: HOVER_BLUE },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonHover: { opacity: 0.9 },
  ctaButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
