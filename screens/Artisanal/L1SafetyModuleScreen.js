import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';
const ACCENT_BLUE = '#2B7FFF';

const LESSONS = [
  { id: '1', title: 'INSTITUTIONAL PROTOCOL INTRO', completed: true },
  { id: '2', title: 'SITE HAZARD IDENTIFICATION', completed: true },
  { id: '3', title: 'EMERGENCY SIGNAL TRAINING', completed: false },
  { id: '4', title: 'ACCREDITATION QUIZ', completed: false },
];

export default function L1SafetyModuleScreen({ navigation }) {
  const onBack = () => navigation.goBack();
  const onClose = () => navigation.goBack();
  const onMarkComplete = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>L1 SAFETY FUNDAMENTALS</Text>
            <Text style={styles.headerSubtitle}>ASM TRAINING MODULE - STEP 1</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnHover]} onPress={onClose}>
            <Icon name="close" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.videoWrap}>
          <View style={styles.videoPlaceholder}>
            <Pressable style={styles.playBtn}>
              <Icon name="play" size={48} color={colors.white} />
            </Pressable>
            <Text style={styles.videoQuality}>4 K</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>CURRICULUM SUMMARY</Text>
        <Text style={styles.summaryText}>
          Learn the core safety protocol required for trusted artisanal accreditation and safer production outcomes.
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>DURATION</Text>
            <Text style={[styles.infoValue, { color: ACCENT_BLUE }]}>12 Mins</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>XP REWARD</Text>
            <Text style={[styles.infoValue, { color: ACCENT_BLUE }]}>+15 XP</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>LESSON CHECKLIST</Text>
        {LESSONS.map((lesson) => (
          <View key={lesson.id} style={styles.lessonRow}>
            <View style={[styles.lessonNum, !lesson.completed && styles.lessonNumPending]}>
              <Text style={[styles.lessonNumText, !lesson.completed && styles.lessonNumTextPending]}>{lesson.id}</Text>
            </View>
            <Text style={[styles.lessonTitle, !lesson.completed && styles.lessonTitlePending]}>{lesson.title}</Text>
            <View style={[styles.lessonIconWrap, lesson.completed && styles.lessonIconComplete]}>
              {lesson.completed ? (
                <Icon name="checkCircle" size={24} color={ACCENT_BLUE} />
              ) : (
                <Icon name="chevronRight" size={20} color={colors.textMuted} />
              )}
            </View>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.completeBtn, pressed && styles.completeBtnPressed]}
          onPress={onMarkComplete}
        >
          <Text style={styles.completeBtnText}>COMPLETE MODULE & CONTINUE</Text>
        </Pressable>
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
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  headerTitleBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.primary, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  scroll: { flex: 1 },
  content: { padding: 21, paddingBottom: 40 },
  videoWrap: { marginBottom: 20 },
  videoPlaceholder: {
    height: 200,
    backgroundColor: '#1F2A44',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E7000B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoQuality: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 20,
  },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoCard: {
    flex: 1,
    backgroundColor: colors.borderLight,
    borderRadius: 14,
    padding: 16,
  },
  infoLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  infoValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lessonNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lessonNumPending: { backgroundColor: colors.border },
  lessonNumText: { fontSize: 13, fontWeight: '800', color: colors.white },
  lessonNumTextPending: { color: colors.textMuted },
  lessonTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.primary },
  lessonTitlePending: { color: colors.textMuted, fontWeight: '600' },
  lessonIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonIconComplete: { backgroundColor: '#DBEAFE' },
  completeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  completeBtnPressed: { opacity: 0.9 },
  completeBtnText: { fontSize: 13, fontWeight: '700', color: colors.white, letterSpacing: 0.5 },
});
