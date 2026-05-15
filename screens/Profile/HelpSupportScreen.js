import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';

const { height: WH } = Dimensions.get('window');
const HEADER_TOP = Math.round(WH * 0.06);
const BLUE = '#51A2FF';
const FALLBACK_EMAIL = 'support@mineralbridge.com';

const FAQ_LIST = [
  { q: 'How do I place a buy order?', a: 'Browse available minerals on the Buy tab, select the mineral you want, enter your quantity, choose a delivery address, and complete the payment. You can track your order status from Order History in the More section.' },
  { q: 'How is the mineral purity verified?', a: 'All minerals undergo institutional assaying at certified Mineral Bridge facilities using XRF and fire assay methods. A digital certificate is issued on the blockchain for every verified batch.' },
  { q: 'What happens after I submit a sell order?', a: 'After submission, your order is reviewed by the institutional desk. The process follows these steps: sample collection, assay report generation, price confirmation, and finally payout to your linked bank account or crypto wallet.' },
  { q: 'What documents are needed for selling minerals?', a: 'Institutional mineral sales require a valid Mining Permit, Tax Clearance Certificate, and a Certificate of Origin. For larger volumes, additional AML/KYC documentation may be requested by the compliance desk.' },
  { q: 'How do I set up my artisanal mining profile?', a: 'Go to the Mining tab and complete the registration steps: eligibility check, personal details, mine location and coordinates, equipment and workforce declaration, mining license upload, and compliance pledges. Your profile is reviewed by the institutional desk after submission.' },
  { q: 'What safety training is required for miners?', a: 'All registered artisanal miners must complete the L1 Safety Module, which covers emergency response protocols, fair trade practices, and safe extraction methods. Training status is visible on your mining dashboard.' },
  { q: 'How do I receive my sell order payout?', a: 'Payouts are sent to the bank account or crypto wallet you have saved under Payment Methods in the More section. Make sure your payment details are verified before completing a sell order.' },
  { q: 'What payment methods are supported?', a: 'Mineral Bridge supports bank account transfers and crypto wallet payments. You can add, edit, or remove your payment methods from More > Payment Methods at any time.' },
  { q: 'Is my personal data stored on the blockchain?', a: 'No. Only transaction hashes, mineral assay certificates, and traceability records are anchored on-chain. Your personal information, payment details, and KYC documents remain private and are never published to the blockchain. You can review visibility settings under More > Security & Privacy.' },
  { q: 'What documents are needed for KYC?', a: 'KYC verification requires one government-issued photo ID — passport, national ID card, or driving license. Upload your document under More > KYC Documents. Verification is mandatory before you can place buy or sell orders.' },
];

const TOPICS = [
  { key: 'buying', label: 'BUYING MINERALS', icon: 'cart' },
  { key: 'selling', label: 'SELLING', icon: 'briefcase' },
  { key: 'mining', label: 'OWN MINING', icon: 'pickaxe' },
  { key: 'payments', label: 'PAYMENTS', icon: 'card' },
  { key: 'blockchain', label: 'BLOCKCHAIN', icon: 'cube' },
  { key: 'legal', label: 'LEGAL', icon: 'document' },
];

