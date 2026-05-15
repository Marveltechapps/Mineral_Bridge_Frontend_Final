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
  Platform,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
import { getOrderContactSummary } from '../../lib/services';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';
import { OrderPriceBreakdown } from '../../components/OrderPriceBreakdown';
import {
  showAppOrderPriceBreakdown,
  hasSavedPriceBreakdown,
  getPriceBreakdownRows,
  getPrimaryTotalDisplayString,
} from '../../lib/orderSummaryBreakdown';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';

// Shared institutional flow labels — app shows "Payment completed" (dashboard/API may still send "Payment Initiated").
const BUY_FLOW_STEP_LABELS = ['Order Submitted', 'Awaiting Team Contact', 'Price Confirmed', 'Payment Completed', 'Order Completed'];
const SELL_FLOW_STEP_LABELS = ['Order Submitted', 'Awaiting Team Contact', 'Sample Test Required', 'Price Confirmed', 'Payment Completed'];

const TIMELINE_LABELS_BUY = {
  1: BUY_FLOW_STEP_LABELS[0],
  2: BUY_FLOW_STEP_LABELS[1],
  3: BUY_FLOW_STEP_LABELS[2],
  4: BUY_FLOW_STEP_LABELS[3],
  5: BUY_FLOW_STEP_LABELS[4],
};

const TIMELINE_LABELS_SELL = {
  1: SELL_FLOW_STEP_LABELS[0],
  2: SELL_FLOW_STEP_LABELS[1],
  3: SELL_FLOW_STEP_LABELS[2],
  4: SELL_FLOW_STEP_LABELS[3],
  5: SELL_FLOW_STEP_LABELS[4],
};

/** Map API/dashboard status → 1-based customer-visible step (sell has 5 visible steps; logistics + order completed are hidden). */
const SELL_STATUS_TO_DISPLAY_STEP = {
  Submitted: 1,
  'Order Submitted': 1,
  'Awaiting Team Contact': 2,
  'Sample Test Required': 3,
  'Sample/Price': 3,
  'Price Confirmed': 4,
  Logistics: 4,
  'Payment Initiated': 5,
  'Payment Completed': 5,
  'Logistics In Progress': 5,
  'Order Completed': 5,
  Completed: 5,
  Complete: 5,
  Delivered: 5,
};

const BUY_STATUS_TO_DISPLAY_STEP = {
  Submitted: 1,
  'Order Submitted': 1,
  'Awaiting Team Contact': 2,
  'Price Confirmed': 3,
  'Sample/Price': 3,
  Contact: 2,
  Logistics: 4,
  'Payment Initiated': 4,
  'Payment Completed': 4,
  'Order Completed': 5,
  Completed: 5,
  Complete: 5,
  Delivered: 5,
};

const STATUS_MAP = {
  Submitted: 'Submitted',
  Contact: 'Awaiting Contact',
  'Sample/Price': 'Sample Collected',
  Logistics: 'Price Confirmed',
  Complete: 'Completed',
  Delivered: 'Delivered',
  // Dashboard-updated statuses (synced from Buy Management → Order progress)
  'Order Submitted': 'Order Submitted',
  'Awaiting Team Contact': 'Awaiting Team Contact',
  'Price Confirmed': 'Price Confirmed',
  'Payment Initiated': 'Payment Completed',
  'Payment Completed': 'Payment Completed',
  'Logistics In Progress': 'In progress',
  'Order Completed': 'Order Completed',
  Cancelled: 'Cancelled',
};

const STATUS_COLORS = {
  Submitted: '#64748B',
  'Awaiting Contact': '#EA7D24',
  'Sample Collected': '#2563EB',
  'Price Confirmed': '#8B5CF6',
  Completed: '#00A63E',
  Delivered: '#00A63E',
  'Order Submitted': '#64748B',
  'Awaiting Team Contact': '#EA7D24',
  'Payment Initiated': '#2563EB',
  'Payment Completed': '#2563EB',
  'In progress': '#8B5CF6',
  'Order Completed': '#00A63E',
  Cancelled: '#94A3B8',
};

