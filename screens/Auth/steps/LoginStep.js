import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Icon } from '../../../lib/icons';
import { getPhonePlaceholder, formatPhoneAsYouType } from '../../../lib/phoneValidation';
import { authStyles } from '../authStyles';
import CountryPickerModal from '../components/CountryPickerModal';
import PolicyModal from '../components/PolicyModal';

const styles = authStyles;

export default function LoginStep({
  country,
  setCountry,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  loginMode, // 'mobile' | 'email' | 'whatsapp'
  setLoginMode,
  preferredChannel,
  setPreferredChannel,
  digitsOnly,
  showInvalid,
  validation,
  phoneFocused,
  setPhoneFocused,
  loading,
  phoneError,
  emailError,
  emailValid,
  onSendOtp,
  countryPickerOpen,
  setCountryPickerOpen,
  policyModal,
  setPolicyModal,
}) {
  const [consentAccepted, setConsentAccepted] = useState(false);
  const trimmedEmail = useMemo(() => String(email || '').trim(), [email]);
  const hasMobileInput = !!(digitsOnly && digitsOnly.length > 0);
  const hasEmailInput = trimmedEmail.length > 0;

  const canSend =
    !loading &&
    ((loginMode === 'mobile' && hasMobileInput && validation.valid) ||
      (loginMode === 'whatsapp' && hasMobileInput && validation.valid) ||
      (loginMode === 'email' && hasEmailInput && emailValid));

  const handleSendOtp = () => {
    // Never change tabs automatically.
    onSendOtp?.(loginMode);
  };

  return (
    <KeyboardAvoidingView style={styles.signInContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.signInScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.signInHeader}>
          <View style={styles.signInHeaderInner}>
            <View style={styles.signInLogoBox}>
              <View style={styles.signInLogoIcon}>
                <Icon name="shieldCheck" size={21} color="#1F2A44" />
              </View>
            </View>
            <Text style={styles.signInBrandText}>Mineral Bridge</Text>
          </View>
        </View>

        <View style={styles.signInMain}>
              <Text style={styles.signInTitle}>Sign in to Mineral Bridge</Text>
              <Text style={styles.signInSubtitle}>We verify every trader for secure and compliant mineral trade.</Text>

              <Text style={styles.signInChooseMethodLabel}>Choose login method</Text>

              <View style={styles.signInForm}>
            <View style={styles.signInModeTabs}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setLoginMode('mobile');
                  setPreferredChannel('sms');
                }}
                style={[styles.signInModeTab, loginMode === 'mobile' && styles.signInModeTabActive]}
              >
                <Text style={[styles.signInModeTabText, loginMode === 'mobile' && styles.signInModeTabTextActive]}>Mobile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setLoginMode('email');
                  // keep preferredChannel as-is; email flow is decided by selected tab.
                }}
                style={[styles.signInModeTab, loginMode === 'email' && styles.signInModeTabActive]}
              >
                <Text style={[styles.signInModeTabText, loginMode === 'email' && styles.signInModeTabTextActive]}>Email</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setLoginMode('whatsapp');
                  setPreferredChannel('whatsapp');
                }}
                style={[styles.signInModeTab, loginMode === 'whatsapp' && styles.signInModeTabActive]}
              >
                <Text style={[styles.signInModeTabText, loginMode === 'whatsapp' && styles.signInModeTabTextActive]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>

            {loginMode === 'mobile' || loginMode === 'whatsapp' ? (
              <>
                <Text style={styles.signInLabel}>
                  {loginMode === 'whatsapp' ? 'WhatsApp Number' : 'Mobile Number'}
                </Text>
                <View style={[
                  styles.signInInputWrap,
                  showInvalid && styles.signInInputWrapError,
                  (phoneFocused || digitsOnly.length > 0) && !showInvalid && styles.signInInputWrapGlow,
                ]}>
                  <TouchableOpacity
                    style={styles.signInCountrySelector}
                    onPress={() => setCountryPickerOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.signInCountryFlag}>{country.flag}</Text>
                    <Text style={styles.signInCountryCode}>{country.dial}</Text>
                    <Text style={styles.signInChevron}>▼</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.signInPhoneInput}
                    value={formatPhoneAsYouType(country.code, phone)}
                    onChangeText={onPhoneChange}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                    placeholder={getPhonePlaceholder(country.code)}
                    placeholderTextColor="#6B7280"
                    keyboardType="phone-pad"
                    maxLength={country.lengths[1] + 5}
                  />
                </View>
                {showInvalid ? <Text style={styles.signInInvalidText}>{validation.message}</Text> : null}
                {phoneError ? <Text style={styles.signInErrorText}>{phoneError}</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.signInLabel}>Email Address</Text>
                <View style={[styles.signInInputWrap, !!trimmedEmail && styles.signInInputWrapGlow]}>
                  <TextInput
                    style={styles.signInPhoneInput}
                    value={email}
                    onChangeText={onEmailChange}
                    placeholder="mineralbridge@gmail.com"
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {emailError ? <Text style={styles.signInErrorText}>{emailError}</Text> : null}
              </>
            )}

            <View style={styles.signInConsentBox}>
              <View style={styles.signInConsentRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setConsentAccepted((v) => !v)}
                  style={[
                    styles.signInConsentCheckbox,
                    consentAccepted && styles.signInConsentCheckboxChecked,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consentAccepted }}
                >
                  {consentAccepted ? <Text style={styles.signInConsentCheckmark}>✓</Text> : null}
                </TouchableOpacity>
                <Text style={styles.signInConsentText}>
                  I agree to the{' '}
                  <Text style={styles.signInLegalLink} onPress={() => setPolicyModal('terms')}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.signInLegalLink} onPress={() => setPolicyModal('privacy')}>Privacy Policy</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.signInButton,
                (!canSend || !consentAccepted) && styles.signInButtonDisabled,
              ]}
              onPress={handleSendOtp}
              disabled={!canSend || !consentAccepted}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signInButtonText}>Send OTP</Text>}
            </TouchableOpacity>
              </View>
        </View>
      </ScrollView>
      <CountryPickerModal
        visible={countryPickerOpen}
        selected={country}
        onSelect={(c) => { setCountry(c); setCountryPickerOpen(false); }}
        onClose={() => setCountryPickerOpen(false)}
      />
      <PolicyModal visible={!!policyModal} type={policyModal} onClose={() => setPolicyModal(null)} />
    </KeyboardAvoidingView>
  );
}