const TOPIC_FAQS = {
  buying: [
    {
      title: 'How do I place a buy order?',
      body: 'Browse available minerals on the Buy tab, select the mineral you want, enter your quantity, choose a delivery address, and complete the payment. You can track your order status from Order History in the More section.',
    },
    {
      title: 'How is the purity verified?',
      body: 'All minerals undergo institutional assaying at certified Mineral Bridge facilities using XRF and fire assay methods. A digital certificate is issued on the blockchain for every verified batch.',
    },
  ],
  selling: [
    {
      title: 'What documents are needed for selling minerals?',
      body: 'Institutional mineral sales require a valid Mining Permit, Tax Clearance Certificate, and a Certificate of Origin. For larger volumes, additional AML/KYC documentation may be requested by the compliance desk.',
    },
    {
      title: 'What happens after I submit a sell order?',
      body: 'After submission, your order is reviewed by the institutional desk. The process follows these steps: sample collection, assay report generation, price confirmation, and finally payout to your linked bank account or crypto wallet.',
    },
  ],
  mining: [
    {
      title: 'How do I set up my artisanal mining profile?',
      body: 'Go to the Mining tab and complete the registration steps: eligibility check, personal details, mine location and coordinates, equipment and workforce declaration, mining license upload, and compliance pledges. Your profile is reviewed by the institutional desk after submission.',
    },
    {
      title: 'What safety training is required?',
      body: 'All registered artisanal miners must complete the L1 Safety Module, which covers emergency response protocols, fair trade practices, and safe extraction methods. Training status is visible on your mining dashboard.',
    },
  ],
  payments: [
    {
      title: 'How do I receive my sell order payout?',
      body: 'Payouts are sent to the bank account or crypto wallet you have saved under Payment Methods in the More section. Make sure your payment details are verified before completing a sell order.',
    },
    {
      title: 'What payment methods are supported?',
      body: 'Mineral Bridge supports bank account transfers and crypto wallet payments. You can add, edit, or remove your payment methods from More > Payment Methods at any time.',
    },
    {
      title: 'What is the service fee?',
      body: 'A 2.5% service fee is applied on all transactions. This covers secure logistics, institutional escrow, and blockchain anchoring of your transaction records.',
    },
  ],
  blockchain: [
    {
      title: 'Is my personal data stored on the blockchain?',
      body: 'No. Only transaction hashes, mineral assay certificates, and traceability records are anchored on-chain. Your personal information, payment details, and KYC documents remain private and are never published to the blockchain. You can review visibility settings under More > Security & Privacy.',
    },
  ],
  legal: [
    {
      title: 'What documents are needed for KYC?',
      body: 'KYC verification requires one government-issued photo ID — passport, national ID card, or driving license. Upload your document under More > KYC Documents. Verification is mandatory before you can place buy or sell orders.',
    },
    {
      title: 'How do I delete my account?',
      body: 'Go to More > App Settings and tap "Delete Account" at the bottom. Your request is submitted to the institutional desk for review. Once approved, all personal data, order history, and payment details are permanently removed.',
    },
  ],
};


