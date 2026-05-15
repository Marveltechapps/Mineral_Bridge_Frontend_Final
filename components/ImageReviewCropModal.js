/**
 * Optional crop step for KYC document uploads.
 * After user picks an image (full size), this modal lets them:
 * - "Use full image" → keep original dimensions, no crop
 * - "Crop" → open native crop UI, then use cropped result
 * Preserves original resolution when "Use full image" is chosen.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  InteractionManager,
} from 'react-native';
import { pickImageStable } from '../lib/stablePicker';
import { colors } from '../lib/theme';

export default function ImageReviewCropModal({
  visible,
  imageUri,
  label = 'Document image',
  onUseFullImage,
  onCropped,
  onCancel,
}) {
  const [cropping, setCropping] = useState(false);

  const handleUseFullImage = () => {
    if (imageUri) onUseFullImage(imageUri);
  };

  const handleCrop = () => {
    setCropping(true);
    pickImageStable(
      { aspect: [4, 3], quality: 0.9, crop: true },
      (croppedUri) => {
        InteractionManager.runAfterInteractions(() => {
          setCropping(false);
          onCropped(croppedUri);
        });
      },
      (msg) => {
        setCropping(false);
        Alert.alert('Error', msg || 'Could not open crop.');
      },
      () => setCropping(false)
    );
  };

  if (!visible || !imageUri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.subtitle}>
            Use the full image or crop to adjust the area.
          </Text>
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.useFullBtn}
              onPress={handleUseFullImage}
              disabled={cropping}
              activeOpacity={0.8}
            >
              <Text style={styles.useFullText}>Use full image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cropBtn}
              onPress={handleCrop}
              disabled={cropping}
              activeOpacity={0.8}
            >
              {cropping ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.cropBtnText}>Crop image</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={cropping}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  previewWrap: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  actions: {
    gap: 10,
  },
  useFullBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  useFullText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cropBtn: {
    backgroundColor: '#64748b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  cropBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
