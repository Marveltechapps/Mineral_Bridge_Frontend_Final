import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickImageStable } from '../../lib/stablePicker';
import { uploadKycDocuments } from '../../lib/services';
import ImageReviewCropModal from '../../components/ImageReviewCropModal';

export default function KYCDocumentsScreen({ route, navigation }) {
  const { idType } = route.params || {};
  const [frontUri, setFrontUri] = useState(null);
  const [backUri, setBackUri] = useState(null);
  const [selfieUri, setSelfieUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [pendingUri, setPendingUri] = useState(null);
  const [pendingSide, setPendingSide] = useState(null);
  const isMounted = useRef(true);
  const KYC_DOCUMENTS_PICKED_KEY = 'kyc_documents_picked';

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KYC_DOCUMENTS_PICKED_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const data = JSON.parse(raw);
          if (data.frontUri) setFrontUri(data.frontUri);
          if (data.backUri) setBackUri(data.backUri);
          if (data.selfieUri) setSelfieUri(data.selfieUri);
        } catch (_) {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const applyPickedImage = (uri, side) => {
    if (side === 'front') setFrontUri(uri);
    else if (side === 'back') setBackUri(uri);
    setReviewVisible(false);
    setPendingUri(null);
    setPendingSide(null);
  };

  useEffect(() => {
    if (!frontUri && !backUri && !selfieUri) return;
    AsyncStorage.setItem(KYC_DOCUMENTS_PICKED_KEY, JSON.stringify({ frontUri, backUri, selfieUri })).catch(() => {});
  }, [frontUri, backUri, selfieUri]);

  const pickImage = (setter, aspect = [4, 3], side = null) => {
    const isDocSide = side === 'front' || side === 'back';
    pickImageStable(
      isDocSide ? { quality: 1 } : { aspect, quality: 0.9 },
      (stableUri) => {
        if (!isMounted.current) return;
        InteractionManager.runAfterInteractions(() => {
          if (!isMounted.current) return;
          if (isDocSide) {
            setPendingUri(stableUri);
            setPendingSide(side);
            setReviewVisible(true);
          } else {
            setter(stableUri);
          }
        });
      },
      (msg) => {
        if (!isMounted.current) return;
        Alert.alert(msg === 'Permission needed' ? 'Permission needed' : 'Error', msg === 'Permission needed' ? 'Allow photo library access to upload document.' : msg || 'Could not open gallery');
      },
      () => {}
    );
  };

  const saveAndContinue = async () => {
    if (!frontUri && !backUri && !selfieUri) {
      Alert.alert('Required', 'Please upload at least one document image.');
      return;
    }
    setSaving(true);
    try {
      await uploadKycDocuments(idType || 'national-id', { frontUri, backUri, selfieUri });
      if (!isMounted.current) return;
      AsyncStorage.removeItem(KYC_DOCUMENTS_PICKED_KEY).catch(() => {});
      InteractionManager.runAfterInteractions(() => {
        if (isMounted.current) navigation.navigate('KYCSubmit', { idType: idType || 'national-id' });
      });
    } catch (e) {
      if (isMounted.current) Alert.alert('Error', e.message);
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const renderPicker = (label, uri, onPick) => (
    <TouchableOpacity style={styles.card} onPress={onPick} activeOpacity={0.8}>
      {uri ? (
        <Image source={{ uri }} style={styles.cardImage} />
      ) : (
        <Text style={styles.cardPlaceholder}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  const labelForSide = (s) => (s === 'front' ? 'Front of document' : s === 'back' ? 'Back of document' : 'Document image');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 2 of 3: Upload Documents</Text>
      <Text style={styles.subtitle}>Upload clear document images for faster approval and secure trading access.</Text>
      {renderPicker('Front of document', frontUri, () => pickImage(setFrontUri, [4, 3], 'front'))}
      {renderPicker('Back of document', backUri, () => pickImage(setBackUri, [4, 3], 'back'))}
      {renderPicker('Selfie with document', selfieUri, () => pickImage(setSelfieUri, [1, 1]))}
      <ImageReviewCropModal
        visible={reviewVisible}
        imageUri={pendingUri}
        label={pendingSide ? labelForSide(pendingSide) : 'Document image'}
        onUseFullImage={(uri) => applyPickedImage(uri, pendingSide)}
        onCropped={(uri) => applyPickedImage(uri, pendingSide)}
        onCancel={() => {
          setReviewVisible(false);
          setPendingUri(null);
          setPendingSide(null);
        }}
      />
      <TouchableOpacity style={styles.button} onPress={saveAndContinue} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Documents</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 24, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2A44', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  card: {
    width: '100%',
    minHeight: 180,
    height: 180,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  cardPlaceholder: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  button: { marginTop: 12, backgroundColor: '#1F2A44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
