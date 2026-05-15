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
} from 'react-native';
import { Icon } from '../../../lib/icons';
import { authStyles } from '../authStyles';

const OTP_LENGTH = 4;
const styles = authStyles;

export default function OTPVerifyStep({
  otpTarget = 'phone', // 'phone' | 'email'
  email,
  country,
  digitsOnly,
  channel,
  otp,
  otpRefs,
  otpFocusedIndex,
  setOtpFocusedIndex,
  loading,
  error,
  timer,
  onVerifyOtp,
  onResendOtp,
  onChangeNumber,
  onOtpChange,
  onOtpKeyPress,
}) {
  const otpComplete = otp.join('').length === OTP_LENGTH;
  const channelHint =
    channel === 'whatsapp'
      ? 'WhatsApp'
      : channel === 'sms'
        ? 'SMS'
        : channel === 'email'
          ? 'Email'
        : channel
          ? 'SMS'
          : null;

  return (
    <KeyboardAvoidingView style={styles.otpContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.otpScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.otpHeader}>
          <View style={styles.otpHeaderInner}>
            <View style={styles.otpLogoBox}>
              <Icon name="shieldCheck" size={21} color="#1F2A44" />
            </View>
            <Text style={styles.otpBrandText}>Mineral Bridge</Text>
          </View>
        </View>
        <View style={styles.otpMain}>
          <View style={styles.otpHeadBlock}>
            <Text style={styles.otpTitle}>Verify OTP</Text>
            <Text style={styles.otpSubtitle}>
              Verification protects your account and trading access. Enter the 4-digit OTP sent to{' '}
              {otpTarget === 'email' ? email : `${country.dial} ${digitsOnly}`}
              {channelHint ? ` via ${channelHint}` : ''}
            </Text>
          </View>
          <View style={styles.otpInputsBlock}>
            <View style={styles.otpRow}>
              {[0, 1, 2, 3].map((i) => (
                <TextInput
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  style={[
                    styles.otpInput,
                    (otpFocusedIndex === i || otp[i]) && styles.otpInputGlow,
                  ]}
                  value={otp[i]}
                  onChangeText={(v) => onOtpChange(i, v)}
                  onKeyPress={(e) => onOtpKeyPress(i, e)}
                  onFocus={() => setOtpFocusedIndex(i)}
                  onBlur={() => setOtpFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={1}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.otpButton,
                (loading || !otpComplete) && styles.otpButtonDisabled,
              ]}
              onPress={onVerifyOtp}
              disabled={loading || !otpComplete}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.otpButtonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>
            <View style={styles.otpResendWrap}>
              {timer > 0 ? (
                <Text style={styles.otpResendText}>Resend OTP in {timer}s</Text>
              ) : (
                <TouchableOpacity onPress={onResendOtp} disabled={loading}>
                  <Text style={styles.otpResendLink}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {error ? <Text style={styles.otpErrorText}>{error}</Text> : null}
          {timer <= 0 ? (
            <TouchableOpacity onPress={onChangeNumber} style={styles.otpBackBtn}>
              <Text style={styles.otpBackText}>{otpTarget === 'email' ? 'Change email' : 'Change number'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
