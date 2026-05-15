import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Icon } from '../../../lib/icons';
import { authStyles } from '../authStyles';

const styles = authStyles;

export default function UserDetailsStep({
  identityName,
  setIdentityName,
  identityEmail,
  setIdentityEmail,
  identityAvatarUri,
  canProceed,
  error,
  loading,
  onProceedToVerification,
  onPickProfileImage,
  onBack,
  onboardingResume,
}) {
  return (
    <KeyboardAvoidingView style={styles.identityContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.identityScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.identityHeader}>
          <View style={styles.identityHeaderContent}>
            <View style={styles.identityHeaderInner}>
              {onBack ? (
                <TouchableOpacity style={styles.identityBackBtn} onPress={onBack}>
                  <Icon name="chevronLeft" size={22} color="#1F2A44" />
                </TouchableOpacity>
              ) : (
                <View style={styles.identityBackBtn} />
              )}
              <View style={styles.identityHeaderRow}>
                <View style={styles.identityLogoBox}>
                  <Icon name="person" size={21} color="#1F2A44" />
                </View>
                <View style={styles.identityHeaderTextWrap}>
                  <Text style={styles.identityTitle}>Identity Profile</Text>
                  <Text style={styles.identitySubtitle}>STEP 1 OF 3 - MEMBER DETAILS</Text>
                </View>
              </View>
              <View style={styles.identityHeaderRight} />
            </View>
          </View>
        </View>
        <View style={styles.identityMain}>
          <View style={styles.identityAvatarBlock}>
            <View style={styles.identityAvatarWrap}>
              <TouchableOpacity
                style={styles.identityAvatarPlaceholder}
                onPress={onPickProfileImage}
                activeOpacity={0.85}
              >
                {identityAvatarUri ? (
                  <Image source={{ uri: identityAvatarUri }} style={styles.identityAvatarImage} />
                ) : identityName ? (
                  <Text style={styles.identityAvatarLetter}>{identityName.trim().charAt(0).toUpperCase()}</Text>
                ) : (
                  <Icon name="person" size={48} color="#8EC5FF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.identityCameraBtn} onPress={onPickProfileImage}>
                <Icon name="camera" size={14} color="#1F2A44" />
              </TouchableOpacity>
            </View>
            <Text style={styles.identityHeadshotLabel}>PROFILE PHOTO REQUIRED FOR VERIFIED TRADING</Text>
          </View>
          <View style={styles.identityForm}>
            <View style={styles.identityFieldBlock}>
              <Text style={styles.identityFieldLabel}>FULL LEGAL NAME</Text>
              <View style={styles.identityInputWrap}>
                <Icon name="person" size={17.5} color="#8EC5FF" style={styles.identityInputIcon} />
                <TextInput
                  style={styles.identityInput}
                  placeholder="Full legal name"
                  placeholderTextColor="#99A1AF"
                  value={identityName}
                  onChangeText={setIdentityName}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.identityFieldBlock}>
              <Text style={styles.identityFieldLabel}>CORPORATE EMAIL</Text>
              <View style={styles.identityInputWrap}>
                <Icon name="mail" size={17.5} color="#8EC5FF" style={styles.identityInputIcon} />
                <TextInput
                  style={styles.identityInput}
                  placeholder="corporate@company.com"
                  placeholderTextColor="#99A1AF"
                  value={identityEmail}
                  onChangeText={setIdentityEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>
          {error ? <Text style={styles.identityErrorText}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.identityProceedBtn, (!canProceed || loading) && styles.identityProceedBtnDisabled]}
            onPress={onProceedToVerification}
            disabled={!canProceed || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.identityProceedText}>Save & Continue</Text>
                <Icon name="chevronRight" size={14} color="#F2C94C" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
