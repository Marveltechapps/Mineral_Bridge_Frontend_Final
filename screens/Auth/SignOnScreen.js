import { useState, useEffect, useRef } from 'react';
import { Alert, InteractionManager } from 'react-native';
import * as Location from 'expo-location';
import { setToken, fetchWithAuth, fetchMultipart, fetchPublic } from '../../lib/api';
import { pickImageStable } from '../../lib/stablePicker';
import { uploadAvatar, uploadKycDocuments } from '../../lib/services';
import { getCountryByDial } from '../../lib/countries';
import { validatePhone } from '../../lib/phoneValidation';
import ImageReviewCropModal from '../../components/ImageReviewCropModal';

import LoginStep from './steps/LoginStep';
import OTPVerifyStep from './steps/OTPVerifyStep';
import LocationStep from './steps/LocationStep';
import UserDetailsStep from './steps/UserDetailsStep';
import KYCDocumentTypeStep from './steps/KYCDocumentTypeStep';
import KYCUploadStep from './steps/KYCUploadStep';
import LiveBiometricsStep from './steps/LiveBiometricsStep';

const DEFAULT_COUNTRY = getCountryByDial('+27');
const OTP_LENGTH = 4;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignOnScreen({ onComplete, onboardingResume }) {
  const [step, setStep] = useState(onboardingResume ? 'identity' : 'phone');
  const [resumeChecked, setResumeChecked] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loginMode, setLoginMode] = useState('mobile'); // 'mobile' | 'email' | 'whatsapp'
  const [preferredChannel, setPreferredChannel] = useState('whatsapp'); // 'whatsapp' | 'sms'
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const error = phoneError || emailError;
  const [otpChannel, setOtpChannel] = useState(null);
  const [policyModal, setPolicyModal] = useState(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [lastOtpFromServer, setLastOtpFromServer] = useState(null);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [otpFocusedIndex, setOtpFocusedIndex] = useState(null);
  const [otpTarget, setOtpTarget] = useState('phone'); // 'phone' | 'email'
  const [identityName, setIdentityName] = useState('');
  const [identityEmail, setIdentityEmail] = useState('');
  const [identityAvatarUri, setIdentityAvatarUri] = useState(null);
  const [kycDocFrontUri, setKycDocFrontUri] = useState(null);
  const [kycDocBackUri, setKycDocBackUri] = useState(null);
  const [kycSelectedDocType, setKycSelectedDocType] = useState(null);
  const [kycUploadCardPressed, setKycUploadCardPressed] = useState(null);
  const [kycReviewVisible, setKycReviewVisible] = useState(false);
  const [kycPendingUri, setKycPendingUri] = useState(null);
  const [kycPendingSide, setKycPendingSide] = useState(null);
  const otpRefs = useRef([]);
  const trimmedIdentityName = identityName.trim();
  const trimmedIdentityEmail = identityEmail.trim();
  const canProceedIdentity =
    !!trimmedIdentityName &&
    !!trimmedIdentityEmail &&
    EMAIL_REGEX.test(trimmedIdentityEmail) &&
    !!identityAvatarUri;

  const digitsOnly = phone.replace(/\D/g, '');
  const validation = validatePhone(country, digitsOnly);
  const minLen = (country.lengths && country.lengths[0]) || 10;
  const showInvalid = digitsOnly.length >= minLen && !validation.valid;
  const trimmedLoginEmail = loginEmail.trim();
  const emailValid = !!trimmedLoginEmail && EMAIL_REGEX.test(trimmedLoginEmail);
  const hasAnyInput = (digitsOnly && digitsOnly.length > 0) || (!!trimmedLoginEmail);
  const methodSelected = preferredChannel === 'whatsapp' || preferredChannel === 'sms';

  useEffect(() => {
    setPhone((prev) => prev.replace(/\D/g, '').slice(0, country.lengths[1]));
  }, [country.dial]);

  useEffect(() => {
    if (step !== 'otp' || timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [step, timer]);

  // When resuming onboarding (token exists but profile/KYC incomplete), fetch /me and jump to first incomplete step.
  useEffect(() => {
    if (!onboardingResume || resumeChecked) return;
    let cancelled = false;
    fetchWithAuth('/api/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => {
        if (cancelled || !me) return;
        const hasName = !!(me.name && String(me.name).trim());
        const hasEmail = !!(me.email && String(me.email).trim());
        const kycDone = me.kycStatus && me.kycStatus !== 'pending';
        if (!hasName || !hasEmail) setStep('identity');
        else if (!kycDone) setStep('kyc-document');
        if (me.name) setIdentityName(me.name);
        if (me.email) setIdentityEmail(me.email || '');
        setResumeChecked(true);
      })
      .catch(() => { if (!cancelled) setResumeChecked(true); });
    return () => { cancelled = true; };
  }, [onboardingResume, resumeChecked]);

  const sendOtp = async (modeArg) => {
    const mode = modeArg || loginMode;

    // Enforce: Mobile -> SMS only, WhatsApp -> WhatsApp only, Email -> Email only.
    const usingEmail = mode === 'email';
    const usingPhone = mode === 'mobile' || mode === 'whatsapp';
    const channel = mode === 'whatsapp' ? 'whatsapp' : mode === 'mobile' ? 'sms' : 'email';

    if (usingEmail) {
      if (!trimmedLoginEmail) {
        setPhoneError('');
        setEmailError('Enter email address');
        return;
      }
      if (!emailValid) {
        setPhoneError('');
        setEmailError('Please enter a valid email address');
        return;
      }
    }

    if (usingPhone) {
      if (!digitsOnly || digitsOnly.length === 0) {
        setEmailError('');
        setPhoneError('Enter mobile number');
        return;
      }
      if (!validation.valid) {
        setEmailError('');
        setPhoneError(validation.message || 'Please enter a valid mobile number');
        return;
      }
    }

    setPhoneError('');
    setEmailError('');
    setOtpTarget(usingEmail ? 'email' : 'phone');
    setLoading(true);
    try {
      const res = await fetchPublic('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify(
          usingEmail
            ? { email: trimmedLoginEmail, preferredChannel: 'email' }
            : { countryCode: country.dial, phone: digitsOnly, preferredChannel: channel }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to send OTP');
      setLastOtpFromServer(data.otp || null);
      setOtpChannel(data.channel || channel);
      if (channel === 'sms' || channel === 'whatsapp') setPreferredChannel(channel);
      setStep('otp');
      setTimer(30);
    } catch (e) {
      const msg = e.message || 'Failed to send OTP';
      if (usingEmail) setEmailError(msg);
      else setPhoneError(msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) return;
    setPhoneError('');
    setEmailError('');
    setLoading(true);
    try {
      const res = await fetchPublic('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          ...(otpTarget === 'email' ? { email: trimmedLoginEmail } : { countryCode: country.dial, phone: digitsOnly }),
          otp: code,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Invalid OTP');

      if (data.token) {
        await setToken(data.token);
        // Already registered (has completed profile/onboarding): go straight to app home
        const isExistingUser = data.isVerified === true || (data.user && data.user.name);
        if (isExistingUser) {
          onComplete();
          return;
        }
        setStep('location');
        return;
      }
      const res2 = await fetchPublic('/api/auth/register-or-login', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: country.dial,
          phone: digitsOnly,
          name: '',
          email: '',
        }),
      });
      const data2 = await res2.json().catch(() => ({}));
      if (!res2.ok) throw new Error(data2.error || 'Login failed');
      await setToken(data2.token);
      setStep('location');
    } catch (e) {
      const msg = e.message || 'Invalid OTP';
      if (otpTarget === 'email') setEmailError(msg);
      else setPhoneError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    setPhoneError('');
    setEmailError('');
    const next = [...otp];
    next[i] = v.slice(-1);
    setOtp(next);
    if (v && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
    if (i === OTP_LENGTH - 1 && v && next.every((d) => d)) verifyOtp();
  };

  const handleOtpKeyPress = (i, e) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const resendOtp = async () => {
    setPhoneError('');
    setEmailError('');
    setLoading(true);
    try {
      const res = await fetchPublic('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify(otpTarget === 'email' ? { email: trimmedLoginEmail } : { countryCode: country.dial, phone: digitsOnly }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to resend');
      setLastOtpFromServer(data.otp || null);
      setOtpChannel(data.channel || null);
      setTimer(30);
      setOtp(['', '', '', '']);
    } catch (e) {
      const msg = e.message || 'Failed to resend OTP';
      if (otpTarget === 'email') setEmailError(msg);
      else setPhoneError(msg);
    } finally {
      setLoading(false);
    }
  };

  const enableLocation = async () => {
    setLoading(true);
    setPhoneError('');
    setEmailError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPhoneError('Location permission is required for compliance and logistics.');
        setLoading(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;

      const res = await fetchWithAuth('/api/users/me/location', {
        method: 'POST',
        body: JSON.stringify({ latitude, longitude }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save location');
      }

      setStep('identity');
    } catch (err) {
      setPhoneError(err.message || 'Could not get or save location.');
    } finally {
      setLoading(false);
    }
  };

  const onPhoneChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const max = country.lengths[1];
    setPhone(cleaned.slice(0, max));
  };

  const onEmailChange = (text) => {
    setLoginEmail(String(text || '').replace(/\s/g, ''));
  };

  const pickProfileImage = () => {
    pickImageStable(
      { aspect: [1, 1], quality: 0.8 },
      (stableUri) => {
        InteractionManager.runAfterInteractions(() => setIdentityAvatarUri(stableUri));
      },
      (msg) => Alert.alert(msg === 'Permission needed' ? 'Permission needed' : 'Error', msg === 'Permission needed' ? 'Allow photo library access to set your profile picture.' : msg || 'Could not open gallery'),
      () => {}
    );
  };

  const applyKycPickedImage = (uri, side) => {
    if (side === 'front') setKycDocFrontUri(uri);
    else setKycDocBackUri(uri);
    setKycReviewVisible(false);
    setKycPendingUri(null);
    setKycPendingSide(null);
  };

  const pickKycDocImage = (side) => {
    pickImageStable(
      { quality: 1 },
      (stableUri) => {
        InteractionManager.runAfterInteractions(() => {
          setKycPendingUri(stableUri);
          setKycPendingSide(side);
          setKycReviewVisible(true);
        });
      },
      (msg) => Alert.alert(msg === 'Permission needed' ? 'Permission needed' : 'Error', msg === 'Permission needed' ? 'Allow photo library access to capture document.' : msg || 'Could not open gallery'),
      () => {}
    );
  };

  const openKycUpload = (docType) => {
    setKycSelectedDocType(docType);
    setKycDocFrontUri(null);
    setKycDocBackUri(null);
    setStep('kyc-upload-document');
  };

  const saveKycDocumentsAndComplete = async () => {
    if (!kycSelectedDocType || !kycDocFrontUri || !kycDocBackUri) return;
    setLoading(true);
    setPhoneError('');
    setEmailError('');
    try {
      await uploadKycDocuments(kycSelectedDocType, {
        frontUri: kycDocFrontUri,
        backUri: kycDocBackUri,
      });
      setStep('live-biometrics');
      setPhoneError('');
      setEmailError('');
    } catch (err) {
      setPhoneError(err.message || 'Failed to save documents');
      Alert.alert('Error', err.message || 'Failed to save documents');
    } finally {
      setLoading(false);
    }
  };

  const LIVE_BIOMETRICS_NO_FACE_MESSAGE =
    'Only your live face can unlock access. Please look at the camera with your face clearly visible. Showing an ID, photo, or other object will not be accepted.';

  const onLiveBiometricsCapture = async (selfieUri, done) => {
    if (!kycSelectedDocType) return;
    setLoading(true);
    setPhoneError('');
    setEmailError('');
    try {
      await uploadKycDocuments(kycSelectedDocType, { selfieUri });
      onComplete();
    } catch (err) {
      const isNoFace = err.code === 'NO_FACE_DETECTED';
      const message = isNoFace ? LIVE_BIOMETRICS_NO_FACE_MESSAGE : (err.message || 'Failed to save selfie');
      setPhoneError(message);
      Alert.alert(isNoFace ? 'Face required' : 'Error', message);
    } finally {
      setLoading(false);
      done?.();
    }
  };

  // Selfie is required for new users; no skip to member access.
  const onLiveBiometricsSkip = () => {};

  const proceedToVerification = async () => {
    if (!trimmedIdentityName) {
      setPhoneError('Please enter your full legal name.');
      return;
    }
    if (!trimmedIdentityEmail) {
      setPhoneError('Please enter your corporate email.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedIdentityEmail)) {
      setPhoneError('Please enter a valid email address.');
      return;
    }
    if (!identityAvatarUri) {
      setPhoneError('Please upload a profile photo to continue.');
      return;
    }

    setLoading(true);
    setPhoneError('');
    setEmailError('');
    try {
      const res = await fetchWithAuth('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: trimmedIdentityName,
          email: trimmedIdentityEmail,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update profile');
      }
      await uploadAvatar(identityAvatarUri);
      setStep('kyc-document');
    } catch (err) {
      const message = err.message || 'Something went wrong';
      setPhoneError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <LoginStep
        country={country}
        setCountry={setCountry}
        phone={phone}
        onPhoneChange={onPhoneChange}
        email={loginEmail}
        onEmailChange={onEmailChange}
        loginMode={loginMode}
        setLoginMode={setLoginMode}
        preferredChannel={preferredChannel}
        setPreferredChannel={setPreferredChannel}
        digitsOnly={digitsOnly}
        showInvalid={showInvalid}
        validation={validation}
        phoneFocused={phoneFocused}
        setPhoneFocused={setPhoneFocused}
        loading={loading}
        phoneError={phoneError}
        emailError={emailError}
        emailValid={emailValid}
        onSendOtp={sendOtp}
        countryPickerOpen={countryPickerOpen}
        setCountryPickerOpen={setCountryPickerOpen}
        policyModal={policyModal}
        setPolicyModal={setPolicyModal}
      />
    );
  }

  if (step === 'otp') {
    return (
      <OTPVerifyStep
        otpTarget={otpTarget}
        email={trimmedLoginEmail}
        country={country}
        digitsOnly={digitsOnly}
        channel={otpChannel || (otpTarget === 'email' ? 'email' : preferredChannel)}
        otp={otp}
        otpRefs={otpRefs}
        otpFocusedIndex={otpFocusedIndex}
        setOtpFocusedIndex={setOtpFocusedIndex}
        loading={loading}
        error={otpTarget === 'email' ? emailError : phoneError}
        timer={timer}
        onVerifyOtp={verifyOtp}
        onResendOtp={resendOtp}
        onChangeNumber={() => {
          setPhoneError('');
          setEmailError('');
          setLastOtpFromServer(null);
          setOtpChannel(null);
          setOtp(['', '', '', '']);
          setStep('phone');
        }}
        onOtpChange={handleOtpChange}
        onOtpKeyPress={handleOtpKeyPress}
      />
    );
  }

  if (step === 'location') {
    return (
      <LocationStep
        loading={loading}
        error={error}
        onEnableLocation={enableLocation}
        onSkip={() => {
          setPhoneError('');
          setEmailError('');
          setLoading(false);
          setStep('identity');
        }}
      />
    );
  }

  if (step === 'identity') {
    return (
      <UserDetailsStep
        identityName={identityName}
        setIdentityName={setIdentityName}
        identityEmail={identityEmail}
        setIdentityEmail={setIdentityEmail}
        identityAvatarUri={identityAvatarUri}
        canProceed={canProceedIdentity}
        error={error}
        loading={loading}
        onProceedToVerification={proceedToVerification}
        onPickProfileImage={pickProfileImage}
        onBack={onboardingResume ? undefined : () => setStep('location')}
        onboardingResume={onboardingResume}
      />
    );
  }

  if (step === 'kyc-document') {
    return (
      <KYCDocumentTypeStep
        onSelectDocType={openKycUpload}
        onBack={() => setStep('identity')}
      />
    );
  }

  if (step === 'kyc-upload-document') {
    return (
      <>
        <KYCUploadStep
          kycDocFrontUri={kycDocFrontUri}
          kycDocBackUri={kycDocBackUri}
          kycUploadCardPressed={kycUploadCardPressed}
          setKycUploadCardPressed={setKycUploadCardPressed}
          error={error}
          loading={loading}
          bothDone={!!(kycDocFrontUri && kycDocBackUri)}
          onPickDocImage={pickKycDocImage}
          onSaveAndComplete={saveKycDocumentsAndComplete}
          onBack={() => setStep('kyc-document')}
        />
        <ImageReviewCropModal
          visible={kycReviewVisible}
          imageUri={kycPendingUri}
          label={kycPendingSide === 'front' ? 'Front of document' : 'Back of document'}
          onUseFullImage={(uri) => applyKycPickedImage(uri, kycPendingSide)}
          onCropped={(uri) => applyKycPickedImage(uri, kycPendingSide)}
          onCancel={() => {
            setKycReviewVisible(false);
            setKycPendingUri(null);
            setKycPendingSide(null);
          }}
        />
      </>
    );
  }

  if (step === 'live-biometrics') {
    return (
      <LiveBiometricsStep
        idType={kycSelectedDocType}
        loading={loading}
        error={error}
        onCaptureAndContinue={onLiveBiometricsCapture}
        onBack={() => setStep('kyc-upload-document')}
      />
    );
  }

  return null;
}
