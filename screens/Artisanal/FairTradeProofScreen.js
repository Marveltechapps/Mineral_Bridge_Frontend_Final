import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const ELITE_MARGIN_TOP = Math.round(WINDOW_HEIGHT * 0.03);
const ICON_MARGIN_TOP = Math.round(WINDOW_HEIGHT * 0.04);
const DROPDOWN_BLUE = '#51A2FF';
const HEADER_BG = '#EFF6FF';
const CARD_BG = '#EFF6FF';
const CARD_BORDER = '#DBEAFE';

export default function FairTradeProofScreen({ navigation }) {
  const [showDownloadMessage, setShowDownloadMessage] = useState(false);
  const [cert, setCert] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchWithAuth('/api/artisanal/certifications')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled && data) setCert(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const blockchainHash = cert?.blockchainHash || '0x71C7656EC7ab88b098deF87518740185f6d8976';
  const ledgerStatusDisplay = blockchainHash.length > 14 ? blockchainHash.slice(0, 3) + '...' + blockchainHash.slice(-12) : 'F...BRIDGE_VERIFIED';

  const onBack = () => navigation.goBack();
  const onClose = () => navigation.goBack();

  const onDownload = () => {
    setShowDownloadMessage(true);
    setTimeout(() => setShowDownloadMessage(false), 4000);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={[styles.headerIconBox, { backgroundColor: '#D1FAE5' }]}>
              <Icon name="checkCircle" size={20} color="#009966" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>ASM VERIFICATION</Text>
              <Text style={styles.headerSubtitle}>FAIR TRADE PROOF & TRACEABILITY</Text>
            </View>
          </View>
          <Pressable style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnHover]} onPress={onClose}>
            <Icon name="close" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.eliteSection, { marginTop: ICON_MARGIN_TOP }]}>
          <View style={styles.eliteIconWrap}>
            <View style={styles.eliteIconBox}>
              <Icon name="shieldCheck" size={48} color={DROPDOWN_BLUE} />
              <View style={styles.eliteBadge}>
                <Icon name="checkCircle" size={18} color={colors.white} />
              </View>
            </View>
          </View>
          <Text style={[styles.eliteTitle, { marginTop: ELITE_MARGIN_TOP }]}>INSTITUTIONAL ELITE TIER</Text>
          <Text style={styles.eliteSubtitle}>ACCREDITED FAIR TRADE STATUS FOR TRUSTED MARKET ACCESS</Text>
        </View>

        <View style={styles.combinedCard}>
          <View style={styles.ledgerTitleWrap}>
            <Text style={styles.combinedCardTitle}>DIGITAL LEDGER CERTIFICATE PROOF</Text>
          </View>
          <View style={styles.ledgerBox}>
            <Text style={styles.ledgerHash}>{blockchainHash}</Text>
            <Text style={styles.ledgerStatus}>{ledgerStatusDisplay}</Text>
          </View>
          <View style={styles.complianceDivider} />
          <View style={styles.complianceRow}>
            <View style={styles.complianceHalf}>
              <Text style={styles.complianceLabel}>MINE GEO-FENCE</Text>
              <View style={styles.tagWrap}>
                <Text style={styles.tagText}>GPS ANCHORED</Text>
              </View>
            </View>
            <View style={styles.complianceDividerV} />
            <View style={styles.complianceHalf}>
              <Text style={styles.complianceLabel}>SAFETY COMPLIANCE</Text>
              <View style={styles.tagWrap}>
                <Text style={styles.tagText}>L1 ACCREDITED</Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.downloadBtn, pressed && styles.downloadBtnPressed]}
          onPress={onDownload}
        >
          <Icon name="download" size={22} color={colors.white} />
          <Text style={styles.downloadBtnText}>DOWNLOAD VERIFIED COMPLIANCE PROOF</Text>
        </Pressable>
      </ScrollView>

      {showDownloadMessage && (
        <View style={styles.downloadMessage}>
          <Icon name="checkCircle" size={20} color={colors.successGreen} />
          <Text style={styles.downloadMessageText}>Securely downloading your verified compliance records...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: HEADER_BG,
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
  content: { padding: 21, paddingBottom: 100, alignItems: 'center' },
  eliteSection: { alignItems: 'center', marginBottom: 24 },
  eliteIconWrap: { marginBottom: 14 },
  eliteIconBox: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: HEADER_BG,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eliteBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eliteTitle: { fontSize: 16, fontWeight: '800', color: colors.primary, letterSpacing: 0.3 },
  eliteSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 6, letterSpacing: 0.2 },
  combinedCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    width: '100%',
    marginBottom: 24,
  },
  ledgerTitleWrap: {
    marginBottom: 12,
  },
  combinedCardTitle: { fontSize: 12, fontWeight: '800', color: colors.gold, letterSpacing: 0.5 },
  ledgerBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ledgerHash: { fontSize: 12, fontWeight: '600', color: colors.primary, letterSpacing: 0.3, marginBottom: 4 },
  ledgerStatus: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  complianceDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 14 },
  complianceRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  complianceHalf: { flex: 1, alignItems: 'center' },
  complianceDividerV: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  complianceLabel: { fontSize: 10, fontWeight: '800', color: colors.white, letterSpacing: 0.5, marginBottom: 10 },
  tagWrap: {
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  tagText: { fontSize: 10, fontWeight: '700', color: colors.gold, letterSpacing: 0.5 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
  },
  downloadBtnPressed: { opacity: 0.9 },
  downloadBtnText: { fontSize: 13, fontWeight: '700', color: colors.white, letterSpacing: 0.3 },
  downloadMessage: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.successGreenBg,
    borderRadius: 14,
    borderTopWidth: 1.25,
    borderTopColor: colors.successGreen,
  },
  downloadMessageText: { fontSize: 14, fontWeight: '600', color: colors.primary, flex: 1 },
});