export default function HelpSupportScreen({ navigation }) {
  const [activeTopic, setActiveTopic] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [callbackDone, setCallbackDone] = useState(false);
  const [supportEmail, setSupportEmail] = useState(FALLBACK_EMAIL);

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      (async () => {
        try {
          const [cbRes, cfgRes] = await Promise.all([
            fetchWithAuth('/api/callbacks?status=pending'),
            fetchWithAuth('/api/support-config'),
          ]);
          if (cbRes.ok) {
            const data = await cbRes.json();
            const today = new Date().toDateString();
            const hasTodayCallback = data.some(
              (c) => c.orderId === 'help-support' && new Date(c.createdAt).toDateString() === today,
            );
            if (hasTodayCallback) setCallbackDone(true);
          }
          if (cfgRes.ok) {
            const cfg = await cfgRes.json();
            if (cfg.supportEmail) setSupportEmail(cfg.supportEmail);
          }
        } catch { /* ignore */ }
      })();
      return undefined;
    }, []),
  );

  const onStartChat = () => {
    navigation.navigate('HelpChat');
  };

  const onEmailSupport = () => {
    const subject = encodeURIComponent('Mineral Bridge Support Request');
    const body = encodeURIComponent('Hi Mineral Bridge Support Team,\n\nI need help with:\n\n');
    Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`);
  };

  const onRequestCallback = async () => {
    if (callbackDone) {
      Alert.alert('Already Requested', 'You have already requested a callback today. Please try again tomorrow.');
      return;
    }
    setCallbackLoading(true);
    try {
      const res = await fetchWithAuth('/api/callbacks', {
        method: 'POST',
        body: JSON.stringify({ orderId: 'help-support', orderLabel: 'Help & Support Callback Request' }),
      });
      if (res.ok) {
        setCallbackDone(true);
        Alert.alert('Callback Requested', 'Our team will contact you shortly during business hours.');
      } else {
        Alert.alert('Error', 'Failed to submit callback request.');
      }
    } catch {
      Alert.alert('Error', 'Failed to submit callback request.');
    }
    setCallbackLoading(false);
  };

  // ── TOPIC DETAIL VIEW ──
  if (activeTopic) {
    const faqs = TOPIC_FAQS[activeTopic] || [];
    const topicLabel = TOPICS.find((t) => t.key === activeTopic)?.label || '';

    return (
      <View style={st.wrapper}>
        <View style={st.header}>
          <View style={st.headerRow}>
            <Pressable style={({ pressed }) => [st.backBtn, pressed && st.backBtnH]} onPress={() => setActiveTopic(null)}>
              <Icon name="chevronLeft" size={24} color={BLUE} />
            </Pressable>
            <View style={st.hTitleBlock}>
              <View style={st.hIconWrap}>
                <Icon name="help" size={20} color={colors.primary} />
              </View>
              <Text style={st.hTitle}>{topicLabel}</Text>
            </View>
            <View style={st.hRight} />
          </View>
        </View>

        <ScrollView style={st.scroll} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          {faqs.length > 0 ? (
            faqs.map((faq, i) => (
              <View key={i} style={st.faqCard}>
                <Text style={st.faqTitle}>{faq.title}</Text>
                <Text style={st.faqBody}>{faq.body}</Text>
              </View>
            ))
          ) : (
            <View style={st.emptyWrap}>
              <Text style={st.emptyText}>No topic FAQs yet. Use support options to get guided help now.</Text>
              <TouchableOpacity onPress={() => setActiveTopic(null)} activeOpacity={0.7}>
                <Text style={st.backLink}>Back to all topics</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ── MAIN HELP VIEW ──
  return (
    <View style={st.wrapper}>
      <View style={st.header}>
        <View style={st.headerRow}>
          <Pressable style={({ pressed }) => [st.backBtn, pressed && st.backBtnH]} onPress={() => navigation.goBack()}>
            <Icon name="chevronLeft" size={24} color={BLUE} />
          </Pressable>
          <View style={st.hTitleBlock}>
            <View style={st.hIconWrap}>
              <Icon name="help" size={20} color={colors.primary} />
            </View>
            <Text style={st.hTitle}>TRUSTED HELP & SUPPORT</Text>
          </View>
          <View style={st.hRight} />
        </View>
      </View>

      <ScrollView style={st.scroll} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* Browse Topics */}
        <Text style={[st.secTitle, { marginTop: WH * 0.025 }]}>BROWSE TOPICS</Text>
        <View style={st.topicsGrid}>
          {TOPICS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={st.topicCard}
              activeOpacity={0.7}
              onPress={() => setActiveTopic(t.key)}
            >
              <Icon name={t.icon} size={26} color={colors.primary} />
              <Text style={st.topicLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Frequently Asked Questions */}
        <View style={st.suggestedCard}>
          <View style={st.suggestedHeader}>
            <Icon name="chatbubble" size={16} color={colors.primary} />
            <Text style={st.suggestedTitle}>Frequently Asked Questions</Text>
          </View>
          {FAQ_LIST.map((item, i) => {
            const isOpen = expandedFaq === i;
            return (
              <View key={i}>
                <TouchableOpacity
                  style={st.suggestedRow}
                  activeOpacity={0.6}
                  onPress={() => setExpandedFaq(isOpen ? null : i)}
                >
                  <Text style={[st.suggestedText, isOpen && { color: colors.primary, fontWeight: '600' }]}>{item.q}</Text>
                  <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={16} color={isOpen ? BLUE : colors.textLight} />
                </TouchableOpacity>
                {isOpen && (
                  <View style={st.faqAnswer}>
                    <Text style={st.faqAnswerText}>{item.a}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Still need help? */}
        <View style={st.stillHelpCard}>
          <View style={st.stillHelpHeader}>
            <Text style={st.stillHelpTitle}>Need guided support?</Text>
            <View style={st.onlineBadge}>
              <View style={st.onlineDot} />
              <Text style={st.onlineText}>AGENTS ONLINE</Text>
            </View>
          </View>

          <TouchableOpacity style={st.helpOptionRow} activeOpacity={0.6} onPress={onStartChat}>
            <View style={[st.helpOptionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="chatbubble" size={18} color={BLUE} />
            </View>
            <Text style={st.helpOptionText}>Start Secure Live Chat</Text>
          </TouchableOpacity>

          <View style={st.helpDiv} />

          <TouchableOpacity style={st.helpOptionRow} activeOpacity={0.6} onPress={onEmailSupport}>
            <View style={[st.helpOptionIcon, { backgroundColor: '#FEF2F2' }]}>
              <Icon name="mail" size={18} color="#DC2626" />
            </View>
            <Text style={st.helpOptionText}>Email Support Team</Text>
          </TouchableOpacity>

          <View style={st.helpDiv} />

          <TouchableOpacity
            style={st.helpOptionRow}
            activeOpacity={0.6}
            onPress={onRequestCallback}
            disabled={callbackLoading || callbackDone}
          >
            <View style={[st.helpOptionIcon, { backgroundColor: callbackDone ? '#F1F5F9' : '#F0FDF4' }]}>
              {callbackLoading ? (
                <ActivityIndicator size={16} color="#00A63E" />
              ) : (
                <Icon name="phone" size={18} color={callbackDone ? colors.textLight : '#00A63E'} />
              )}
            </View>
            <Text style={[st.helpOptionText, callbackDone && { color: colors.textLight }]}>
              {callbackDone ? 'Callback Requested Today' : 'Request Priority Callback'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

  header: {
    backgroundColor: '#EFF6FF', borderBottomWidth: 1.25, borderBottomColor: '#DBEAFE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    borderBottomLeftRadius: 35, borderBottomRightRadius: 35,
    paddingTop: 12 + HEADER_TOP, paddingBottom: 20, paddingHorizontal: 21,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backBtnH: { backgroundColor: 'rgba(81,162,255,0.25)' },
  hTitleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  hIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  hTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  hRight: { width: 44 },

  /* Suggested */
  suggestedCard: {
    backgroundColor: colors.white, borderRadius: 18, padding: 18,
    marginTop: WH * 0.035, borderWidth: 1, borderColor: colors.border,
  },
  suggestedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  suggestedTitle: { fontSize: 13, fontWeight: '700', color: colors.primary },
  suggestedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border,
  },
  suggestedText: { flex: 1, fontSize: 14, color: colors.textMuted, marginRight: 8 },
  faqAnswer: {
    paddingHorizontal: 4, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  faqAnswerText: { fontSize: 13, color: colors.textMuted, lineHeight: 21 },

  /* Section */
  secTitle: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.5, marginTop: WH * 0.035, marginBottom: 14, paddingLeft: 4,
  },

  /* Topics Grid */
  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  topicCard: {
    width: '47%', backgroundColor: colors.white, borderRadius: 16,
    paddingVertical: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  topicLabel: {
    fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5, textAlign: 'center',
  },

  /* Still need help */
  stillHelpCard: {
    backgroundColor: colors.white, borderRadius: 18, padding: 20,
    marginTop: WH * 0.035, borderWidth: 1, borderColor: colors.border,
  },
  stillHelpHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 18,
  },
  stillHelpTitle: { fontSize: 16, fontWeight: '800', color: colors.primary },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00A63E' },
  onlineText: { fontSize: 10, fontWeight: '700', color: '#00A63E', letterSpacing: 0.5 },

  helpOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  helpOptionIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  helpOptionText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  helpDiv: { height: 1, backgroundColor: colors.border },

  /* Topic Detail — FAQ cards */
  faqCard: {
    backgroundColor: colors.white, borderRadius: 18, padding: 22,
    marginTop: WH * 0.025, borderWidth: 1, borderColor: colors.border,
  },
  faqTitle: { fontSize: 16, fontWeight: '800', color: colors.primary, marginBottom: 12 },
  faqBody: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },

  /* Empty state */
  emptyWrap: { alignItems: 'center', paddingVertical: WH * 0.06 },
  emptyText: { fontSize: 14, color: colors.textLight, marginBottom: 14 },
  backLink: { fontSize: 14, fontWeight: '700', color: BLUE },

});
