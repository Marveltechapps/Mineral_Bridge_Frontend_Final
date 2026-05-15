import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  InteractionManager,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { Icon } from '../../../lib/icons';
import { pickCameraStable } from '../../../lib/stablePicker';
import { authStyles } from '../authStyles';

const styles = authStyles;

async function copyToStableCache(uri, extension = 'jpg') {
  const safeExt = (extension || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
  const filename = `selfie_${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExt}`;
  const dest = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export default function LiveBiometricsStep({
  idType,
  loading,
  error,
  onCaptureAndContinue,
  onSkip,
  onBack,
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const permissionRequestedRef = useRef(false);

  useEffect(() => {
    // Ensure the first entry to this step prompts for permission (otherwise `permission` may be null and taps do nothing).
    if (permissionRequestedRef.current) return;
    if (permission?.granted) return;
    permissionRequestedRef.current = true;
    requestPermission().catch(() => {});
  }, [permission, requestPermission]);

  const handleCaptureInApp = async () => {
    if (!cameraRef.current || !cameraReady || loading || analyzing) return;
    setAnalyzing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (!photo?.uri) {
        throw new Error('No image captured');
      }
      const stableUri = await copyToStableCache(photo.uri, 'jpg');
      onCaptureAndContinue(stableUri, () => setAnalyzing(false));
    } catch (err) {
      setAnalyzing(false);
      if (Platform.OS === 'web' || err.message?.includes('not available')) {
        fallbackToSystemCamera();
        return;
      }
      Alert.alert('Error', err.message || 'Could not capture photo');
    }
  };

  const fallbackToSystemCamera = () => {
    pickCameraStable(
      { aspect: [1, 1], quality: 0.8, cameraType: 'front' },
      (stableUri) => {
        InteractionManager.runAfterInteractions(() => {
          setAnalyzing(true);
          onCaptureAndContinue(stableUri, () => setAnalyzing(false));
        });
      },
      (msg) => {
        Alert.alert(
          msg === 'Permission needed' ? 'Permission needed' : 'Error',
          msg === 'Permission needed'
            ? 'Allow camera access to capture your face for identity verification.'
            : msg || 'Could not open camera'
        );
      },
      () => {}
    );
  };

  const ensurePermissionThenCapture = async () => {
    if (loading || analyzing) return;

    // `permission` can be null on first render; request in that case too.
    const granted =
      permission?.granted ||
      (await requestPermission().then((r) => !!r?.granted).catch(() => false));

    if (!granted) {
      // If user denies, try the system camera path (some OEMs behave better there).
      fallbackToSystemCamera();
      return;
    }

    // In-app camera capture is preferred when ready; otherwise use the system camera.
    if (cameraRef.current && cameraReady) {
      handleCaptureInApp();
      return;
    }

    fallbackToSystemCamera();
  };

  const showInAppCamera = permission?.granted;

  return (
    <View style={styles.kycUploadContainer}>
      <View style={styles.identityHeader}>
        <View style={styles.identityHeaderContent}>
          <View style={styles.identityHeaderInner}>
            <TouchableOpacity style={styles.identityBackBtn} onPress={onBack} activeOpacity={0.8}>
              <Icon name="chevronLeft" size={14} color="#51A2FF" />
            </TouchableOpacity>
            <View style={styles.identityHeaderRow}>
              <View style={styles.identityLogoBox}>
                <Icon name="person" size={21} color="#1F2A44" />
              </View>
              <View style={styles.identityHeaderTextWrap}>
                <Text style={styles.identityTitle}>Identity Profile</Text>
                <Text style={styles.kycDocHeaderSubtitle}>STEP 3 OF 3 - LIVE VERIFICATION</Text>
              </View>
            </View>
            <View style={styles.identityHeaderRight} />
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.kycUploadScroll} style={styles.kycUploadScrollView}>
        <View style={styles.kycUploadMain}>
          <View style={styles.kycUploadHeadingBlock}>
            <Text style={styles.kycUploadHeading}>Live Biometrics</Text>
            <Text style={styles.kycUploadSubtitle}>
              Step 3: Position your face in frame to confirm liveness and complete trusted account verification.
            </Text>
          </View>

          <View style={styles.liveBiometricsFrame}>
            <View style={styles.liveBiometricsFrameInner}>
              {showInAppCamera ? (
                <CameraView
                  ref={cameraRef}
                  style={styles.liveBiometricsCamera}
                  facing="front"
                  onCameraReady={() => setCameraReady(true)}
                />
              ) : (
                <View style={styles.liveBiometricsPlaceholder} />
              )}
              <View style={styles.liveBiometricsFaceGuide} pointerEvents="none" />
              {analyzing || loading ? (
                <View style={styles.liveBiometricsAnalyzing}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.liveBiometricsAnalyzingText}>Analyzing liveness…</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.liveBiometricsCaptureBtn}
              onPress={ensurePermissionThenCapture}
              disabled={loading || analyzing || (showInAppCamera && !cameraReady)}
              activeOpacity={0.9}
            >
              <Icon name="camera" size={28} color="#1F2A44" />
            </TouchableOpacity>
            <Text style={styles.liveBiometricsCaptureLabel}>
              {showInAppCamera ? 'TAP TO CAPTURE' : 'TAP TO OPEN CAMERA'}
            </Text>
          </View>

          {error ? <Text style={styles.identityErrorText}>{error}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}
