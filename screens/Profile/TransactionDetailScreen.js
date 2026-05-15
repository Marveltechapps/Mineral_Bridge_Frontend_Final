import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';
import {
  showAppOrderPriceBreakdown,
  hasSavedPriceBreakdown,
  getPriceBreakdownRows,
  getPrimaryTotalDisplayString,
} from '../../lib/orderSummaryBreakdown';
import { OrderPriceBreakdown } from '../../components/OrderPriceBreakdown';

function escapeHtmlInvoice(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';

const STATUS_MAP = {
  Submitted: 'Submitted',
  Contact: 'Awaiting Contact',
  'Sample/Price': 'Sample Collected',
  Logistics: 'Price Confirmed',
  Complete: 'Completed',
  Delivered: 'Delivered',
};

function mapStatus(s) {
  return STATUS_MAP[s] || s || 'Submitted';
}

const STATUS_COLORS = {
  Submitted: '#64748B',
  'Awaiting Contact': '#EA7D24',
  'Sample Collected': '#2563EB',
  'Price Confirmed': '#8B5CF6',
  Completed: '#00A63E',
  Delivered: '#00A63E',
};

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function fmtMoney(n) {
  if (n == null || isNaN(n)) return '—';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtQty(q, unit) {
  if (!q) return '';
  const n = Number(q);
  const u = unit || 'kg';
  if (n >= 1000 && u === 'kg') return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} Tons`;
  return `${n}${u}`;
}

function buildInvoiceHTML(order) {
  const displaySt = mapStatus(order.status);
  const useDashboardBreakdown = showAppOrderPriceBreakdown() && hasSavedPriceBreakdown(order);

  const breakdownTable = (() => {
    if (!useDashboardBreakdown) return '';
    const br = getPriceBreakdownRows(order.orderSummary);
    if (br.length === 0) return '';
    const rows = br
      .map((r) => {
        const trCls = r.isTotal ? ' class="total"' : '';
        return `<tr${trCls}><td class="l">${escapeHtmlInvoice(r.label)}</td><td class="r">${escapeHtmlInvoice(r.value)}</td></tr>`;
      })
      .join('');
    return `<p class="section">PRICE BREAKDOWN</p><div class="bdwrap"><table class="bdtable">${rows}</table></div>`;
  })();

  const priceSectionHTML = (() => {
    if (!hasSavedPriceBreakdown(order)) {
      return '<p style="font-size:13px;color:#64748B;margin:16px 0;line-height:1.5">Amounts are omitted until our team confirms pricing (including transport and fees) in the dashboard.</p>';
    }
    if (useDashboardBreakdown) return breakdownTable;
    return `<table><tr class="total"><td class="l">Total Amount</td><td class="r">${escapeHtmlInvoice(getPrimaryTotalDisplayString(order))}</td></tr></table>`;
  })();

  return `<html><head><meta charset="utf-8"/><style>
    body{font-family:Arial,sans-serif;padding:40px;color:#1E293B}
    h1{font-size:20px;text-align:center;margin-bottom:2px}
    .sub{text-align:center;color:#64748B;font-size:13px;margin-bottom:6px}
    .badge{display:inline-block;padding:5px 14px;border-radius:12px;color:#fff;font-weight:700;font-size:11px}
    .section{font-size:10px;font-weight:700;letter-spacing:1.5px;color:#64748B;margin:28px 0 12px;border-bottom:1px solid #E2E8F0;padding-bottom:8px}
    .bdwrap{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:8px 20px 16px;margin-bottom:12px}
    .bdtable{width:100%;border-collapse:collapse}
    .bdtable td{padding:10px 0;font-size:13px;border-bottom:1px solid #E2E8F0}
    .bdtable tr:last-child td{border-bottom:none}
    td.l{color:#64748B;width:48%}td.r{text-align:right;font-weight:700;color:#0F172A}
    tr.total td{background:#ECFDF5;color:#14532D !important;padding:14px 12px !important;font-size:16px !important;font-weight:800 !important;border-radius:10px;border-bottom:none !important}
    .footer{text-align:center;margin-top:32px;font-size:10px;color:#94A3B8}
  </style></head><body>
    <p style="text-align:center"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg></p>
    <h1>${order.mineralName || 'Transaction'}${order.quantity ? ' (' + fmtQty(order.quantity, order.unit) + ')' : ''}</h1>
    <p class="sub">${formatDate(order.createdAt)}</p>
    <p style="text-align:center"><span class="badge" style="background:${STATUS_COLORS[displaySt] || '#64748B'}">${displaySt}</span></p>
    <p class="section">INSTITUTIONAL BREAKDOWN</p>
    <table>
      <tr><td class="l">Transaction ID</td><td class="r">${order.orderId || '—'}</td></tr>
      <tr><td class="l">Payment Method</td><td class="r">${order.deliveryMethod || 'Direct'}</td></tr>
    </table>
    ${priceSectionHTML}
    <p class="footer">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} — Mineral Bridge</p>
  </body></html>`;
}

export default function TransactionDetailScreen({ navigation, route }) {
  const orderId = route?.params?.orderId;
  const [order, setOrder] = useState(route?.params?.order || null);
  const [loading, setLoading] = useState(!order);
  const [generating, setGenerating] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetchWithAuth(`/api/orders/${orderId}`);
      if (res.ok) setOrder(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      fetchOrder();
      return undefined;
    }, [fetchOrder]),
  );

  const onDownloadInvoice = async () => {
    if (!order) return;
    try {
      setGenerating(true);
      const html = buildInvoiceHTML(order);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF Generated', `Invoice saved to: ${uri}`);
      }
    } catch {
      Alert.alert('Error', 'Failed to generate invoice. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>Transaction not found</Text>
      </View>
    );
  }

  const displaySt = mapStatus(order.status);
  const stColor = STATUS_COLORS[displaySt] || '#64748B';
  const showFinancials = hasSavedPriceBreakdown(order);
  const useDashboardBreakdown = showAppOrderPriceBreakdown() && showFinancials;

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={() => navigation.goBack()}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconWrap}>
              <Icon name="time" size={20} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>TRANSACTION DETAIL</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Receipt card */}
        <View style={styles.receiptCard}>
          <View style={styles.docIconWrap}>
            <Icon name="document" size={32} color={colors.textMuted} />
          </View>

          <Text style={styles.mineralName}>
            {order.mineralName || 'Transaction'}{order.quantity ? ` (${fmtQty(order.quantity, order.unit)})` : ''}
          </Text>
          <Text style={styles.txDate}>{formatDate(order.createdAt)}</Text>

          <View style={[styles.statusPill, { backgroundColor: stColor }]}>
            <Text style={styles.statusPillText}>{displaySt}</Text>
          </View>

          {showFinancials && (
            <View style={styles.receiptTotalBanner}>
              <Text style={styles.receiptTotalBannerLabel}>Total due</Text>
              <Text style={styles.receiptTotalBannerValue}>{getPrimaryTotalDisplayString(order)}</Text>
            </View>
          )}
        </View>

        {/* Institutional Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>INSTITUTIONAL BREAKDOWN</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Transaction ID</Text>
            <Text style={styles.breakdownValue}>{order.orderId || '—'}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Payment Method</Text>
            <Text style={styles.breakdownValue}>{order.deliveryMethod || 'Direct'}</Text>
          </View>

          <View style={styles.divider} />

          {!showFinancials ? (
            <Text style={styles.pricingPendingNote}>
              Final amounts—including transport, platform fees, and other line items—will appear here after our team confirms pricing in the dashboard.
            </Text>
          ) : useDashboardBreakdown ? (
            <View style={styles.receiptBreakdownBlock}>
              <Text style={styles.receiptBreakdownTitle}>PRICE BREAKDOWN</Text>
              <OrderPriceBreakdown orderSummary={order.orderSummary} panel />
            </View>
          ) : (
            <>
              <View style={styles.totalDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>{getPrimaryTotalDisplayString(order)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Download PDF Invoice */}
        <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.7} onPress={onDownloadInvoice} disabled={generating}>
          {generating ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Icon name="download" size={18} color={colors.white} />
          )}
          <Text style={styles.downloadBtnText}>{generating ? 'Generating...' : 'Download PDF Invoice'}</Text>
        </TouchableOpacity>

        {/* Contact Support */}
        <TouchableOpacity style={styles.supportBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Help')}>
          <Text style={styles.supportBtnText}>Contact Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

  /* Header */
  header: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1.25, borderBottomColor: '#DBEAFE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    borderBottomLeftRadius: 35, borderBottomRightRadius: 35,
    paddingTop: 12 + HEADER_EXTRA_TOP, paddingBottom: 20, paddingHorizontal: 21,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  headerTitleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  headerRight: { width: 44 },

  /* Receipt Card */
  receiptCard: {
    backgroundColor: colors.white, borderRadius: 20, padding: 28,
    marginTop: WINDOW_HEIGHT * 0.03, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  docIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  mineralName: { fontSize: 20, fontWeight: '800', color: colors.primary, textAlign: 'center', marginBottom: 6 },
  txDate: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 14 },
  statusPill: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 14 },
  statusPillText: { fontSize: 11, fontWeight: '700', color: colors.white, letterSpacing: 0.3 },
  receiptTotalBanner: {
    marginTop: 18,
    width: '100%',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  receiptTotalBannerLabel: { fontSize: 11, fontWeight: '700', color: '#15803D', letterSpacing: 0.8, marginBottom: 4 },
  receiptTotalBannerValue: { fontSize: 22, fontWeight: '800', color: '#14532D' },

  /* Breakdown */
  breakdownCard: {
    backgroundColor: colors.white, borderRadius: 20, padding: 24,
    marginTop: 20, borderWidth: 1, borderColor: colors.border,
  },
  breakdownTitle: {
    fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5,
    marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10,
  },
  receiptBreakdownBlock: { marginTop: 4, marginBottom: 4 },
  receiptBreakdownTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  pricingPendingNote: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: 4,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  breakdownLabel: { fontSize: 13, color: colors.textMuted },
  breakdownValue: { fontSize: 13, fontWeight: '600', color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  totalDivider: { height: 2, backgroundColor: colors.primary, marginVertical: 10 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: colors.primary },
  totalValue: { fontSize: 18, fontWeight: '800', color: colors.primary },

  /* Buttons */
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 24,
  },
  downloadBtnText: { fontSize: 14, fontWeight: '700', color: colors.white, letterSpacing: 0.3 },
  supportBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EFF6FF', borderRadius: 14, paddingVertical: 16, marginTop: 12,
  },
  supportBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 },
});
