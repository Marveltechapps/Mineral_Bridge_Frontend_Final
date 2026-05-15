import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { getVideos } from '../../lib/services';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';
const ACCENT_BLUE = '#2B7FFF';

const MODULES_FALLBACK = [
  { id: 'l1', title: 'L1 SAFETY FUNDAMENTALS', completion: 100, completed: true, url: null, duration: '', xpReward: '' },
  { id: 'advanced', title: 'ADVANCED TOOL HANDLING', completion: 45, completed: false, url: null, duration: '', xpReward: '' },
  { id: 'restoration', title: 'RESTORATION STANDARDS', completion: 0, completed: false, url: null, duration: '', xpReward: '' },
];

/** Videos from dashboard Content & Marketing → Videos. Show first 3 with valid URLs. */
const SAFETY_VIDEOS_LIMIT = 3;

function ModuleCard({ title, completion, completed, onPress, isVideo, duration, xpReward }) {
  const subtitle = isVideo
    ? [duration, xpReward].filter(Boolean).join(' • ') || 'Tap to watch and complete'
    : null;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardRow}>
        <View style={styles.playCircle}>
          <Icon name="play" size={24} color={colors.textMuted} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{title}</Text>
          {!isVideo && (
            <>
              <Text style={styles.cardSubtitle}>{completion}% COMPLETION</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${completion}%` }]} />
              </View>
            </>
          )}
          {isVideo && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.checkWrap}>
          {completed && !isVideo && <Icon name="checkCircle" size={28} color={ACCENT_BLUE} />}
          {isVideo && <Icon name="openOutline" size={20} color={ACCENT_BLUE} />}
        </View>
      </View>
    </Pressable>
  );
}

export default function SafetyTrainingScreen({ navigation }) {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    getVideos().then((list) => setVideos(Array.isArray(list) ? list : [])).catch(() => {});
  }, []);

  const modulesFromVideos = videos
    .filter((v) => v.url && v.url.trim())
    .slice(0, SAFETY_VIDEOS_LIMIT)
    .map((v, i) => ({
      id: v.id || `v-${i}`,
      title: (v.title || 'Training Video').toUpperCase(),
      completion: 0,
      completed: false,
      url: v.url,
      isVideo: true,
      duration: v.duration || '',
      xpReward: v.xpReward || '',
      video: v, // full video object for in-app player (chapters, description, etc.)
    }));
  const modules = modulesFromVideos.length > 0 ? modulesFromVideos : MODULES_FALLBACK;

  const onModulePress = (module) => {
    if (module.url && module.video) {
      navigation.navigate('SafetyVideoPlayer', { video: module.video });
      return;
    }
    if (module.url) {
      Linking.openURL(module.url).catch(() => {});
      return;
    }
    if (module.id === 'l1') {
      navigation.navigate('L1SafetyModule');
    } else if (module.id === 'advanced') {
      navigation.navigate('AdvancedToolHandlingModule');
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconBox}>
              <Icon name="construct" size={20} color={colors.primary} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>ASM ACADEMY</Text>
              <Text style={styles.headerSubtitle}>SAFETY & TRAINING FOR VERIFIED TRADE</Text>
            </View>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {modules.map((m) => (
          <ModuleCard
            key={m.id}
            title={m.title}
            completion={m.completion}
            completed={m.completed}
            onPress={() => onModulePress(m)}
            isVideo={!!m.url}
            duration={m.duration}
            xpReward={m.xpReward}
          />
        ))}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnHover: {
    backgroundColor: 'rgba(81, 162, 255, 0.25)',
  },
  headerTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
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
  headerSpacer: { width: 44 },
  scroll: { flex: 1 },
  content: { padding: 21, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT_BLUE,
    borderRadius: 3,
  },
  checkWrap: { marginLeft: 8, width: 36, alignItems: 'center', justifyContent: 'center' },
});
