import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';
const PROGRESS_BLUE = '#2B7FFF';

const PROCUREMENT_ITEMS = [
  { id: 'ppe', title: 'CERTIFIED PPE KIT', price: '$150', cap: '3 MONTHS CAP', icon: 'construct', iconColor: '#B48811' },
  { id: 'drill', title: 'PNEUMATIC DRILL UNIT', price: '$850', cap: '6 MONTHS CAP', icon: 'cog', iconColor: '#475569' },
  { id: 'pump', title: 'INSTITUTIONAL PUMP', price: '$1,200', cap: '8 MONTHS CAP', icon: 'waterDrop', iconColor: '#0EA5E9' },
];

const ITEM_NAME_MAP = { ppe: 'CERTIFIED PPE KIT', drill: 'PNEUMATIC DRILL UNIT', pump: 'INSTITUTIONAL PUMP' };

export default function InstitutionalAssetsScreen({ navigation }) {
  const [itemStatus, setItemStatus] = useState({ ppe: 'request', drill: 'request', pump: 'request' });
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchWithAuth('/api/artisanal/equipment-requests')
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (cancelled) return;
        const next = { ppe: 'request', drill: 'request', pump: 'request' };
        (list || []).forEach((r) => {
          const id = Object.keys(ITEM_NAME_MAP).find((k) => ITEM_NAME_MAP[k] === r.itemName);
          if (id && (r.status === 'queued' || r.status === 'processing')) next[id] = r.status;
        });
        setItemStatus(next);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const onBack = () => navigation.goBack();
  const onClose = () => navigation.goBack();

  const onRequest = async (item) => {
    const id = item.id;
    const itemName = item.title;
    setRequestingId(id);
    setItemStatus((prev) => ({ ...prev, [id]: 'processing' }));
    try {
      const res = await fetchWithAuth('/api/artisanal/equipment-requests', {
        method: 'POST',
        body: JSON.stringify({ itemName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to request equipment');
      }
      const payload = await res.json().catch(() => ({}));
      const requestId = payload?.id;
      if (requestId) {
        fetchWithAuth('/api/notifications', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Institutional assets — procurement request',
            body: `Your request for ${itemName} is queued. View status under Artisanal → Institutional Assets → Available for procurement.`,
            data: {
              linkType: 'institutional_assets',
              equipmentRequestId: String(requestId),
              itemName,
              status: payload.status || 'queued',
            },
          }),
        }).catch(() => {});
      }
      setItemStatus((prev) => ({ ...prev, [id]: 'queued' }));
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to request equipment');
      setItemStatus((prev) => ({ ...prev, [id]: 'request' }));
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconBox}>
              <Icon name="pickaxe" size={20} color={colors.primary} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>ASSET HUB</Text>
              <Text style={styles.headerSubtitle}>INSTITUTIONAL ASSETS FOR VERIFIED OPERATIONS</Text>
            </View>
          </View>
          <Pressable style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnHover]} onPress={onClose}>
            <Icon name="close" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.financialCard}>
          <View style={styles.financialHeader}>
            <Text style={styles.financialTitle}>FINANCIAL POWER</Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>TIER 2</Text>
            </View>
          </View>
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '75%' }]} />
            </View>
            <Text style={styles.ratioText}>75% RATIO</Text>
          </View>
          <Text style={styles.financialDesc}>
            Complete compliance milestones to unlock more institutional asset access.
          </Text>
        </View>

        <View style={styles.horizontalLine} />

        <Text style={styles.sectionTitle}>AVAILABLE FOR PROCUREMENT</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
        PROCUREMENT_ITEMS.map((item) => {
          const status = itemStatus[item.id];
          const isRequesting = requestingId === item.id;
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={[styles.itemIconWrap, { backgroundColor: colors.borderLight }]}>
                <Icon name={item.icon} size={28} color={item.iconColor} />
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDetail}>{item.price} - {item.cap}</Text>
              </View>
              {status === 'request' && (
                <Pressable
                  style={({ pressed }) => [styles.requestBtn, pressed && styles.requestBtnPressed]}
                  onPress={() => onRequest(item)}
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.requestBtnText}>REQUEST ASSET</Text>
                  )}
                </Pressable>
              )}
              {status === 'processing' && (
                <View style={styles.processingTag}>
                  <ActivityIndicator size="small" color={colors.white} />
                </View>
              )}
              {status === 'queued' && (
                <View style={styles.queuedTag}>
                  <Text style={styles.queuedTagText}>QUEUED</Text>
                </View>
              )}
            </View>
          );
        })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
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
  headerTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4, color: colors.primary },
  headerSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  closeBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  scroll: { flex: 1 },
  content: { padding: 21, paddingBottom: 40 },
  financialCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  financialHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  financialTitle: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  tierBadge: { backgroundColor: colors.gold, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  tierBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  progressWrap: { marginBottom: 12 },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: PROGRESS_BLUE, borderRadius: 4 },
  ratioText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  financialDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  horizontalLine: {
    height: 1.25,
    backgroundColor: '#DBEAFE',
    marginVertical: 20,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, letterSpacing: 0.2 },
  itemDetail: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  requestBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  requestBtnPressed: { opacity: 0.9 },
  requestBtnText: { fontSize: 11, fontWeight: '700', color: colors.white, letterSpacing: 0.5 },
  processingTag: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTagText: { fontSize: 11, fontWeight: '700', color: colors.white, letterSpacing: 0.5 },
  queuedTag: {
    backgroundColor: colors.gold,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  queuedTagText: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
});
