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

const { height: WH } = Dimensions.get('window');
const HEADER_TOP = Math.round(WH * 0.06);
const BLUE = '#51A2FF';
const POLL_MS = 5000;
const CHAT_ID = 'help-support-chat';

export default function HelpChatScreen({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const listRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/chat/${CHAT_ID}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        if (data.length > 0 && !userId) {
          setUserId(data.find((m) => m.senderRole === 'user')?.senderId || null);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, POLL_MS);
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
      const res = await fetchWithAuth(`/api/chat/${CHAT_ID}`, {
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
      <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
        {!isMe && <Text style={s.senderName}>{item.senderName || 'Support Team'}</Text>}
        <Text style={[s.bubbleText, isMe ? s.bubbleTextMe : s.bubbleTextThem]}>{item.text}</Text>
        <Text style={[s.bubbleTime, isMe ? s.timeMe : s.timeThem]}>{fmtTime(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={s.wrapper} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Pressable style={({ pressed }) => [s.backBtn, pressed && s.backBtnH]} onPress={() => navigation.goBack()}>
            <Icon name="chevronLeft" size={24} color={BLUE} />
          </Pressable>
          <View style={s.headerCenter}>
            <View style={s.headerIconWrap}>
              <Icon name="chatbubbles" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={s.headerTitle}>LIVE SUPPORT</Text>
              <Text style={s.headerSub}>Chat with Mineral Bridge team</Text>
            </View>
          </View>
          <View style={s.hRight} />
        </View>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={s.centered}>
          <Icon name="chatbubble" size={48} color={colors.border} />
          <Text style={s.emptyTitle}>Start a conversation</Text>
          <Text style={s.emptySub}>Our support team typically responds within a few minutes.</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
        />
      )}

      {/* Input */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textLight}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={({ pressed }) => [
            s.sendBtn,
            (!text.trim() || sending) && s.sendBtnOff,
            pressed && text.trim() && s.sendBtnP,
          ]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          {sending ? <ActivityIndicator size={18} color={colors.white} /> : <Icon name="send" size={20} color={colors.white} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function fmtTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  const now = new Date();
  const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return dt.toDateString() === now.toDateString()
    ? time
    : `${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },

  header: {
    backgroundColor: '#EFF6FF', borderBottomWidth: 1.25, borderBottomColor: '#DBEAFE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    borderBottomLeftRadius: 35, borderBottomRightRadius: 35,
    paddingTop: 12 + HEADER_TOP, paddingBottom: 20, paddingHorizontal: 21,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backBtnH: { backgroundColor: 'rgba(81,162,255,0.25)' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  headerSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  hRight: { width: 44 },

  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: {
    alignSelf: 'flex-start', backgroundColor: '#EFF6FF',
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#DBEAFE',
  },
  senderName: { fontSize: 11, fontWeight: '700', color: BLUE, marginBottom: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: colors.white },
  bubbleTextThem: { color: colors.primary },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  timeMe: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  timeThem: { color: colors.textLight, textAlign: 'left' },

  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  emptySub: { fontSize: 13, color: colors.textLight, textAlign: 'center' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white, gap: 10,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: colors.primary, backgroundColor: colors.background,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: colors.textLight },
  sendBtnP: { opacity: 0.8 },
});
