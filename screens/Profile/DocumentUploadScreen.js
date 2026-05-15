import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { uploadKycDocuments } from '../../lib/services';
import { pickImageStable } from '../../lib/stablePicker';
import ImageReviewCropModal from '../../components/ImageReviewCropModal';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';

export default function DocumentUploadScreen({ navigation, route }) {
  const { idType, docLabel, docIcon } = route?.params || {};
  const [frontUri, setFrontUri] = useState(null);
  const [backUri, setBackUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewVisible, setReviewVisible] = useState(false);
  const [pendingUri, setPendingUri] = useState(null);
  const [pendingSide, setPendingSide] = useState(null);
  const isMounted = useRef(true);
  const DOCUMENT_UPLOAD_PICKED_KEY = 'document_upload_picked';

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(DOCUMENT_UPLOAD_PICKED_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const data = JSON.parse(raw);
          if (data.frontUri) setFrontUri(data.frontUri);
          if (data.backUri) setBackUri(data.backUri);
        } catch (_) {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const onBack = () => navigation.goBack();

  const applyPickedImage = (uri, side) => {
    if (side === 'front') setFrontUri(uri);
    else setBackUri(uri);
    setError('');
    setReviewVisible(false);
    setPendingUri(null);
    setPendingSide(null);
  };

  useEffect(() => {
    if (!frontUri && !backUri) return;
    AsyncStorage.setItem(DOCUMENT_UPLOAD_PICKED_KEY, JSON.stringify({ frontUri, backUri })).catch(() => {});
  }, [frontUri, backUri]);

  const pickImage = (side) => {
    pickImageStable(
      // Lower quality reduces memory spikes on Android resume from picker.
      { quality: 0.75 },
      (stableUri) => {
        if (!isMounted.current) return;
        InteractionManager.runAfterInteractions(() => {
          if (!isMounted.current) return;
          setPendingUri(stableUri);
          setPendingSide(side);
          setReviewVisible(true);
        });
      },
      (msg) => {
        if (!isMounted.current) return;
        Alert.alert(msg === 'Permission needed' ? 'Permission needed' : 'Error', msg === 'Permission needed' ? 'Allow photo library access to upload document.' : msg || 'Could not open gallery');
      },
      () => {}
    );
  };

  const saveAndGoBack = async () => {
    if (!frontUri || !backUri) {
      setError('Please upload both front and back of your document.');
      return;
    }
    if (!idType) return;
    setLoading(true);
    setError('');
    try {
      await uploadKycDocuments(idType, { frontUri, backUri });
      if (!isMounted.current) return;
      AsyncStorage.removeItem(DOCUMENT_UPLOAD_PICKED_KEY).catch(() => {});
      InteractionManager.runAfterInteractions(() => {
        if (isMounted.current) navigation.goBack();
      });
    } catch (err) {
      const message = err.message || 'Failed to save documents';
      if (isMounted.current) {
        setError(message);
        Alert.alert('Error', message);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const bothDone = !!(frontUri && backUri);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerIconWrap}>
              <Icon name={docIcon || 'document'} size={20} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Upload {docLabel || 'Document'}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Upload clear front and back images of your {docLabel || 'document'} for faster verification.</Text>

        <View style={styles.cards}>
          <TouchableOpacity style={styles.card} onPress={() => pickImage('front')} activeOpacity={0.8}>
            {frontUri ? (
              <Image source={{ uri: frontUri }} style={styles.cardImage} />
            ) : (
              <>
                <View style={styles.cardIconWrap}>
                  <Icon name="camera" size={24} color={colors.textLight} />
                </View>
                <Text style={styles.cardLabel}>Front of document</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => pickImage('back')} activeOpacity={0.8}>
            {backUri ? (
              <Image source={{ uri: backUri }} style={styles.cardImage} />
            ) : (
              <>
                <View style={styles.cardIconWrap}>
                  <Icon name="camera" size={24} color={colors.textLight} />
                </View>
                <Text style={styles.cardLabel}>Back of document</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <ImageReviewCropModal
          visible={reviewVisible}
          imageUri={pendingUri}
          label={pendingSide === 'front' ? 'Front of document' : 'Back of document'}
          onUseFullImage={(uri) => applyPickedImage(uri, pendingSide)}
          onCropped={(uri) => applyPickedImage(uri, pendingSide)}
          onCancel={() => {
            setReviewVisible(false);
            setPendingUri(null);
            setPendingSide(null);
          }}
        />

        <TouchableOpacity
          style={[styles.submitBtn, (!bothDone || loading) && styles.submitBtnDisabled]}
          onPress={bothDone && !loading ? saveAndGoBack : undefined}
          disabled={!bothDone || loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Document Upload</Text>}
        </TouchableOpacity>
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
  headerTitleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  headerRight: { width: 44 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
  },
  cards: { gap: 14, marginBottom: 20 },
  card: {
    width: '100%',
    minHeight: 200,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  cardImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    resizeMode: 'contain',
  },
  errorText: { fontSize: 14, color: colors.error, marginBottom: 12 },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
