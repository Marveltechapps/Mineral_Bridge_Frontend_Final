import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
  Image,
  Alert,
  InteractionManager,
  useWindowDimensions,
} from 'react-native';
import { setToken, fetchWithAuth } from '../../lib/api';
import { uploadAvatar } from '../../lib/services';
import { pickImageStable, checkPendingImageResult } from '../../lib/stablePicker';
import { colors } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { useArtisanalCanAccess } from '../../lib/ArtisanalAccessContext';
import { useHeaderPaddingTop } from '../../lib/headerInsets';
import { normalizeRemoteImageUri } from '../../lib/remoteImageUri';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const PROFILE_HEADER_HEIGHT = 120;
const PROFILE_HEADER_TOP = Math.round(WINDOW_HEIGHT * 0.04);
const PROFILE_HEADER_BOTTOM = Math.round(WINDOW_HEIGHT * 0.02);

const MENU_ITEMS_BASE = [
  { id: 'personal', label: 'Personal Information', iconName: 'person', screen: 'PersonalInfo' },
  { id: 'addresses', label: 'Saved Addresses', iconName: 'location', screen: 'Addresses' },
  { id: 'artisanal', label: 'Artisanal Mining Profile', iconName: 'pickaxe', screen: 'ArtisanalProfile' },
  { id: 'payment', label: 'Payment Methods', iconName: 'card', screen: 'PaymentMethods' },
  { id: 'order_history', label: 'Order History', iconName: 'receipt', screen: 'OrderHistory' },
  { id: 'history', label: 'Transaction History', iconName: 'time', screen: 'TransactionHistory' },
  { id: 'security', label: 'Security & Privacy', iconName: 'shield', screen: 'Security' },
  { id: 'app_settings', label: 'App Settings', iconName: 'settings', screen: 'AppSettings' },
  { id: 'help', label: 'Help & Support', iconName: 'help', screen: 'Help' },
];

export default function ProfileScreen({ navigation, onLogout }) {
  const { width } = useWindowDimensions();
  const profileHeaderPaddingTop = useHeaderPaddingTop(PROFILE_HEADER_TOP);
  const contentWidth = Math.min(width, 420);
  const { isAfrican } = useArtisanalCanAccess();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchWithAuth('/api/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Android: recover gallery pick result if activity was recreated
  useEffect(() => {
    checkPendingImageResult((stableUri) => {
      setAvatarUploading(true);
      uploadAvatar(stableUri, 'image/jpeg')
        .then((profile) => {
          InteractionManager.runAfterInteractions(() => {
            setUser((prev) => (prev ? { ...prev, avatarUrl: profile.avatarUrl } : prev));
          });
        })
        .catch((err) => Alert.alert('Error', err.message || 'Could not upload'))
        .finally(() => {
          InteractionManager.runAfterInteractions(() => setAvatarUploading(false));
        });
    });
  }, []);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await setToken(null);
    onLogout?.();
  };

  const pickProfileImage = () => {
    pickImageStable(
      { aspect: [1, 1], quality: 0.8 },
      (stableUri) => {
        InteractionManager.runAfterInteractions(() => {
          setAvatarUploading(true);
          uploadAvatar(stableUri, 'image/jpeg')
          .then((profile) => {
            InteractionManager.runAfterInteractions(() => {
              setUser((prev) => (prev ? { ...prev, avatarUrl: profile.avatarUrl } : prev));
            });
          })
          .catch((err) => Alert.alert('Error', err.message || 'Could not upload'))
          .finally(() => {
            InteractionManager.runAfterInteractions(() => setAvatarUploading(false));
          });
        });
      },
      (msg) => Alert.alert(msg === 'Permission needed' ? 'Permission needed' : 'Error', msg === 'Permission needed' ? 'Allow photo library access to set your profile picture.' : msg || 'Could not open gallery'),
      () => {}
    );
  };

  const displayName = user?.name
    ? `${(user.name.split(' ')[0] || user.name).trim()} ${(user.name.split(' ')[1] || '').charAt(0)}`.trim()
    : 'Member';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isVerified = user && ['verified', 'approved'].includes(user.kycStatus);

  const verifiedIdentityContent = (
    <>
      <View style={styles.verifiedIconWrap}>
        <Icon name="shieldCheck" size={12} color="#FFFFFF" />
      </View>
      <Text style={styles.verifiedLabel}>Verified Identity</Text>
    </>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBg} />
      <View style={[styles.profileHeader, { width: contentWidth, alignSelf: 'center', paddingTop: profileHeaderPaddingTop }]}>
        <View style={styles.profileRow}>
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
                <Text style={styles.avatarText}>{user?.name ? user.name.slice(0, 2).toUpperCase() : 'MB'}</Text>
              )}
            </View>
            <View style={styles.verifiedBadge}>
              <Icon name="check" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.nameWrap}>
            <Text style={styles.name}>{displayName}</Text>
            {isVerified ? (
              <View style={styles.verifiedRow}>{verifiedIdentityContent}</View>
            ) : (
              <TouchableOpacity style={styles.verifiedRow} onPress={() => navigation.navigate('KYCIdType')} activeOpacity={0.7}>
                {verifiedIdentityContent}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={[styles.card, { width: contentWidth - 40, alignSelf: 'center' }]}>
        {MENU_ITEMS_BASE.filter((item) => item.id !== 'artisanal' || isAfrican).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuRow}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrap}>
              <Icon name={item.iconName} size={20} color={colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Icon name="chevronRight" size={16} color={colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.logoutBtn, { width: contentWidth - 40, alignSelf: 'center' }]} onPress={() => setShowLogoutConfirm(true)} activeOpacity={0.8}>
        <Icon name="logOut" size={18} color="#DC2626" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Modal visible={showLogoutConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Icon name="logOut" size={28} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Sign Out?</Text>
            <Text style={styles.modalMessage}>Are you sure you want to sign out of Mineral Bridge?</Text>
            <TouchableOpacity style={styles.modalLogoutBtn} onPress={handleLogout}>
              <Text style={styles.modalLogoutText}>Log Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutConfirm(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: 'rgba(239,246,255,0.6)',
    borderBottomRightRadius: 80,
  },
  profileHeader: {
    minHeight: PROFILE_HEADER_HEIGHT,
    paddingHorizontal: 24,
    paddingBottom: PROFILE_HEADER_BOTTOM,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.headerBorder,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.primary },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  nameWrap: { flex: 1 },
  name: { fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifiedIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedLabel: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  unverifiedLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: 0,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 16,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.primary },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0,
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.primary, textAlign: 'center', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalLogoutBtn: { paddingVertical: 14, borderRadius: 16, backgroundColor: '#DC2626', alignItems: 'center', marginBottom: 12, width: '100%' },
  modalLogoutText: { fontSize: 16, fontWeight: '700', color: colors.white },
  modalCancelBtn: { paddingVertical: 12, alignItems: 'center', width: '100%' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
});
