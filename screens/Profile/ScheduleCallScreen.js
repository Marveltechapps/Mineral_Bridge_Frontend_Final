import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatTime12(t) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
}

export default function ScheduleCallScreen({ navigation, route }) {
  const { orderId, orderLabel } = route?.params || {};
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const onSelectDay = (day) => {
    if (!day) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateStr < todayStr) return;
    setSelectedDate(dateStr);
  };

  const onSubmit = async () => {
    if (!selectedDate || !selectedTime || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/schedule', {
        method: 'POST',
        body: JSON.stringify({ orderId, date: selectedDate, time: selectedTime }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfirmed(data);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.error || 'Failed to schedule');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to schedule');
    }
    setSubmitting(false);
  };

  const cellSize = Math.floor((WINDOW_WIDTH - 72) / 7);

  if (confirmed) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={() => navigation.goBack()}>
              <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
            </Pressable>
            <View style={styles.headerCenter}>
              <View style={styles.headerIconWrap}>
                <Icon name="calendar" size={20} color={colors.primary} />
              </View>
              <Text style={styles.headerTitle}>CALL SCHEDULED</Text>
            </View>
            <View style={styles.headerRightSpacer} />
          </View>
        </View>
        <View style={styles.centered}>
          <View style={styles.confirmIconWrap}>
            <Icon name="checkCircle" size={64} color="#00A63E" />
          </View>
          <Text style={styles.confirmTitle}>Call Scheduled!</Text>
          <Text style={styles.confirmSub}>
            {new Date(confirmed.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
          <Text style={styles.confirmTime}>{formatTime12(confirmed.time)}</Text>
          <Text style={styles.confirmNote}>Our team will call you at the scheduled time to discuss your order.</Text>
          <TouchableOpacity style={styles.doneBtn} activeOpacity={0.7} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>BACK TO ORDER</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={() => navigation.goBack()}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconWrap}>
              <Icon name="calendar" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>SCHEDULE A VERIFIED SUPPORT CALL</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{orderLabel || orderId || 'Order'}</Text>
            </View>
          </View>
          <View style={styles.headerRightSpacer} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <Text style={styles.sectionLabel}>SELECT DATE</Text>
        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <Pressable onPress={prevMonth} hitSlop={12}>
              <Icon name="chevronLeft" size={22} color={colors.primary} />
            </Pressable>
            <Text style={styles.monthText}>{monthLabel}</Text>
            <Pressable onPress={nextMonth} hitSlop={12}>
              <Icon name="chevronRight" size={22} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={[styles.weekdayText, { width: cellSize }]}>{w}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((day, i) => {
              if (day === null) return <View key={`e-${i}`} style={{ width: cellSize, height: cellSize }} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPast = dateStr < todayStr;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              return (
                <Pressable
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    { width: cellSize, height: cellSize },
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => onSelectDay(day)}
                  disabled={isPast}
                >
                  <Text style={[
                    styles.dayText,
                    isPast && styles.dayTextPast,
                    isSelected && styles.dayTextSelected,
                  ]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Time Slots */}
        {selectedDate && (
          <>
            <Text style={styles.sectionLabel}>SELECT TIME</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((t) => {
                const active = t === selectedTime;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeSlot, active && styles.timeSlotActive]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedTime(t)}
                  >
                    <Text style={[styles.timeSlotText, active && styles.timeSlotTextActive]}>
                      {formatTime12(t)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {selectedDate && selectedTime && (
          <View style={styles.summaryCard}>
            <Icon name="time" size={20} color={DROPDOWN_BLUE} />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>Your scheduled call</Text>
              <Text style={styles.summaryDetail}>
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime12(selectedTime)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {selectedDate && selectedTime && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
            activeOpacity={0.7}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.confirmBtnText}>CONFIRM CALL SLOT</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 10 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },

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
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  headerSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  headerRightSpacer: { width: 44 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },

  calendarCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayText: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: colors.textMuted },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { alignItems: 'center', justifyContent: 'center', borderRadius: 99 },
  dayCellSelected: { backgroundColor: colors.primary },
  dayCellToday: { backgroundColor: '#EFF6FF' },
  dayText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  dayTextPast: { color: colors.textLight },
  dayTextSelected: { color: colors.white },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  timeSlotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeSlotText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  timeSlotTextActive: { color: colors.white },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: colors.primary },
  summaryDetail: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: colors.white, letterSpacing: 0.5 },

  confirmIconWrap: { marginBottom: 8 },
  confirmTitle: { fontSize: 24, fontWeight: '800', color: colors.primary },
  confirmSub: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  confirmTime: { fontSize: 22, fontWeight: '700', color: DROPDOWN_BLUE },
  confirmNote: { fontSize: 13, color: colors.textLight, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  doneBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  doneBtnText: { fontSize: 14, fontWeight: '800', color: colors.white, letterSpacing: 0.5 },
});
