import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';
import { OrderPriceBreakdown } from '../../components/OrderPriceBreakdown';
import {
  showAppOrderPriceBreakdown,
  hasSavedPriceBreakdown,
  getPrimaryTotalDisplayString,
} from '../../lib/orderSummaryBreakdown';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';

const TYPE_TABS = ['ALL TYPES', 'BUY', 'SELL'];
const SORT_OPTIONS = ['Newest', 'Oldest'];

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

function fmtQty(q, unit) {
  if (!q) return '';
  const n = Number(q);
  const u = unit || 'kg';
  if (n >= 1000 && u === 'kg') return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} Tons`;
  return `${n}${u}`;
}

export default function TransactionHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL TYPES');
  const [sortBy, setSortBy] = useState('Newest');
  const [showSort, setShowSort] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      load();
      return undefined;
    }, [load]),
  );

  const filtered = useMemo(() => {
    let list = [...orders];

    if (typeFilter === 'BUY') list = list.filter((o) => o.type === 'buy');
    else if (typeFilter === 'SELL') list = list.filter((o) => o.type === 'sell');

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          (o.mineralName || '').toLowerCase().includes(q) ||
          (o.orderId || '').toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db_ = new Date(b.createdAt).getTime();
      return sortBy === 'Oldest' ? da - db_ : db_ - da;
    });

    return list;
  }, [orders, typeFilter, search, sortBy]);

  const renderCard = ({ item }) => {
    const isSell = item.type === 'sell';
    const displaySt = mapStatus(item.status);
    const stColor = STATUS_COLORS[displaySt] || '#64748B';
    const showAmounts = hasSavedPriceBreakdown(item);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('TransactionDetail', { orderId: item.id, order: item })}
      >
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, isSell ? styles.typeBadgeSell : styles.typeBadgeBuy]}>
            <Text style={[styles.typeBadgeText, isSell ? styles.typeBadgeTextSell : styles.typeBadgeTextBuy]}>
              {isSell ? 'SELL' : 'BUY'}
            </Text>
          </View>
          <Text style={styles.txId}>{item.orderId || '—'}</Text>
          <View style={[styles.statusPill, { backgroundColor: stColor }]}>
            <Text style={styles.statusPillText}>{displaySt}</Text>
          </View>
        </View>

        <Text style={styles.mineralName}>
          {item.mineralName || 'Order'}{item.quantity ? ` (${fmtQty(item.quantity, item.unit)})` : ''}
        </Text>
        <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>

        {showAmounts ? (
          <View style={styles.amountSection}>
            {showAppOrderPriceBreakdown() ? (
              <OrderPriceBreakdown orderSummary={item.orderSummary} compact />
            ) : (
              <View style={styles.singleTotalShell}>
                <Text style={styles.singleTotalLabel}>Total</Text>
                <Text style={styles.singleTotalValue}>{getPrimaryTotalDisplayString(item)}</Text>
              </View>
            )}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.receiptRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('TransactionDetail', { orderId: item.id, order: item })}
        >
          <Text style={styles.receiptLink}>View receipt</Text>
          <Text style={styles.receiptChevron}>›</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
            <Text style={styles.headerTitle}>TRANSACTION HISTORY</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      {/* Search + Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchWrap}>
          <Icon name="search" size={18} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            placeholderTextColor={colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterRow}>
          {TYPE_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.typeTab, typeFilter === tab && styles.typeTabActive]}
              onPress={() => setTypeFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.typeTabText, typeFilter === tab && styles.typeTabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.sortWrap}>
            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() => setShowSort(!showSort)}
              activeOpacity={0.7}
            >
              <Text style={styles.sortBtnText}>{sortBy.toUpperCase()}</Text>
              <Icon name="chevronDown" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sort dropdown overlay */}
      {showSort && (
        <>
          <Pressable style={styles.sortOverlayBg} onPress={() => setShowSort(false)} />
          <View style={styles.sortDropdown}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.sortOption}
                onPress={() => { setSortBy(opt); setShowSort(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.sortOptionText, sortBy === opt && styles.sortOptionActive]}>{opt}</Text>
                {sortBy === opt && <Icon name="check" size={16} color={DROPDOWN_BLUE} />}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="receipt" size={40} color={colors.textLight} />
              <Text style={styles.emptyText}>No verified transactions yet. Missing traceability can reduce trust.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
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
  headerTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  headerRight: { width: 44 },

  /* Filters */
  filtersContainer: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: colors.background },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.primary, padding: 0 },

  filterRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 18,
    gap: 10, zIndex: 100, elevation: 10,
  },
  typeTab: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
  },
  typeTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeTabText: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  typeTabTextActive: { color: colors.white },

  /* Sort */
  sortWrap: { marginLeft: 'auto', position: 'relative', zIndex: 10, paddingLeft: 6 },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  sortBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
  sortOverlayBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998,
  },
  sortDropdown: {
    position: 'absolute',
    top: HEADER_EXTRA_TOP + 20 + 56 + 14 + 44 + 6,
    right: 20,
    backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 4, minWidth: 150, zIndex: 999, elevation: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10,
  },
  sortOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  sortOptionText: { fontSize: 14, color: colors.text },
  sortOptionActive: { fontWeight: '700', color: DROPDOWN_BLUE },

  listContent: { paddingHorizontal: 20, paddingBottom: 48 },

  /* Card */
  card: {
    backgroundColor: colors.white, borderRadius: 18, padding: 22,
    marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  typeBadgeBuy: { backgroundColor: '#EFF6FF' },
  typeBadgeSell: { backgroundColor: '#FFF7ED' },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  typeBadgeTextBuy: { color: '#2563EB' },
  typeBadgeTextSell: { color: '#EA580C' },
  txId: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textMuted },
  statusPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14 },
  statusPillText: { fontSize: 11, fontWeight: '700', color: colors.white, letterSpacing: 0.3 },

  mineralName: { fontSize: 17, fontWeight: '700', color: colors.primary, marginBottom: 4, marginTop: 2 },
  txDate: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  amountSection: { width: '100%', marginTop: 8 },
  singleTotalShell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  singleTotalLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 0.3 },
  singleTotalValue: { fontSize: 17, fontWeight: '800', color: colors.primary },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  receiptLink: { fontSize: 14, fontWeight: '700', color: '#00A63E' },
  receiptChevron: { fontSize: 18, fontWeight: '600', color: '#00A63E', marginTop: -2 },

  /* Empty */
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
