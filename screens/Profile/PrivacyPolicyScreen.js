import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { getApiBase } from '../../lib/api';

const { height: WH } = Dimensions.get('window');
const HEADER_TOP = Math.round(WH * 0.06);
const BLUE = '#51A2FF';

function Section({ title, children }) {
  return (
    <View style={st.section}>
      <Text style={st.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Para({ children }) {
  return <Text style={st.para}>{children}</Text>;
}

function Bullet({ children }) {
  return (
    <View style={st.bulletRow}>
      <Text style={st.bulletDot}>{'\u2022'}</Text>
      <Text style={st.bulletText}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const apiBase = getApiBase();
    fetch(`${apiBase.replace(/\/$/, '')}/api/content/legal`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const text = data?.privacyPolicy && String(data.privacyPolicy).trim()
          ? String(data.privacyPolicy)
          : '';
        setContent(text);
      })
      .catch(() => {
        if (!cancelled) setContent('');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={st.wrapper}>
      <View style={st.header}>
        <View style={st.headerRow}>
          <Pressable style={({ pressed }) => [st.backBtn, pressed && st.backBtnH]} onPress={() => navigation.goBack()}>
            <Icon name="chevronLeft" size={24} color={BLUE} />
          </Pressable>
          <View style={st.hTitleBlock}>
            <View style={st.hIconWrap}>
              <Icon name="shield" size={20} color={colors.primary} />
            </View>
            <Text style={st.hTitle}>PRIVACY POLICY</Text>
          </View>
          <View style={st.hRight} />
        </View>
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <Text style={st.lastUpdated}>Last updated: February 2026</Text>
        {loading ? (
          <View style={st.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : content ? (
          <Text style={st.fullDocText}>{content}</Text>
        ) : (
          <Text style={st.emptyText}>Privacy Policy content will be provided by the administrator.</Text>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 48 },

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

  lastUpdated: {
    fontSize: 12, color: colors.textLight, textAlign: 'center',
    marginTop: 20, marginBottom: 24,
  },

  loaderWrap: { paddingVertical: 28, alignItems: 'center' },
  fullDocText: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  emptyText: { fontSize: 14, color: colors.textLight, lineHeight: 22 },
});
