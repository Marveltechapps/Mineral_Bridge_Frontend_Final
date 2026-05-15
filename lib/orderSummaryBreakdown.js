import { SHOW_APP_ORDER_PRICE_BREAKDOWN } from '../config/pricing';
import { resolveOrderAmountForDisplay } from './orderPricingDisplay';

export function showAppOrderPriceBreakdown() {
  return SHOW_APP_ORDER_PRICE_BREAKDOWN;
}

/** Saved Price Confirmed breakdown from dashboard (orderSummary.total required). */
export function hasSavedPriceBreakdown(order) {
  const s = order?.orderSummary;
  if (!s || typeof s !== 'object') return false;
  return String(s.total ?? '').trim() !== '';
}

/**
 * Rows match Buy/Sell Management → Price Confirmed (values shown as saved, e.g. "$1,200.00").
 * @returns {{ key: string, label: string, value: string, isTotal?: boolean }[]}
 */
export function getPriceBreakdownRows(orderSummary) {
  if (!orderSummary || typeof orderSummary !== 'object') return [];
  const rows = [];
  const sub = String(orderSummary.subtotal ?? '').trim();
  if (sub) {
    const lab = String(orderSummary.subtotalLabel ?? '').trim();
    rows.push({ key: 'subtotal', label: lab || 'Subtotal', value: sub });
  }
  const tax = String(orderSummary.tax ?? '').trim();
  if (tax) rows.push({ key: 'tax', label: 'Tax', value: tax });
  const ship = String(orderSummary.shippingCost ?? '').trim();
  if (ship) rows.push({ key: 'shipping', label: 'Secure transport', value: ship });
  const pf = String(orderSummary.platformFee ?? '').trim();
  if (pf) {
    const pct = orderSummary.platformFeePercent;
    const hasPct = pct != null && String(pct).trim() !== '';
    rows.push({
      key: 'platform',
      label: hasPct ? `Platform fee (${pct}%)` : 'Platform fee',
      value: pf,
    });
  }
  const tot = String(orderSummary.total ?? '').trim();
  if (tot) {
    const cur = String(orderSummary.currency ?? '').trim();
    const value = cur && !tot.toUpperCase().includes(cur.toUpperCase()) ? `${tot} ${cur}` : tot;
    rows.push({ key: 'total', label: 'Total due', value, isTotal: true });
  }
  return rows;
}

/** Headline amount for list rows: saved total if breakdown exists and feature on, else legacy resolver. */
export function getPrimaryTotalDisplayString(order) {
  if (showAppOrderPriceBreakdown() && hasSavedPriceBreakdown(order)) {
    const t = String(order.orderSummary.total).trim();
    const cur = String(order.orderSummary.currency ?? '').trim();
    return cur && !t.toUpperCase().includes(cur.toUpperCase()) ? `${t} ${cur}` : t;
  }
  return resolveOrderAmountForDisplay(order).display;
}
