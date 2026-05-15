import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = Math.round(SCREEN_WIDTH * 9 / 16);
const DROPDOWN_BLUE = '#51A2FF';

function formatTime(seconds) {
  const n = Number(seconds);
  if (n !== n || n < 0) return '0:00'; // NaN or negative
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Chapter start: dashboard sends startSec (number). Supports:
 * - Integer or number >= 1: seconds (e.g. 25, 90).
 * - Decimal 0.xx: 0 min xx sec (e.g. 0.25 = 25 sec, 0.5 = 50 sec).
 * - Decimal x.yy (x >= 1): x min yy sec (e.g. 1.30 = 90 sec).
 * Also accepts string "0:25" or "1:30" (min:sec).
 */
function chapterStartSeconds(ch) {
  const raw = ch?.startSec ?? ch?.start;
  if (raw == null) return 0;
  if (typeof raw === 'string') {
    const trimmed = String(raw).trim();
    if (trimmed.includes(':')) {
      const [m, s] = trimmed.split(':').map((x) => parseInt(x, 10) || 0);
      return m * 60 + s;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? parseMinSecToSeconds(n) : 0;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return parseMinSecToSeconds(n);
}

function parseMinSecToSeconds(n) {
  if (n >= 1) {
    const intPart = Math.floor(n);
    const decPart = n - intPart;
    if (decPart > 0) return intPart * 60 + Math.round(decPart * 100);
    return n;
  }
  return Math.round(n * 100);
}

/** Extract YouTube video ID from URL. */
function getYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** Check if URL is a direct video file (expo-video can play). */
function isDirectVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase();
  return /\.(mp4|m4v|webm|mov|m3u8)(\?|$)/i.test(u) || u.includes('video/') || !(/youtube|youtu\.be|vimeo|dailymotion/i.test(u));
}

/** Native video player using expo-video (MP4, etc.). */
function NativeVideoPlayer({ url, onError, playerRef, style }) {
  const player = useVideoPlayer(url, (p) => {
    playerRef.current = p;
  });
  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'error' || error) {
      onError?.(error?.message || 'Playback failed');
    }
  });
  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls
    />
  );
}

export default function SafetyVideoPlayerScreen({ navigation, route }) {
  const video = route?.params?.video ?? {};
  const initialStartSec = route?.params?.initialStartSec;
  const { id, title, url, description, chapters = [], duration, xpReward } = video;
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);
  const youtubeRef = useRef(null);
  const useNativePlayer = isDirectVideoUrl(url);
  const youtubeVideoId = getYouTubeVideoId(url);
  const isYouTube = !!youtubeVideoId;
  const startSeconds = initialStartSec != null ? (typeof initialStartSec === 'number' ? parseMinSecToSeconds(initialStartSec) : chapterStartSeconds({ startSec: initialStartSec })) : 0;

  useEffect(() => {
    if (!url) setError('No video URL');
  }, [url]);

  useEffect(() => {
    if (startSeconds <= 0) return;
    if (useNativePlayer && videoRef.current) {
      try {
        videoRef.current.currentTime = startSeconds;
        videoRef.current.play();
      } catch (e) { /* ignore */ }
    }
  }, [startSeconds, useNativePlayer]);

  const onSeek = (seconds) => {
    if (useNativePlayer && videoRef.current) {
      try {
        videoRef.current.currentTime = seconds;
        videoRef.current.play();
      } catch (e) {
        // ignore
      }
    } else if (isYouTube && youtubeRef.current) {
      youtubeRef.current.seekTo(seconds, true);
      setPlaying(true);
    }
  };

  const onChapterPress = (ch) => {
    const seconds = chapterStartSeconds(ch);
    onSeek(seconds);
  };

  if (!url) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={() => navigation.goBack()}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <Text style={styles.headerTitle}>Video</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>No training video is configured yet.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={() => navigation.goBack()}>
          <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Video'}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {useNativePlayer ? (
          <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
            <NativeVideoPlayer
              url={url}
              onError={(msg) => setError(msg || 'Playback failed')}
              playerRef={videoRef}
              style={styles.video}
            />
            {error && <Text style={styles.errorOverlay}>{error}</Text>}
          </View>
        ) : isYouTube ? (
          <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
            <YoutubePlayer
              ref={youtubeRef}
              height={VIDEO_HEIGHT}
              width={SCREEN_WIDTH}
              videoId={youtubeVideoId}
              play={playing}
              onChangeState={(state) => setPlaying(state === 'playing')}
              initialPlayerParams={{ start: Math.round(startSeconds) }}
            />
          </View>
        ) : (
          <View style={[styles.videoContainer, { height: VIDEO_HEIGHT, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.embedHint}>External training source detected - open in browser</Text>
            <Pressable
              style={({ pressed }) => [styles.openExternalBtn, pressed && { opacity: 0.8 }]}
              onPress={() => Linking.openURL(url).catch(() => {})}
            >
              <Icon name="openOutline" size={24} color={colors.white} />
              <Text style={styles.openExternalText}>Open Training Video</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.info}>
          {(duration || xpReward) && (
            <Text style={styles.meta}>{[duration, xpReward].filter(Boolean).join(' • ')}</Text>
          )}
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>

        <View style={styles.chaptersSection}>
          <Text style={styles.chaptersTitle}>Training Chapters</Text>
          {chapters.length > 0 ? (
            <>
              <Text style={styles.chaptersHint}>Tap a chapter to jump and complete training faster</Text>
              {chapters.map((ch, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.chapterRow, pressed && styles.chapterRowPressed]}
                onPress={() => onChapterPress(ch)}
              >
                <View style={styles.chapterTime}>
                  <Text style={styles.chapterTimeText}>{formatTime(chapterStartSeconds(ch))}</Text>
                </View>
                <Text style={styles.chapterLabel}>{ch.label || 'Chapter'}</Text>
                <Icon name="chevronRight" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
            </>
          ) : (
            <Text style={styles.chaptersEmpty}>No chapters yet. Add chapters in Dashboard -> Content & Marketing -> Videos.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  backBtn: { padding: 8, marginLeft: -8 },
  backBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.2)', borderRadius: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.primary, marginLeft: 8 },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  videoContainer: { width: '100%', overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  errorOverlay: { position: 'absolute', bottom: 8, left: 16, right: 16, color: '#ef4444', fontSize: 12 },
  embedHint: { color: colors.textMuted, fontSize: 14, marginBottom: 12 },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DROPDOWN_BLUE,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  openExternalText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: colors.textMuted, fontSize: 16 },
  info: { padding: 20, paddingBottom: 8 },
  meta: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  description: { fontSize: 14, color: colors.text, lineHeight: 22 },
  chaptersSection: { padding: 20, paddingTop: 8 },
  chaptersTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  chaptersHint: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  chaptersEmpty: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chapterRowPressed: { backgroundColor: '#f1f5f9' },
  chapterTime: {
    width: 48,
    height: 28,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chapterTimeText: { fontSize: 12, fontWeight: '600', color: DROPDOWN_BLUE },
  chapterLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
});
