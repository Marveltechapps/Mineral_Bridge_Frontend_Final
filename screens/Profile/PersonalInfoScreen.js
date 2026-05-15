import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  Alert,
  InteractionManager,
} from 'react-native';
import { fetchWithAuth } from '../../lib/api';
import { uploadAvatar } from '../../lib/services';
import { pickImageStable, checkPendingImageResult } from '../../lib/stablePicker';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { normalizeRemoteImageUri } from '../../lib/remoteImageUri';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const SECTION_GAP = Math.round(WINDOW_HEIGHT * 0.01);
const KYC_TOP_MARGIN = Math.round(WINDOW_HEIGHT * 0.03);
const DROPDOWN_BLUE = '#51A2FF';
const ACCENT_BLUE = '#2B7FFF';

function formatPhone(phone, countryCode) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  const dial = countryCode || '+1';
  if (digits.length <= 3) return `${dial} ${digits}`;
  if (digits.length <= 6) return `${dial} ${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${dial} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function parsePhoneKey(phoneKey) {
  if (!phoneKey || typeof phoneKey !== 'string') return { countryCode: '', digits: '' };
  const sep = phoneKey.indexOf('|');
  if (sep < 0) return { countryCode: '', digits: phoneKey.replace(/\D/g, '') };
  return {
    countryCode: phoneKey.slice(0, sep).trim(),
    digits: phoneKey.slice(sep + 1).replace(/\D/g, ''),
  };
}

export default function PersonalInfoScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const load = () => {
    setLoading(true);
    fetchWithAuth('/api/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted.current) return;
        setUser(data);
        setName(data?.name || '');
        setEmail(data?.email || '');
      })
      .catch(() => { if (isMounted.current) setUser(null); })
      .finally(() => { if (isMounted.current) setLoading(false); });
  };

  useEffect(load, []);

  // Android: recover gallery pick result if activity was recreated
  useEffect(() => {
    checkPendingImageResult((stableUri) => {
      if (!isMounted.current) return;
      setAvatarUploading(true);
      uploadAvatar(stableUri, 'image/jpeg')
        .then((profile) => {
          InteractionManager.runAfterInteractions(() => {
            if (isMounted.current) setUser((prev) => (prev ? { ...prev, avatarUrl: profile.avatarUrl } : prev));
          });
        })
        .catch((err) => {
          if (isMounted.current) Alert.alert('Error', err.message || 'Could not upload');
        })
        .finally(() => {
          InteractionManager.runAfterInteractions(() => {
            if (isMounted.current) setAvatarUploading(false);
          });
        });
    });
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() || undefined, email: email.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Update failed');
      const data = await res.json();
      if (!isMounted.current) return;
      setUser(data);
      setEditingEmail(false);
      InteractionManager.runAfterInteractions(() => {
        if (isMounted.current) navigation.goBack();
      });
    } catch (e) {
      if (isMounted.current) Alert.alert('Error', e.message || 'Update failed');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const pickProfileImage = () => {
    pickImageStable(
      { aspect: [1, 1], quality: 0.8 },
      (stableUri) => {
        InteractionManager.runAfterInteractions(() => {
          if (!isMounted.current) return;
          setAvatarUploading(true);
          uploadAvatar(stableUri, 'image/jpeg')
          .then((profile) => {
            InteractionManager.runAfterInteractions(() => {
              if (isMounted.current) setUser((prev) => (prev ? { ...prev, avatarUrl: profile.avatarUrl } : prev));
            });
          })
          .catch((err) => {
            if (isMounted.current) Alert.alert('Error', err.message || 'Could not upload');
          })
          .finally(() => {
            InteractionManager.runAfterInteractions(() => {
              if (isMounted.current) setAvatarUploading(false);
            });
          });
        });
      },
      (msg) => {
        if (!isMounted.current) return;
        Alert.alert(msg === 'Permission needed' ? 'Permission needed' : 'Error', msg === 'Permission needed' ? 'Allow photo library access to set your profile picture.' : msg || 'Could not open gallery');
      },
      () => {}
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { countryCode, digits } = parsePhoneKey(user?.phone);
  const formattedPhone = formatPhone(digits, countryCode || user?.countryCode);
  const isVerified = user && ['verified', 'approved'].includes(user.kycStatus);
  const isUnderReview = user?.kycStatus === 'under_review';

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={() => navigation.goBack()}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Icon name="person" size={18} color={colors.primary} style={styles.headerPersonIcon} />
            <Text style={styles.headerTitle}>PERSONAL INFORMATION</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={pickProfileImage}
            activeOpacity={0.8}
            disabled={avatarUploading}
          >
            <View style={styles.avatar}>
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: String(user.avatarUrl) }}
                  style={styles.avatarImage}
                  onLoad={() => console.log('IMG_LOADED', user.avatarUrl)}
                  onError={(e) => console.log('IMG_ERROR', e?.nativeEvent, user.avatarUrl)}
                />
              ) : (
                <Icon name="person" size={48} color={colors.textLight} />
              )}
            </View>
            <View style={styles.cameraBadge}>
              <Icon name="camera" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>FULL NAME</Text>
        <View style={styles.fieldRow}>
          <Icon name="person" size={20} color={colors.textMuted} style={styles.fieldIcon} />
          <Text style={styles.fieldValue}>{name || '—'}</Text>
          <Icon name="lock" size={18} color={colors.textLight} style={styles.fieldRightIcon} />
        </View>
        <Text style={styles.fieldHint}>Name is locked to KYC verification.</Text>

        <View style={styles.phoneSectionWrap}>
          <Text style={styles.sectionLabel}>PHONE NUMBER</Text>
          <View style={styles.fieldRow}>
          <Icon name="phone" size={20} color={colors.textMuted} style={styles.fieldIcon} />
          <Text style={styles.fieldValue}>{formattedPhone || '—'}</Text>
          {formattedPhone ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          ) : null}
          </View>
        </View>

        <View style={styles.emailSectionWrap}>
          <Text style={styles.sectionLabel}>EMAIL ADDRESS</Text>
        {editingEmail ? (
          <>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              autoFocus
            />
            <View style={styles.editRow}>
              <TouchableOpacity onPress={() => setEditingEmail(false)}>
                <Text style={styles.editCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.fieldRow}>
            <Icon name="mail" size={20} color={colors.textMuted} style={styles.fieldIcon} />
            <Text style={styles.fieldValue}>{email || '—'}</Text>
            <TouchableOpacity onPress={() => setEditingEmail(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>

        <TouchableOpacity
          style={[styles.kycBanner, styles.kycBannerTop, isVerified && styles.kycBannerVerified]}
          onPress={() => navigation.navigate('KYCStatus')}
          activeOpacity={0.8}
        >
          <View style={styles.kycBannerLeft}>
            <View style={[styles.kycCheckWrap, isVerified && styles.kycCheckVerified]}>
              <Icon name="check" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.kycBannerTextWrap}>
              <Text style={styles.kycBannerTitle}>KYC Status: {isVerified ? 'Verified' : 'Pending'}</Text>
              <Text style={styles.kycBannerSub}>
                {isVerified
                  ? 'Identity confirmed via National ID.'
                  : isUnderReview
                    ? 'Your verification is under review. You will be marked Verified after admin approval.'
                    : 'Complete KYC to verify your identity.'}
              </Text>
            </View>
          </View>
          <Icon name="chevronRight" size={20} color={isVerified ? '#15803D' : colors.textMuted} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  headerTitleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerPersonIcon: { marginRight: 4 },
  headerTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  headerRight: { width: 44 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  profileSection: { alignItems: 'center', marginBottom: SECTION_GAP },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  emailSectionWrap: { marginTop: SECTION_GAP },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: SECTION_GAP,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: SECTION_GAP,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldIcon: { marginRight: 12 },
  fieldValue: { flex: 1, fontSize: 16, color: colors.primary, fontWeight: '500' },
  fieldRightIcon: { marginLeft: 8 },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginBottom: SECTION_GAP },
  phoneSectionWrap: { marginTop: SECTION_GAP },
  verifiedBadge: {
    backgroundColor: colors.successGreenBg,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  verifiedBadgeText: { fontSize: 12, fontWeight: '700', color: colors.success },
  editLink: { fontSize: 14, fontWeight: '600', color: ACCENT_BLUE },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: SECTION_GAP,
    fontSize: 16,
    color: colors.primary,
    backgroundColor: colors.white,
  },
  editRow: { flexDirection: 'row', gap: 12, marginBottom: SECTION_GAP },
  editCancel: { fontSize: 14, fontWeight: '600', color: colors.textMuted, paddingVertical: 14 },
  saveBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.borderLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: SECTION_GAP,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kycBannerTop: { marginTop: KYC_TOP_MARGIN },
  kycBannerVerified: {
    backgroundColor: colors.successGreenBg,
    borderColor: colors.success,
  },
  kycBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  kycCheckWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kycCheckVerified: { backgroundColor: colors.success },
  kycBannerTextWrap: { flex: 1 },
  kycBannerTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  kycBannerSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
