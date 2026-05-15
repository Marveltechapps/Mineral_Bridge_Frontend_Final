import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Icon } from '../../../lib/icons';
import { authStyles } from '../authStyles';

const styles = authStyles;

export default function KYCUploadStep({
  kycDocFrontUri,
  kycDocBackUri,
  kycUploadCardPressed,
  setKycUploadCardPressed,
  error,
  loading,
  bothDone,
  onPickDocImage,
  onSaveAndComplete,
  onBack,
}) {
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
                <Text style={styles.kycDocHeaderSubtitle}>STEP 2 OF 3 - KYC VERIFICATION</Text>
              </View>
            </View>
            <View style={styles.identityHeaderRight} />
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.kycUploadScroll} style={styles.kycUploadScrollView}>
        <View style={styles.kycUploadMain}>
          <View style={styles.kycUploadHeadingBlock}>
            <Text style={styles.kycUploadHeading}>Upload Documents</Text>
            <Text style={styles.kycUploadSubtitle}>Step 2: Upload clear front and back photos of your ID for faster approval.</Text>
          </View>
          <View style={styles.kycUploadCards}>
            <TouchableOpacity
              style={[styles.kycUploadCard, kycUploadCardPressed === 'front' && styles.kycUploadCardPressed]}
              onPress={() => onPickDocImage('front')}
              onPressIn={() => setKycUploadCardPressed('front')}
              onPressOut={() => setKycUploadCardPressed(null)}
              activeOpacity={1}
            >
              {kycDocFrontUri ? (
                <Image source={{ uri: kycDocFrontUri }} style={styles.kycUploadCardImage} />
              ) : (
                <>
                  <View style={styles.kycUploadCardIconWrap}>
                    <Icon name="camera" size={21} color={kycUploadCardPressed === 'front' ? '#2B7FFF' : '#99A1AF'} />
                  </View>
                  <Text style={[styles.kycUploadCardLabel, kycUploadCardPressed === 'front' && styles.kycUploadCardLabelPressed]}>Tap to Capture Front of Document</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.kycUploadCard, kycUploadCardPressed === 'back' && styles.kycUploadCardPressed]}
              onPress={() => onPickDocImage('back')}
              onPressIn={() => setKycUploadCardPressed('back')}
              onPressOut={() => setKycUploadCardPressed(null)}
              activeOpacity={1}
            >
              {kycDocBackUri ? (
                <Image source={{ uri: kycDocBackUri }} style={styles.kycUploadCardImage} />
              ) : (
                <>
                  <View style={styles.kycUploadCardIconWrap}>
                    <Icon name="camera" size={21} color={kycUploadCardPressed === 'back' ? '#2B7FFF' : '#99A1AF'} />
                  </View>
                  <Text style={[styles.kycUploadCardLabel, kycUploadCardPressed === 'back' && styles.kycUploadCardLabelPressed]}>Tap to Capture Back of Document</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.identityErrorText}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.kycUploadNextBtn, (!bothDone || loading) && styles.kycUploadNextBtnDisabled]}
            onPress={bothDone && !loading ? onSaveAndComplete : undefined}
            disabled={!bothDone || loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.kycUploadNextText}>Submit Documents</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
