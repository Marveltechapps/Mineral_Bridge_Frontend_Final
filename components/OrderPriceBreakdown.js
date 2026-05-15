import { View, Text, StyleSheet } from 'react-native';
import { getPriceBreakdownRows } from '../lib/orderSummaryBreakdown';

/**
 * @param {object} props
 * @param {object} [props.orderSummary]
 * @param {boolean} [props.compact] — transaction list: titled panel, full width
 * @param {boolean} [props.panel] — order detail: soft panel under total, no section title
 */
export function OrderPriceBreakdown({ orderSummary, compact, panel }) {
  const rows = getPriceBreakdownRows(orderSummary);
  if (rows.length === 0) return null;

  const isList = !!compact;
  const isPanel = !!panel;

  return (
    <View style={[isList && styles.listWrap]}>
      {isList && <Text style={styles.listSectionTitle}>PRICE BREAKDOWN</Text>}
      <View
        style={[
          styles.inner,
          isList && styles.innerList,
          isPanel && styles.innerPanel,
          !isList && !isPanel && styles.innerPlain,
        ]}
      >
        {rows.map((r, i) => (
          <View
            key={r.key}
            style={[
              styles.row,
              i > 0 && !r.isTotal && styles.rowDivider,
              r.isTotal && styles.rowTotal,
            ]}
          >
            <Text
              style={[styles.lab, isList && styles.labList, r.isTotal && styles.labTotal]}
              numberOfLines={3}
            >
              {r.label}
            </Text>
            <Text
              style={[styles.val, isList && styles.valList, r.isTotal && styles.valTotal]}
              numberOfLines={2}
            >
              {r.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    width: '100%',
    marginTop: 4,
  },
  listSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 4,
  },
  inner: {
    gap: 0,
  },
  innerList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  innerPanel: {
    marginTop: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  innerPlain: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  rowTotal: {
    marginTop: 6,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  lab: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 18,
  },
  labList: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  labTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#14532D',
  },
  val: {
    maxWidth: '48%',
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
    lineHeight: 18,
  },
  valList: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  valTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15803D',
  },
});
