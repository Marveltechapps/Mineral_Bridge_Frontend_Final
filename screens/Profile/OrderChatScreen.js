import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';
const POLL_INTERVAL = 5000;

export default function OrderChatScreen({ navigation, route }) {
  const { orderId, orderLabel } = route?.params || {};
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const listRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetchWithAuth(`/api/chat/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        if (data.length > 0 && !userId) {
          setUserId(data.find((m) => m.senderRole === 'user')?.senderId || null);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [orderId, userId]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth('/api/users/me');
        if (res.ok) {
          const u = await res.json();
          setUserId(u.id || u._id);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetchWithAuth(`/api/chat/${orderId}`, {
        method: 'POST',
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setText('');
        setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 100);
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === userId;
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        {!isMe && <Text style={styles.senderName}>{item.senderName || 'Team'}</Text>}
        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
          {item.text}
        </Text>
        <Text style={[styles.bubbleTime, isMe ? styles.timeMe : styles.timeThem]}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconWrap}>
              <Icon name="chatbubbles" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>TEAM CHAT</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{orderLabel || orderId || 'Order'}</Text>
            </View>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="chatbubble" size={48} color={colors.border} />
          <Text style={styles.emptyText}>No support messages yet</Text>
          <Text style={styles.emptySubtext}>Start a verified conversation with the operations team</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textLight}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            (!text.trim() || sending) && styles.sendBtnDisabled,
            pressed && text.trim() && styles.sendBtnPressed,
          ]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size={18} color={colors.white} />
          ) : (
            <Icon name="send" size={20} color={colors.white} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  const now = new Date();
  const isToday = dt.toDateString() === now.toDateString();
  const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (isToday) return time;
  return `${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

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
  headerRight: { width: 44 },

  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: DROPDOWN_BLUE,
    marginBottom: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: colors.white },
  bubbleTextThem: { color: colors.primary },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  timeMe: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  timeThem: { color: colors.textLight, textAlign: 'left' },

  emptyText: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  emptySubtext: { fontSize: 13, color: colors.textLight },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.primary,
    backgroundColor: colors.background,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.textLight },
  sendBtnPressed: { opacity: 0.8 },
});
