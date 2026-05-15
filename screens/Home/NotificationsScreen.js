import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Linking,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { fetchWithAuth } from '../../lib/api';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';
import { Icon } from '../../lib/icons';
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../lib/services';
import { normalizeRemoteImageUri } from '../../lib/remoteImageUri';

// Use same notification icon as Home page (Icon, not image)
// Figma card types: icon bg color and display label
// sentToUser types map to card types
const CARD_TYPES = {
  payment: { bg: '#DCFCE7', iconColor: '#00A63E', icon: 'card' },
  verification: { bg: '#DBEAFE', iconColor: '#1F2A44', icon: 'calendar-outline' },
  shipping: { bg: '#FFEDD4', iconColor: '#E17100', icon: 'airplane' },
  request: { bg: '#EFF6FF', iconColor: '#F2C94C', icon: 'notifications' },
  qr_or_bank: { bg: '#DCFCE7', iconColor: '#00A63E', icon: 'card' },
  transport_link: { bg: '#FFEDD4', iconColor: '#E17100', icon: 'airplane' },
  sample_pickup_link: { bg: '#FFEDD4', iconColor: '#E17100', icon: 'airplane' },
  lc_credit: { bg: '#DBEAFE', iconColor: '#1F2A44', icon: 'card' },
  testing_certificate: { bg: '#DBEAFE', iconColor: '#1F2A44', icon: 'calendar-outline' },
  lab_report: { bg: '#DBEAFE', iconColor: '#1F2A44', icon: 'calendar-outline' },
  video_call: { bg: '#EFF6FF', iconColor: '#51A2FF', icon: 'videocam' },
  institutional_assets: { bg: '#DBEAFE', iconColor: '#155DFC', icon: 'pickaxe' },
};

function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const min = Math.floor((now - d) / 60000);
  const h = Math.floor(min / 60);
  const day = Math.floor(h / 24);
  if (day >= 1) return `${day}D AGO`;
  if (h >= 1) return `${h}H AGO`;
  if (min >= 1) return `${min}M AGO`;
  return 'JUST NOW';
}

function isUrl(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  return /^https?:\/\//i.test(trimmed) || /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(\/.*)?$/i.test(trimmed);
}

function isImageDataUri(str) {
  if (!str || typeof str !== 'string') return false;
  return /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(str.trim());
}