function displayStatus(s) {
  if (s == null || s === '') return 'Submitted';
  const key = String(s).trim();
  if (Object.prototype.hasOwnProperty.call(STATUS_MAP, key)) return STATUS_MAP[key];
  const lower = key.toLowerCase();
  const hit = Object.keys(STATUS_MAP).find((k) => k.toLowerCase() === lower);
  if (hit) return STATUS_MAP[hit];
  return key;
}

/** API/dashboard flow step labels still say "Payment Initiated"; customers should see "Payment Completed". */
function formatPaymentStepLabelForCustomer(label) {
  const L = String(label || '').trim();
  if (!L) return L;
  if (/payment\s*initiated/i.test(L)) return 'Payment Completed';
  return L;
}

function escapeHtml(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function fmtMoney(n) {
  if (n == null || isNaN(n)) return '—';
  return `~$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtQty(q, unit) {
  if (!q) return '—';
  const n = Number(q);
  const u = unit || 'kg';
  if (n >= 1000 && u === 'kg') return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} Tons`;
  return `${n}${u}`;
}

/** Largest numeric step in timeline (dashboard uses numeric steps; some legacy entries may omit or use strings). */
function getMaxNumericTimelineStep(timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) return 0;
  let max = 0;
  for (const t of timeline) {
    const s = t?.step;
    const n = typeof s === 'number' && !Number.isNaN(s) ? s : parseInt(String(s), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return max;
}

function shouldHideSellCustomerFlowLabel(label) {
  const L = String(label || '').trim().toLowerCase();
  if (!L) return false;
  if (L.includes('logistics')) return true;
  if (L.includes('order completed')) return true;
  return false;
}

function canDownloadAssayReport(order) {
  const isSell = order.type === 'sell';
  const st = order.status || '';
  if (['Complete', 'Delivered', 'Order Completed', 'Completed', 'Payment Completed'].includes(st)) return true;
  if (isSell && /payment\s*(initiated|completed)/i.test(String(st))) return true;
  if (isSell && String(order.escrowStatus || '').toLowerCase() === 'released') return true;
  const max = getMaxNumericTimelineStep(order.timeline);
  if (isSell) {
    // Sell numeric timeline: step 5 = payment (dashboard); allow once payment stage is recorded
    if (max >= 5) return true;
  } else if (max >= 5) return true;
  const fp = order.flowSteps;
  if (Array.isArray(fp) && fp.length > 0) {
    const paymentDone = fp.some((step) => {
      const lab = String(step?.label || '');
      return /payment\s*(initiated|completed)/i.test(lab) && (step.completed || step.active);
    });
    if (isSell && paymentDone) return true;
    const last = fp[fp.length - 1];
    const lab = String(last?.label || '');
    if (/order completed|^completed$/i.test(lab) && (last.completed || last.active)) return true;
  }
  return false;
}

/** When order has flowSteps (from dashboard), derive current step and step list for display. */
function getFlowStepsProgress(order) {
  const steps = order.flowSteps;
  if (!Array.isArray(steps) || steps.length === 0) return null;
  let currentStep = 1;
  steps.forEach((s, i) => {
    if (s && (s.completed || s.active)) currentStep = i + 1;
  });
  const totalSteps = steps.length;
  const progressPct = Math.round((currentStep / totalSteps) * 100);
  return { steps, currentStep, totalSteps, progressPct };
}

/** Sell orders: hide logistics + order completed steps in the customer app; recompute progress from visible steps. */
function getCustomerSellFlowProgress(order) {
  const raw = order.flowSteps;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (order.type !== 'sell') return getFlowStepsProgress(order);
  const visible = raw.filter((s) => !shouldHideSellCustomerFlowLabel(s?.label));
  if (visible.length === 0) return null;
  if (visible.length === raw.length) return getFlowStepsProgress(order);
  const anyHiddenTouched = raw.some(
    (s) => shouldHideSellCustomerFlowLabel(s?.label) && (s.completed || s.active),
  );
  let currentStep = 1;
  visible.forEach((s, i) => {
    if (s && (s.completed || s.active)) currentStep = i + 1;
  });
  if (anyHiddenTouched) currentStep = visible.length;
  const totalSteps = visible.length;
  const progressPct = totalSteps ? Math.round((currentStep / totalSteps) * 100) : 0;
  return { steps: visible, currentStep, totalSteps, progressPct };
}

/** Omit internal testing rows from the customer-facing assay PDF timeline. */
function shouldOmitAssayPdfTimelineEntry(t) {
  const blob = [t?.label, t?.note, t?.step, t?.status]
    .filter(Boolean)
    .map((x) => String(x).toLowerCase())
    .join(' ');
  if (/testing\s*assigned/i.test(blob)) return true;
  if (/testing\s*verified/i.test(blob)) return true;
  if (/testing\s*details?\s*sent?/i.test(blob)) return true;
  if (/testing\s*details?\s*send/i.test(blob)) return true;
  return false;
}

/** Single-line step title for PDF — no subtitle/detail lines under the step (common under step 8 / Order Completed). */
function assayPdfTimelineLabel(t) {
  const raw = formatPaymentStepLabelForCustomer(t.label);
  const oneLine = String(raw || '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const stepStr = String(t?.step ?? '').trim();
  const stepNum = parseInt(stepStr, 10);
  const isStep8 = stepStr === '8' || (!Number.isNaN(stepNum) && stepNum === 8);
  const isOrderDone = /order\s*completed/i.test(oneLine) || isStep8;
  if (isOrderDone) return 'Order Completed';
  return oneLine;
}

function assayPdfFormatTimelineDate(d) {
  if (d == null || d === '') return '';
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/** Dashboard sometimes uses `timestamp` instead of `at`; step 8 may need order.completedAt / updatedAt. */
function assayPdfTimelineDateValue(t, order) {
  const raw = t.at ?? t.timestamp ?? t.completedAt;
  let formatted = assayPdfFormatTimelineDate(raw);
  if (formatted) return formatted;
  const stepStr = String(t?.step ?? '').trim();
  const stepNum = parseInt(stepStr, 10);
  const lbl = String(t?.label || '');
  const isFinal =
    stepStr === '8' || (!Number.isNaN(stepNum) && stepNum === 8) || /order\s*completed/i.test(lbl);
  if (isFinal) {
    formatted = assayPdfFormatTimelineDate(order.completedAt ?? order.updatedAt);
    if (formatted) return formatted;
  }
  return '—';
}

/** Timeline rows for PDF: no numeric steps > 8; trim everything after the last step 8 / Order Completed row. */
function prepareAssayPdfTimeline(order) {
  let list = (order.timeline || []).filter((t) => !shouldOmitAssayPdfTimelineEntry(t));
  list = list.filter((t) => {
    const n = parseInt(String(t?.step ?? '').trim(), 10);
    if (!Number.isFinite(n)) return true;
    return n <= 8;
  });
  list.sort((a, b) => {
    const na = parseInt(String(a?.step ?? '').trim(), 10);
    const nb = parseInt(String(b?.step ?? '').trim(), 10);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    if (Number.isFinite(na)) return -1;
    if (Number.isFinite(nb)) return 1;
    return 0;
  });
  let end = list.length;
  for (let i = list.length - 1; i >= 0; i--) {
    const t = list[i];
    const n = parseInt(String(t?.step ?? '').trim(), 10);
    if (n === 8 || /order\s*completed/i.test(String(t?.label || ''))) {
      end = i + 1;
      break;
    }
  }
  return list.slice(0, end);
}

function buildAssayHTML(order) {
  const isSell = order.type === 'sell';
  const status = displayStatus(order.status);
  const hasDash = showAppOrderPriceBreakdown() && hasSavedPriceBreakdown(order);
  const summaryMain = hasSavedPriceBreakdown(order)
    ? getPrimaryTotalDisplayString(order)
    : 'Amounts appear after our team confirms pricing (including fees) in the dashboard.';
  const badgeColor = STATUS_COLORS[status] || STATUS_COLORS[order.status] || '#64748B';
  const timelineRows = prepareAssayPdfTimeline(order)
    .map((t) => {
      const at = assayPdfTimelineDateValue(t, order);
      const lbl = assayPdfTimelineLabel(t);
      return `<tr><td class="label">Step ${escapeHtml(t.step)}: ${escapeHtml(lbl)}</td><td class="value">${escapeHtml(at)}</td></tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #1E293B; }
      h1 { font-size: 22px; text-align: center; color: #0F172A; margin-bottom: 4px; }
      .oid { text-align: center; color: #64748B; font-size: 13px; margin-bottom: 20px; }
      .badge { display: inline-block; padding: 6px 16px; border-radius: 14px; color: #fff; font-weight: 700; font-size: 12px; }
      .section { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #64748B; margin: 24px 0 12px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      td { padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 13px; }
      td.label { color: #64748B; width: 40%; }
      td.value { color: #0F172A; font-weight: 600; }
      .summary { background: #F8FAFC; border-radius: 12px; padding: 20px; margin-top: 20px; }
      .amount { font-size: 26px; font-weight: 800; color: #0F172A; }
      .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #94A3B8; }
    </style></head>
    <body>
      <h1>${escapeHtml(order.mineralName || 'Order')}</h1>
      <p class="oid">${escapeHtml(order.orderId || '—')}</p>
      <p style="text-align:center"><span class="badge" style="background:${escapeHtml(badgeColor)}">${escapeHtml(status.toUpperCase())}</span></p>

      <p class="section">ORDER DETAILS</p>
      <table>
        <tr><td class="label">Type</td><td class="value">${escapeHtml((order.type || '').toUpperCase())}</td></tr>
        <tr><td class="label">Mineral</td><td class="value">${escapeHtml(order.mineralName || '—')}</td></tr>
        <tr><td class="label">Mineral Type</td><td class="value">${escapeHtml(order.mineralType || '—')}</td></tr>
        <tr><td class="label">Quantity</td><td class="value">${escapeHtml(fmtQty(order.quantity, order.unit))}</td></tr>
        <tr><td class="label">Delivery Method</td><td class="value">${escapeHtml(order.deliveryMethod || '—')}</td></tr>
        ${order.buyerCategory ? `<tr><td class="label">Buyer Category</td><td class="value">${escapeHtml(order.buyerCategory)}</td></tr>` : ''}
        <tr><td class="label">Order Date</td><td class="value">${escapeHtml(order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—')}</td></tr>
      </table>

      <p class="section">TRANSACTION SUMMARY</p>
      <div class="summary">
        <p style="font-size:11px;color:#64748B;margin:0 0 4px">${hasSavedPriceBreakdown(order) ? (isSell ? 'CONFIRMED PAYOUT' : 'TOTAL DUE') : 'PRICING'}</p>
        <p class="amount">${escapeHtml(summaryMain)}</p>
        ${hasDash
          ? (() => {
              const br = getPriceBreakdownRows(order.orderSummary);
              if (br.length === 0) return '';
              const lines = br
                .filter((r) => !r.isTotal)
                .map((r) => `<p style="font-size:13px;color:#64748B;margin:6px 0 0">${escapeHtml(r.label)}: ${escapeHtml(r.value)}</p>`)
                .join('');
              const tot = br.find((r) => r.isTotal);
              const totalLine = tot
                ? `<p style="font-size:15px;color:#0F172A;font-weight:800;margin:12px 0 0">${escapeHtml(tot.label)}: ${escapeHtml(tot.value)}</p>`
                : '';
              return lines + totalLine;
            })()
          : ''}
      </div>

      <p class="section">TIMELINE</p>
      <table>
        ${timelineRows}
      </table>

      <p class="footer">Generated on ${escapeHtml(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))} — Mineral Bridge</p>
    </body></html>
  `;
}

export default function OrderDetailScreen({ navigation, route }) {
  const orderId = route?.params?.orderId;
  const [order, setOrder] = useState(route?.params?.order || null);
  const [loading, setLoading] = useState(!order);
  const [generating, setGenerating] = useState(false);
  const [contactSummary, setContactSummary] = useState(null);

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
      (async () => {
        try {
          const summary = await getOrderContactSummary(orderId);
          setContactSummary(summary);
        } catch {
          setContactSummary(null);
        }
      })();
      return undefined;
    }, [fetchOrder, orderId]),
  );

  const onDownloadReport = async () => {
    if (!order) return;
    if (!canDownloadAssayReport(order)) {
      Alert.alert(
        'Report Not Available',
        'The assay report will be available after your order is marked complete (or the final step is confirmed in the timeline).',
      );
      return;
    }
    try {
      setGenerating(true);
      const html = buildAssayHTML(order);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (!uri) {
        Alert.alert('Error', 'Could not create the PDF. Please try again.');
        return;
      }
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) {
          Alert.alert('Error', 'The report file was not found after creation. Please try again.');
          return;
        }
      } catch {
        /* getInfoAsync can fail on some builds; uri from print is still valid */
      }

      const sharePdf = async () => {
        const opts = { mimeType: 'application/pdf', dialogTitle: 'Assay report' };
        if (Platform.OS === 'ios') opts.UTI = 'com.adobe.pdf';
        await Sharing.shareAsync(uri, opts);
      };

      if (await Sharing.isAvailableAsync()) {
        try {
          await sharePdf();
        } catch (shareErr) {
          try {
            if (Platform.OS === 'ios') {
              await Share.share({ url: uri, title: 'Assay report' });
            } else {
              await Share.share({ message: uri, title: 'Assay report' });
            }
          } catch {
            Alert.alert(
              'Sharing unavailable',
              'The PDF was created but the share sheet could not be opened. Try again or update the app.',
            );
          }
        }
      } else {
        try {
          await Share.share(
            Platform.OS === 'ios'
              ? { url: uri, title: 'Assay report' }
              : { message: `Assay report: ${uri}`, title: 'Assay report' },
          );
        } catch {
          Alert.alert('PDF ready', 'Save or share is not available on this device.');
        }
      }
    } catch (err) {
      const raw = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
      const friendly =
        /print|null|webview|html/i.test(raw) && raw.length < 120
          ? 'The report could not be generated. If this keeps happening, try a shorter mineral name or contact support.'
          : 'Something went wrong while creating or sharing the report. Please try again.';
      Alert.alert('Download', friendly);
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
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>Order not found</Text>
      </View>
    );
  }

  const isSell = order.type === 'sell';
  const status = displayStatus(order.status);
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS[order.status] || '#64748B';
  const flowProgress = order.flowSteps && order.flowSteps.length > 0
    ? (isSell ? getCustomerSellFlowProgress(order) : getFlowStepsProgress(order))
    : null;
  const totalSteps = flowProgress ? flowProgress.totalSteps : 5;
  let currentStep;
  if (flowProgress) {
    currentStep = flowProgress.currentStep;
  } else {
    const rawStatus = order.status || 'Submitted';
    const normalizedStatus =
      rawStatus === 'Completed'
        ? 'Order Completed'
        : rawStatus === 'Submitted'
          ? 'Order Submitted'
          : rawStatus;
    const map = isSell ? SELL_STATUS_TO_DISPLAY_STEP : BUY_STATUS_TO_DISPLAY_STEP;
    currentStep = map[normalizedStatus] ?? map[rawStatus];
    if (currentStep == null) {
      const max = getMaxNumericTimelineStep(order.timeline);
      if (isSell) {
        currentStep = max >= 6 ? 5 : Math.min(Math.max(max, 1), 5);
      } else {
        currentStep = max >= 1 ? Math.min(Math.max(max, 1), 5) : 1;
      }
    }
  }
  const progressPct = flowProgress ? flowProgress.progressPct : Math.round((currentStep / totalSteps) * 100);
  const labels = flowProgress ? null : (isSell ? TIMELINE_LABELS_SELL : TIMELINE_LABELS_BUY);

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
              <Icon name="receipt" size={20} color={colors.primary} />
            </View>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Info Card */}
        <View style={styles.topCard}>
          <Text style={styles.mineralName}>{order.mineralName || 'Order'}</Text>
          <Text style={styles.orderIdText}>{order.orderId || '—'}</Text>
          {order.createdAt && (
            <Text style={styles.orderDateText}>
              {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
            </Text>
          )}

          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>● {status.toUpperCase()}</Text>
          </View>
          {order.contactVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓ Contact verified by team</Text>
            </View>
          )}

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressText}>{progressPct}% PROCESSING COMPLETE</Text>
          </View>
        </View>

        {/* Timeline */}
        <Text style={[styles.sectionTitle, { marginTop: WINDOW_HEIGHT * 0.03 }]}>
          {isSell ? 'INSTITUTIONAL SELL FLOW' : 'INSTITUTIONAL BUY FLOW'}
        </Text>

        <View style={styles.timeline}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
            const tlEntry = (order.timeline || []).find((t) => {
              if (t.step === step) return true;
              if (isSell && step === 5 && t.step === 6) return true;
              return false;
            });
            const reached = currentStep >= step;
            const isCurrent = currentStep === step;
            const date = tlEntry && tlEntry.at ? fmtDate(tlEntry.at) : '';
            const stepLabel = flowProgress && flowProgress.steps[step - 1]
              ? (formatPaymentStepLabelForCustomer(flowProgress.steps[step - 1].label) || `Step ${step}`)
              : (labels ? labels[step] : `Step ${step}`);

            const details = [];
            if (step === 1) {
              if (order.quantity) details.push(`Quantity: ${fmtQty(order.quantity, order.unit)}`);
              if (order.mineralType) details.push(`Type: ${order.mineralType}`);
              if (order.deliveryMethod) details.push(`Delivery: ${order.deliveryMethod}`);
            } else if (step === 2) {
              details.push(isSell ? 'Team will contact for sample collection' : 'Team will verify requirements');
            } else if (step === 3) {
              if (isSell) {
                if (order.mineralType) details.push(`Mineral: ${order.mineralType}`);
                details.push('Sample collected for assay');
              } else {
                if (hasSavedPriceBreakdown(order)) {
                  details.push(`Amount: ${getPrimaryTotalDisplayString(order)}`);
                }
                if (order.buyerCategory) details.push(`Buyer: ${order.buyerCategory}`);
              }
            } else if (step === 4) {
              if (isSell) {
                if (hasSavedPriceBreakdown(order)) {
                  details.push(`Amount: ${getPrimaryTotalDisplayString(order)}`);
                }
              } else {
                if (order.escrowStatus) details.push(`Escrow: ${order.escrowStatus}`);
              }
            } else if (step === 5) {
              if (isSell) {
                if (order.escrowStatus) details.push(`Escrow: ${order.escrowStatus}`);
                if (order.deliveryMethod) details.push(`Delivery: ${order.deliveryMethod}`);
              } else if (order.deliveryMethod) {
                details.push(`Delivery: ${order.deliveryMethod}`);
              }
            }

            return (
              <View key={step} style={styles.tlRow}>
                <View style={styles.tlLeft}>
                  <View style={[styles.tlDot, reached ? styles.tlDotActive : styles.tlDotInactive]} />
                  {step < totalSteps && <View style={[styles.tlLine, reached ? styles.tlLineActive : styles.tlLineInactive]} />}
                </View>
                <View style={styles.tlContent}>
                  <View style={styles.tlHeader}>
                    <Text style={[styles.tlLabel, !reached && styles.tlLabelInactive]}>
                      {step}. {stepLabel}
                    </Text>
                    {isCurrent ? (
                      <Text style={styles.tlCurrent}>CURRENT</Text>
                    ) : date ? (
                      <Text style={styles.tlDate}>{date}</Text>
                    ) : null}
                  </View>
                  {reached && details.length > 0 && details.map((d, i) => (
                    <Text key={i} style={styles.tlDetail}>• {d}</Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {contactSummary?.lastContact && (
          <View style={styles.contactCard}>
            <Text style={styles.sectionTitle}>LAST CONTACT FROM TEAM</Text>
            <View style={styles.contactMetaRow}>
              <Text style={styles.contactMethod}>{contactSummary.lastContact.contactMethod}</Text>
              {!!contactSummary.lastContact.admin && (
                <Text style={styles.contactAdmin}>{contactSummary.lastContact.admin}</Text>
              )}
              {contactSummary.lastContact.at && (
                <Text style={styles.contactDate}>
                  {new Date(contactSummary.lastContact.at).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
            </View>
            {!!contactSummary.lastContact.note && (
              <Text style={styles.contactNote}>{contactSummary.lastContact.note}</Text>
            )}
            {!!contactSummary.lastContact.conversationScenario && (
              <Text style={styles.contactConversation}>{contactSummary.lastContact.conversationScenario}</Text>
            )}
          </View>
        )}

        {/* Transaction Summary */}
        <View style={styles.summaryHeader}>
          <Text style={styles.sectionTitle}>TRANSACTION SUMMARY</Text>
          {showAppOrderPriceBreakdown() && hasSavedPriceBreakdown(order) ? (
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedBadgeText}>CONFIRMED</Text>
            </View>
          ) : (
            <View style={styles.provisionalBadge}>
              <Text style={styles.provisionalText}>PROVISIONAL</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryCard}>
          {hasSavedPriceBreakdown(order) ? (
            <>
              <Text style={styles.payoutLabel}>{isSell ? 'CONFIRMED PAYOUT' : 'TOTAL DUE'}</Text>
              <Text style={styles.payoutAmount}>{getPrimaryTotalDisplayString(order)}</Text>
              {showAppOrderPriceBreakdown() && (
                <OrderPriceBreakdown orderSummary={order.orderSummary} panel />
              )}
            </>
          ) : (
            <Text style={styles.pricingPendingNote}>
              Final pricing—including transport, platform fees, and other line items from our desk—will appear here after your order is confirmed in Price Confirmed.
            </Text>
          )}

          {order.mineralName && (
            <View style={styles.checkRow}>
              <Icon name="checkCircle" size={18} color="#00A63E" />
              <Text style={styles.checkText}>{order.mineralName}</Text>
            </View>
          )}
          {order.mineralType && (
            <View style={styles.checkRow}>
              <Icon name="checkCircle" size={18} color="#00A63E" />
              <Text style={styles.checkText}>Type: {order.mineralType}</Text>
            </View>
          )}
          {order.quantity && (
            <View style={styles.checkRow}>
              <Icon name="checkCircle" size={18} color="#00A63E" />
              <Text style={styles.checkText}>Quantity: {fmtQty(order.quantity, order.unit)}</Text>
            </View>
          )}
          {order.deliveryMethod && (
            <View style={styles.checkRow}>
              <Icon name="checkCircle" size={18} color="#00A63E" />
              <Text style={styles.checkText}>Delivery: {order.deliveryMethod}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.7} onPress={onDownloadReport} disabled={generating}>
          {generating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon name="document" size={18} color={colors.primary} />
          )}
          <Text style={styles.downloadText}>{generating ? 'GENERATING...' : 'DOWNLOAD ASSAY REPORT'}</Text>
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

  /* ── Header ── */
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  headerTitleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  headerRight: { width: 44 },

  /* ── Top Card ── */
  topCard: {
    marginTop: WINDOW_HEIGHT * 0.03,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  mineralName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  orderIdText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  orderDateText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: WINDOW_HEIGHT * 0.01,
    marginBottom: 14,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },

  /* ── Progress ── */
  progressWrap: { marginBottom: 0 },
  progressTrack: {
    height: 8,
    backgroundColor: '#D6E4F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  /* ── Timeline ── */
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  timeline: { marginBottom: WINDOW_HEIGHT * 0.01 },
  tlRow: { flexDirection: 'row', minHeight: 70 },
  tlLeft: { width: 28, alignItems: 'center' },
  tlDot: { width: 14, height: 14, borderRadius: 7 },
  tlDotActive: { backgroundColor: '#00A63E' },
  tlDotInactive: { backgroundColor: '#CBD5E1' },
  tlLine: { width: 2, flex: 1, marginVertical: 2 },
  tlLineActive: { backgroundColor: '#00A63E' },
  tlLineInactive: { backgroundColor: '#E2E8F0' },
  tlContent: { flex: 1, paddingLeft: 12, paddingBottom: 16 },
  tlHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tlLabel: { fontSize: 14, fontWeight: '700', color: colors.primary, flex: 1 },
  tlLabelInactive: { color: colors.textLight },
  tlDate: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  tlCurrent: { fontSize: 11, fontWeight: '800', color: '#EA7D24' },
  tlDetail: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  /* ── Summary ── */
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  provisionalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  provisionalText: { fontSize: 10, fontWeight: '800', color: DROPDOWN_BLUE, letterSpacing: 0.5 },
  confirmedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
  },
  confirmedBadgeText: { fontSize: 10, fontWeight: '800', color: '#15803D', letterSpacing: 0.5 },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  contactCard: {
    marginTop: 4,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  contactMethod: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  contactAdmin: {
    fontSize: 12,
    color: colors.textMuted,
  },
  contactDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  contactNote: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  contactConversation: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 18,
  },
  payoutLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  payoutAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 20,
  },
  pricingPendingNote: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginBottom: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  checkText: { fontSize: 14, color: colors.primary },

  /* ── Download ── */
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    marginBottom: 20,
  },
  downloadText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
});
