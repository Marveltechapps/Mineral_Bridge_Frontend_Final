import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
  Alert,
  Platform,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickCameraStable, pickDocumentStable, checkPendingImageResult } from '../../lib/stablePicker';
import { Icon } from '../../lib/icons';
import { colors } from '../../lib/theme';
import { fetchWithAuth } from '../../lib/api';
import { navigationRef } from '../../navigation/navigationRef';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HEADER_EXTRA_TOP = Math.round(WINDOW_HEIGHT * 0.06);
const DROPDOWN_BLUE = '#51A2FF';
const HEADER_BG = '#EFF6FF';
const EMERGENCY_EVIDENCE_PICKED_KEY = 'emergency_evidence_uris';

// Incident category options (from Figma design)
const INCIDENT_CATEGORY_OPTIONS = [
  'Safety Breach',
  'Medical Emergency',
  'Environmental Spill',
  'Unauthorized Site Access',
];

function IncidentCategoryDropdown({ value, options, open, onToggle, onSelect }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>INCIDENT CATEGORY</Text>
      <Pressable
        style={({ pressed }) => [styles.dropdown, pressed && styles.dropdownPressed]}
        onPress={onToggle}
      >
        {({ pressed }) => (
          <>
            <Text style={[styles.dropdownText, { flex: 1 }]} numberOfLines={1}>
              {value}
            </Text>
            <Icon name="chevronDown" size={18} color={pressed ? DROPDOWN_BLUE : '#64748B'} />
          </>
        )}
      </Pressable>
      {open && (
        <View style={styles.dropdownList}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.dropdownOption, opt === value && styles.dropdownOptionSelected]}
              onPress={() => onSelect(opt)}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  opt === value && styles.dropdownOptionTextSelected,
                ]}
                numberOfLines={1}
              >
                {opt}
              </Text>
              {opt === value && <Icon name="check" size={18} color="#1F2A44" />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function EmergencyResponseScreen({ navigation }) {
  const [incidentCategory, setIncidentCategory] = useState(INCIDENT_CATEGORY_OPTIONS[0]);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [detailedReport, setDetailedReport] = useState('');
  const [evidenceUris, setEvidenceUris] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [pickingGallery, setPickingGallery] = useState(false);
  const [pickingDocument, setPickingDocument] = useState(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Android: recover camera/gallery pick result if activity was recreated
  useEffect(() => {
    checkPendingImageResult(
      (stableUri) => {
        if (isMounted.current) setEvidenceUris((prev) => [...prev, { uri: stableUri, type: 'image' }]);
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(EMERGENCY_EVIDENCE_PICKED_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length > 0) setEvidenceUris(arr);
        } catch (_) {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const onBack = () => navigation.goBack();
  const onClose = () => navigation.goBack();
  const onGoToHome = () => {
    if (navigationRef.isReady()) navigationRef.navigate('Main', { screen: 'Home' });
  };

  const onTakePhoto = () => {
    if (pickingPhoto || pickingGallery || pickingDocument) return;
    setPickingPhoto(true);
    pickCameraStable(
      { quality: 0.8 },
      (stableUri) => {
        if (!isMounted.current) { setPickingPhoto(false); return; }
        if (stableUri) {
          InteractionManager.runAfterInteractions(() => {
            if (!isMounted.current) { setPickingPhoto(false); return; }
            setEvidenceUris((prev) => {
              const next = [...prev, { uri: stableUri, type: 'image' }];
              AsyncStorage.setItem(EMERGENCY_EVIDENCE_PICKED_KEY, JSON.stringify(next)).catch(() => {});
              return next;
            });
            setPickingPhoto(false);
          });
        } else {
          setPickingPhoto(false);
        }
      },
      (msg) => {
        if (!isMounted.current) { setPickingPhoto(false); return; }
        if (msg) {
          Alert.alert(
            msg === 'Permission needed' ? 'Permission needed' : 'Error',
            msg === 'Permission needed' ? 'Please allow camera access.' : msg || 'Could not open camera'
          );
        }
        setPickingPhoto(false);
      },
      () => {
        if (isMounted.current) setPickingPhoto(false);
      }
    );
  };

  const onChooseGallery = () => {
    if (pickingPhoto || pickingGallery || pickingDocument) return;
    setPickingGallery(true);
    pickDocumentStable(
      { type: ['image/*'], multiple: true },
      (files) => {
        if (!isMounted.current) { setPickingGallery(false); return; }
        const arr = Array.isArray(files) ? files : [files];
        const valid = arr.filter((f) => f && f.uri);
        if (valid.length) {
          InteractionManager.runAfterInteractions(() => {
            if (!isMounted.current) { setPickingGallery(false); return; }
            setEvidenceUris((prev) => {
              const next = [...prev, ...valid.map((f) => ({ uri: f.uri, type: 'image' }))];
              AsyncStorage.setItem(EMERGENCY_EVIDENCE_PICKED_KEY, JSON.stringify(next)).catch(() => {});
              return next;
            });
            setPickingGallery(false);
          });
        } else {
          setPickingGallery(false);
        }
      },
      (msg) => {
        if (!isMounted.current) { setPickingGallery(false); return; }
        if (msg) Alert.alert('Error', msg || 'Could not open gallery');
        setPickingGallery(false);
      },
      () => {
        if (isMounted.current) setPickingGallery(false);
      }
    );
  };

  const onChooseDocument = () => {
    if (pickingPhoto || pickingGallery || pickingDocument) return;
    setPickingDocument(true);
    pickDocumentStable(
      { type: ['image/*', 'application/pdf', '*/*'], multiple: false },
      (file) => {
        if (!isMounted.current) { setPickingDocument(false); return; }
        if (file && file.uri) {
          InteractionManager.runAfterInteractions(() => {
            if (!isMounted.current) { setPickingDocument(false); return; }
            setEvidenceUris((prev) => {
              const next = [...prev, { uri: file.uri, type: 'document' }];
              AsyncStorage.setItem(EMERGENCY_EVIDENCE_PICKED_KEY, JSON.stringify(next)).catch(() => {});
              return next;
            });
            setPickingDocument(false);
          });
        } else {
          setPickingDocument(false);
        }
      },
      (msg) => {
        if (!isMounted.current) { setPickingDocument(false); return; }
        if (msg) Alert.alert('Error', msg || 'Could not open document picker');
        setPickingDocument(false);
      },
      () => {
        if (isMounted.current) setPickingDocument(false);
      }
    );
  };

  const openEvidencePicker = () => {
    if (Platform.OS === 'web') {
      Alert.alert('Evidence', 'Choose source:', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose from Gallery', onPress: onChooseGallery },
        { text: 'Choose Document', onPress: onChooseDocument },
      ]);
      return;
    }
    Alert.alert('Evidence Documentation', 'Choose source:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: onTakePhoto },
      { text: 'Choose from Gallery', onPress: onChooseGallery },
      { text: 'Choose Document', onPress: onChooseDocument },
    ]);
  };

  const onDispatch = async () => {
    setSubmitting(true);
    try {
      const photoUri = evidenceUris.find((e) => e.type === 'image')?.uri || null;
      const res = await fetchWithAuth('/api/artisanal/incident-reports', {
        method: 'POST',
        body: JSON.stringify({
          category: incidentCategory,
          description: detailedReport || '',
          photoUrl: photoUri,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to dispatch alert');
      }
      AsyncStorage.removeItem(EMERGENCY_EVIDENCE_PICKED_KEY).catch(() => {});
      navigation.navigate('ArtisanalDashboard', { showEmergencyAlert: true });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to dispatch emergency alert');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnHover]} onPress={onBack}>
            <Icon name="chevronLeft" size={24} color={DROPDOWN_BLUE} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <View style={[styles.headerIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="warning" size={20} color="#E7000B" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>INCIDENT LOG</Text>
              <Text style={styles.headerSubtitle}>EMERGENCY RESPONSE IN VERIFIED NETWORK</Text>
            </View>
          </View>
          <Pressable style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnHover]} onPress={onClose}>
            <Icon name="close" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <IncidentCategoryDropdown
          value={incidentCategory}
          options={INCIDENT_CATEGORY_OPTIONS}
          open={openDropdown}
          onToggle={() => setOpenDropdown((o) => !o)}
          onSelect={(opt) => {
            setIncidentCategory(opt);
            setOpenDropdown(false);
          }}
        />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>DETAILED REPORT</Text>
          <TextInput
            style={styles.detailedReportInput}
            placeholder="Describe the safety risk clearly so response teams can act faster..."
            placeholderTextColor="#94A3B8"
            value={detailedReport}
            onChangeText={setDetailedReport}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>EVIDENCE DOCUMENTATION</Text>
          <Pressable
            style={({ pressed }) => [styles.evidenceBox, pressed && styles.evidenceBoxPressed]}
            onPress={openEvidencePicker}
          >
            <Icon name="camera" size={36} color="#64748B" />
            <Text style={styles.evidenceText}>ADD INCIDENT EVIDENCE</Text>
            {evidenceUris.length > 0 && (
              <Text style={styles.evidenceCount}>{evidenceUris.length} file(s) attached</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.dispatchBtn, pressed && styles.dispatchBtnPressed, submitting && styles.dispatchBtnDisabled]}
          onPress={onDispatch}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Icon name="warning" size={20} color={colors.white} />
              <Text style={styles.dispatchBtnText}>SEND VERIFIED EMERGENCY ALERT</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.goToHomeBtn, pressed && styles.goToHomeBtnPressed]}
          onPress={onGoToHome}
        >
          <Text style={styles.goToHomeBtnText}>RETURN TO DASHBOARD</Text>
          <Icon name="home" size={20} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: HEADER_BG,
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
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  headerTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4, color: colors.primary },
  headerSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  closeBtnHover: { backgroundColor: 'rgba(81, 162, 255, 0.25)' },
  scroll: { flex: 1 },
  content: { padding: 21, paddingBottom: 100 },
  field: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownPressed: { borderColor: DROPDOWN_BLUE },
  dropdownText: { fontSize: 15, fontWeight: '700', color: '#1F2A44' },
  dropdownList: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownOptionSelected: { backgroundColor: '#EFF6FF' },
  dropdownOptionText: { fontSize: 15, color: '#1F2A44', flex: 1 },
  dropdownOptionTextSelected: { fontWeight: '600' },
  detailedReportInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1F2A44',
    minHeight: 120,
  },
  evidenceBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  evidenceBoxPressed: { backgroundColor: '#F1F5F9' },
  evidenceText: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 10, letterSpacing: 0.5 },
  evidenceCount: { fontSize: 11, color: DROPDOWN_BLUE, marginTop: 6 },
  dispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#E7000B',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 8,
  },
  dispatchBtnPressed: { opacity: 0.9 },
  dispatchBtnDisabled: { opacity: 0.7 },
  dispatchBtnText: { fontSize: 13, fontWeight: '700', color: colors.white, letterSpacing: 0.3 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EFF6FF',
    paddingVertical: 16,
    paddingHorizontal: 21,
    borderTopWidth: 1.25,
    borderTopColor: '#DBEAFE',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  goToHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  goToHomeBtnPressed: { opacity: 0.9 },
  goToHomeBtnText: { fontSize: 14, fontWeight: '700', color: colors.white, letterSpacing: 0.3 },
});