function normalizeItem(item) {
  const linkType = item.data?.linkType || item.linkType || item.data?.type;
  const type = linkType || item.type || (item.category && CARD_TYPES[item.category] ? item.category : 'request');
  const typeConfig = CARD_TYPES[type] || CARD_TYPES.request;
  const detail = item.data?.detail || item.body || item.message || (item.data?.note ? `Video call: ${item.data.note}` : '') || '';
  const link = isUrl(item.data?.link)
    ? item.data.link
    : (isUrl(item.data?.detail) ? item.data.detail : isUrl(item.body) ? item.body : null);
  const imageUri = isImageDataUri(item.data?.detail) ? item.data.detail : (isImageDataUri(item.body) ? item.body : null);
  const channel = item.data?.channel || item.channel || null;
  const readAt = item.readAt || null;
  return {
    id: item._id?.toString() || item.id || String(Math.random()),
    type,
    title: (item.title || 'NOTIFICATION').toUpperCase(),
    body: detail,
    link,
    imageUri,
    orderId: item.data?.orderId || item.orderId,
    timeAgo: item.timeAgo || formatTimeAgo(item.createdAt),
    channel: channel && (channel === 'App' || channel === 'Email' || channel === 'SMS') ? channel : null,
    readAt,
    isRead: !!readAt,
    ...typeConfig,
  };
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filterUnread, setFilterUnread] = useState(false);

  const loadNotifications = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetchWithAuth('/api/notifications');
      if (!res.ok) throw new Error('Failed to load notifications');
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setList(arr.map(normalizeItem));
      setError(null);
    } catch {
      setList([]);
      setError('Could not load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      loadNotifications(true);
      const poll = setInterval(() => loadNotifications(false), 30000);
      return () => clearInterval(poll);
    }, [loadNotifications])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications(false);
  }, [loadNotifications]);

  const [expandedId, setExpandedId] = useState(null);

  const handleCardMainPress = useCallback(
    (item) => {
      const closing = expandedId === item.id;
      setExpandedId(closing ? null : item.id);
      if (!closing && !item.isRead) {
        markNotificationRead(item.id).then((ok) => {
          if (ok) {
            setList((prev) =>
              prev.map((x) => (x.id === item.id ? { ...x, isRead: true, readAt: new Date().toISOString() } : x))
            );
          }
        });
      }
    },
    [expandedId]
  );

  const handleOpenContent = useCallback((item) => {
    if (item.link) {
      Linking.openURL(item.link).catch(() => {});
    }
  }, []);

  const hasUnread = list.some((x) => !x.isRead);

  const onMarkAllRead = useCallback(() => {
    if (!hasUnread) return;
    markAllNotificationsRead()
      .then(() => {
        setList((prev) =>
          prev.map((x) => ({ ...x, isRead: true, readAt: x.readAt || new Date().toISOString() }))
        );
      })
      .catch(() => {
        Alert.alert('Error', 'Could not mark all as read.');
      });
  }, [hasUnread]);

  const onDismiss = useCallback((item) => {
    Alert.alert('Dismiss notification', 'Remove this from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss',
        style: 'destructive',
        onPress: () => {
          deleteNotification(item.id).then((ok) => {
            if (ok) {
              setList((prev) => prev.filter((x) => x.id !== item.id));
              setExpandedId((e) => (e === item.id ? null : e));
            } else {
              Alert.alert('Error', 'Could not dismiss notification.');
            }
          });
        },
      },
    ]);
  }, []);

  const displayList = filterUnread ? list.filter((x) => !x.isRead) : list;

  return (
    <View style={styles.container}>
      {/* Custom header: 99px, #EFF6FF, back + bell + NOTIFICATIONS */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="chevronLeft" size={14} color="#51A2FF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.bellIconWrap}>
            <Icon name="notifications" size={22} color="#51A2FF" />
          </View>
          <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
        </View>
        <TouchableOpacity
          style={styles.headerMarkAll}
          onPress={onMarkAllRead}
          disabled={!hasUnread}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.headerMarkAllText, !hasUnread && styles.headerMarkAllTextDisabled]}>Read all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !filterUnread && styles.filterChipActive]}
          onPress={() => setFilterUnread(false)}
        >
          <Text style={[styles.filterChipText, !filterUnread && styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterUnread && styles.filterChipActive]}
          onPress={() => setFilterUnread(true)}
        >
          <Text style={[styles.filterChipText, filterUnread && styles.filterChipTextActive]}>Unread</Text>
        </TouchableOpacity>
        <Text style={styles.liveHint}>Refreshes every 30s</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1F2A44" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : displayList.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="notifications" size={48} color="#90A1B9" />
          <Text style={styles.emptyTitle}>Stay updated to avoid missing verified trade actions.</Text>
          <Text style={styles.emptyBody}>
            Order updates, links, and institutional asset procurement requests from Artisanal Mining appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#51A2FF']} tintColor="#51A2FF" />
          }
        >
          {displayList.map((item) => {
            const isExpanded = expandedId === item.id;
            const hasAction = item.link || item.imageUri;
            return (
              <View
                key={item.id}
                style={[styles.card, !item.isRead && styles.cardUnread]}
              >
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() => handleCardMainPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.cardIconWrap, { backgroundColor: item.bg || CARD_TYPES.request.bg }]}>
                    <Icon name={item.icon || 'notifications'} size={22} color={item.iconColor || '#1F2A44'} />
                  </View>
                  <View style={styles.cardTextWrap}>
                    <View style={styles.cardTitleRow}>
                      <Text
                        style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.cardHeaderRight}>
                        {!item.isRead ? <View style={styles.unreadDot} /> : null}
                        <Text style={styles.cardTime}>{item.timeAgo}</Text>
                        <Icon
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color="#90A1B9"
                          style={styles.chevron}
                        />
                      </View>
                    </View>
                    {item.body ? (
                      <Text style={styles.cardBody} numberOfLines={isExpanded ? undefined : 2}>
                        {item.imageUri ? 'Image / QR code' : item.body}
                      </Text>
                    ) : null}
                    {item.channel ? (
                      <Text style={styles.cardChannel}>Sent via {item.channel}</Text>
                    ) : null}
                    {!isExpanded && hasAction ? (
                      <Text style={styles.cardLinkHint}>
                        {item.link ? 'Tap to expand · Open link' : 'Tap to expand · View image'}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.cardExpand}>
                    {item.imageUri ? (
                      <View style={styles.expandImageWrap}>
                        <Image
                          source={{ uri: String(item.imageUri) }}
                          style={styles.expandImage}
                          resizeMode="contain"
                          onLoad={() => console.log('IMG_LOADED', item.imageUri)}
                          onError={(e) => console.log('IMG_ERROR', e?.nativeEvent, item.imageUri)}
                        />
                      </View>
                    ) : item.body ? (
                      <Text style={styles.expandBody} selectable>{item.body}</Text>
                    ) : null}
                    {item.link ? (
                      <TouchableOpacity
                        style={styles.openButton}
                        onPress={() => handleOpenContent(item)}
                      >
                        <Icon name="openOutline" size={18} color="#FFFFFF" />
                        <Text style={styles.openButtonText}>Open link</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.dismissButton} onPress={() => onDismiss(item)} activeOpacity={0.7}>
                      <Text style={styles.dismissButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    height: 99,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 42,
    paddingHorizontal: 21,
    paddingBottom: 12,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  backBtn: {
    width: 35,
    height: 35,
    borderRadius: 8.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10.5,
  },
  bellIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10.5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    fontSize: 15.75,
    lineHeight: 24,
    letterSpacing: -0.39,
    textTransform: 'uppercase',
    color: '#1F2A44',
  },
  headerMarkAll: { minWidth: 64, alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 4 },
  headerMarkAllText: { fontSize: 12, fontWeight: '700', color: '#51A2FF' },
  headerMarkAllTextDisabled: { color: '#CBD5E1' },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#1F2A44' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },
  liveHint: { flex: 1, textAlign: 'right', fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1 },
  list: {
    paddingHorizontal: 14,
    paddingTop: 21,
    paddingBottom: 48,
    gap: 10.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 21,
    marginBottom: 10.5,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#51A2FF',
    backgroundColor: '#FAFCFF',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 17.5,
    paddingHorizontal: 17.5,
    gap: 14,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chevron: { marginLeft: 2 },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTextWrap: { flex: 1, gap: 3.5, minWidth: 0 },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'Inter_900Black',
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.325,
    textTransform: 'uppercase',
    color: '#1F2A44',
    flex: 1,
  },
  cardTitleUnread: { color: '#0F172A' },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#51A2FF',
    marginRight: 4,
  },
  cardTime: {
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#90A1B9',
  },
  cardBody: {
    fontWeight: '500',
    fontSize: 10.5,
    lineHeight: 17,
    color: '#62748E',
  },
  cardChannel: {
    fontSize: 10,
    color: '#90A1B9',
    marginTop: 2,
  },
  errorText: { color: '#b91c1c', textAlign: 'center' },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#1F2A44',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: '#62748E',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  cardLinkHint: {
    fontSize: 10,
    color: '#51A2FF',
    marginTop: 4,
    fontWeight: '600',
  },
  cardExpand: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 17.5,
    paddingBottom: 17.5,
    paddingTop: 12,
    gap: 12,
  },
  expandBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#62748E',
    marginBottom: 4,
  },
  expandImageWrap: {
    alignSelf: 'stretch',
    minHeight: 120,
    maxHeight: 280,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  expandImage: {
    width: '100%',
    height: 240,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#51A2FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  dismissButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
