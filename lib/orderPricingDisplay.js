import { USE_CONFIRMED_PRICE_AUTHORITY } from '../config/pricing';

export function getConfirmedPriceString(order) {
  if (!order || typeof order !== 'object') return null;
  const c = order.confirmedPrice;
  if (c != null && String(c).trim() !== '') return String(c).trim();
  const t = order.orderSummary && order.orderSummary.total;
  if (t != null && String(t).trim() !== '') return String(t).trim();
  return null;
}

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function resolveLegacyAmountNumber(item) {
  if (item == null || typeof item !== 'object') return null;
  if (item.totalDue != null && !Number.isNaN(Number(item.totalDue))) return Number(item.totalDue);
  if (item.estimatedPayout != null && !Number.isNaN(Number(item.estimatedPayout))) return Number(item.estimatedPayout);
  if (item.subtotal != null && !Number.isNaN(Number(item.subtotal))) return Number(item.subtotal);
  if (item.amount) {
    const parsed = String(item.amount).replace(/[^0-9.]/g, '');
    const num = parseFloat(parsed);
    if (!Number.isNaN(num) && num > 0) return num;
  }
  return null;
}

/**
 * @returns {{ mode: 'confirmed', display: string } | { mode: 'pending', display: string } | { mode: 'legacy', display: string, amountNumber: number|null }}
 */
export function resolveOrderAmountForDisplay(order) {
  if (USE_CONFIRMED_PRICE_AUTHORITY) {
    const cp = getConfirmedPriceString(order);
    if (cp) return { mode: 'confirmed', display: cp };
    return { mode: 'pending', display: 'Price pending' };
  }
  const n = resolveLegacyAmountNumber(order);
  return { mode: 'legacy', display: n != null ? fmtMoney(n) : '—', amountNumber: n };
}

export function parseMoneyToNumber(displayString) {
  if (displayString == null || typeof displayString !== 'string') return null;
  const parsed = displayString.replace(/[^0-9.-]/g, '');
  const num = parseFloat(parsed);
  return Number.isFinite(num) ? num : null;
}
