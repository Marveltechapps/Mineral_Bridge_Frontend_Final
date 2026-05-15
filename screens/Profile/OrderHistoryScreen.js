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
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
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

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatQty(q) {
  if (!q) return '';
  const n = Number(q);
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} Tons`;
  return `${n}kg`;
}

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL TYPES');
  const [sortBy, setSortBy] = useState('Newest');
  const [showSort, setShowSort] = useState(false);
  const [requestingCb, setRequestingCb] = useState(null);
  const [todayCallbacks, setTodayCallbacks] = useState({});

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      (async () => {
        try {
          const res = await fetchWithAuth('/api/callbacks?status=pending');
          if (res.ok) {
            const data = await res.json();
            const today = new Date().toDateString();
            const map = {};
            data.forEach((c) => {
              if (c.orderId && new Date(c.createdAt).toDateString() === today) {
                map[c.orderId] = true;
              }
            });
            setTodayCallbacks(map);
          } else {
            setTodayCallbacks({});
          }
        } catch {
          setTodayCallbacks({});
        }
      })();
      return undefined;
    }, []),
  );

  const onRequestCallback = async (item) => {
    if (requestingCb === item.id) return;
    if (todayCallbacks[item.id]) {
      Alert.alert('Already Requested', 'You have already requested a callback for this order today. Please try again tomorrow.');
      return;
    }
    setRequestingCb(item.id);
    try {
      const res = await fetchWithAuth('/api/callbacks', {
        method: 'POST',
        body: JSON.stringify({ orderId: item.id, orderLabel: item.mineralName || item.orderId }),
      });
      if (res.ok) {
        setTodayCallbacks((prev) => ({ ...prev, [item.id]: true }));
        Alert.alert('Callback Requested', 'Your callback request has been sent. The team will contact you shortly.');
      } else {
        Alert.alert('Error', 'Failed to submit callback request. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    }
    setRequestingCb(null);
  };

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

  const onBack = () => navigation.goBack();

  const renderCard = ({ item }) => {
    const isSell = item.type === 'sell';
    const status = displayStatus(item.status);
    const statusColor = STATUS_COLORS[status] || STATUS_COLORS[item.status] || '#64748B';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, isSell ? styles.typeBadgeSell : styles.typeBadgeBuy]}>
            <Text style={[styles.typeBadgeText, isSell ? styles.typeBadgeTextSell : styles.typeBadgeTextBuy]}>
              {isSell ? 'Sell' : 'Buy'}
            </Text>
          </View>
          <Text style={styles.orderId}>{item.orderId || '—'}</Text>
        </View>

        <Text style={styles.mineralName}>{item.mineralName || 'Order'}</Text>
        <Text style={styles.qtyDate}>
          {formatQty(item.quantity)} {' • '} {formatDate(item.createdAt)}
        </Text>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>STATUS:</Text>
          <Text style={[styles.statusValue, { color: statusColor }]}>{status}</Text>
        </View>

        {hasSavedPriceBreakdown(item) && (
          <View style={styles.priceSection}>
            {showAppOrderPriceBreakdown() ? (
              <OrderPriceBreakdown orderSummary={item.orderSummary} compact />
            ) : (
              <View style={styles.priceFallbackRow}>
                <Text style={styles.priceFallbackLabel}>Amount</Text>
                <Text style={styles.priceFallbackValue}>{getPrimaryTotalDisplayString(item)}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.callbackBtn} activeOpacity={0.7} onPress={() => onRequestCallback(item)} disabled={requestingCb === item.id}>
            {requestingCb === item.id ? (
              <ActivityIndicator size={14} color="#00A63E" />
            ) : (
              <Icon name="phone" size={14} color="#00A63E" />
            )}
            <Text style={styles.callbackText}>{requestingCb === item.id ? 'Sending...' : 'Request Callback'}</Text>
          </TouchableOpacity>
          {status === 'Delivered' || status === 'Complete' ? (
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('OrderDetail', { orderId: item.id, order: item })}>
              <Text style={styles.invoiceLink}>Invoice</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.viewDetailsBtn} activeOpacity={0.7} onPress={() => navigation.navigate('OrderDetail', { orderId: item.id, order: item })}>
              <Text style={styles.viewDetailsBtnText}>View Details {'>'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconWrap}>
              <Icon name="time" size={20} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>ORDER MANAGEMENT</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      {/* Search + Filters (fixed above list) */}
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

      {/* Sort dropdown overlay — rendered at root level so it sits on top of everything */}
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
      ) : typeFilter === 'ALL TYPES' ? (
        <FlatList
          data={[
            { key: 'BUY', title: 'BUY ORDERS' },
            { key: 'SELL', title: 'SELL ORDERS' },
          ]}
          keyExtractor={(section) => section.key}
          renderItem={({ item: section }) => {
            const sectionOrders = filtered.filter((o) =>
              section.key === 'BUY' ? o.type === 'buy' : o.type === 'sell',
            );
            if (sectionOrders.length === 0) return null;
            return (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeader}>{section.title}</Text>
                {sectionOrders.map((order) => (
                  <View key={order.id || order._id} style={styles.sectionCardWrap}>
                    {renderCard({ item: order })}
                  </View>
                ))}
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="cart" size={40} color={colors.textLight} />
              <Text style={styles.emptyText}>No verified orders yet. Untracked trading can increase risk.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="cart" size={40} color={colors.textLight} />
              <Text style={styles.emptyText}>No verified orders yet. Untracked trading can increase risk.</Text>
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

  /* ── Header (same as PaymentMethods) ── */
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

  listContent: { paddingHorizontal: 20, paddingBottom: 48 },
  sectionBlock: { marginBottom: 12 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 2,
  },
  sectionCardWrap: { marginBottom: 8 },

  /* ── Filters container ── */
  filtersContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.background,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.primary, padding: 0 },

  /* ── Filter row (type tabs + sort in one line) ── */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
    zIndex: 100,
    elevation: 10,
  },
  typeTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  typeTabTextActive: { color: colors.white },

  /* ── Sort ── */
  sortWrap: { marginLeft: 'auto', position: 'relative', zIndex: 10, paddingLeft: 6 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  sortBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
  sortOverlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  sortDropdown: {
    position: 'absolute',
    top: HEADER_EXTRA_TOP + 20 + 56 + 14 + 44 + 6,
    right: 20,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    minWidth: 150,
    zIndex: 999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortOptionText: { fontSize: 14, color: colors.text },
  sortOptionActive: { fontWeight: '700', color: DROPDOWN_BLUE },

  /* ── Order Card ── */
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  typeBadgeBuy: { backgroundColor: '#EFF6FF' },
  typeBadgeSell: { backgroundColor: '#FFF7ED' },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  typeBadgeTextBuy: { color: '#2563EB' },
  typeBadgeTextSell: { color: '#EA580C' },
  orderId: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  mineralName: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  qtyDate: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  statusLabel: { fontSize: 12, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 },
  statusValue: { fontSize: 13, fontWeight: '600' },

  priceSection: { marginBottom: 12, marginTop: 4 },
  priceFallbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceFallbackLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 0.3 },
  priceFallbackValue: { fontSize: 17, fontWeight: '800', color: colors.primary },

  /* ── Action Buttons ── */
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  callbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00A63E',
    backgroundColor: '#F0FDF4',
  },
  callbackText: { fontSize: 12, fontWeight: '700', color: '#00A63E' },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#51A2FF',
    marginLeft: '3%',
  },
  viewDetailsBtnText: { fontSize: 12, fontWeight: '700', color: '#51A2FF' },
  invoiceLink: { fontSize: 13, fontWeight: '600', color: colors.primary },

  /* ── Empty ── */
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
