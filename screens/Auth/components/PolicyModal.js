import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { getApiBase } from '../../../lib/api';
import { authStyles } from '../authStyles';

const PLACEHOLDER_TERMS = 'Terms of Service content will be provided by the administrator.';
const PLACEHOLDER_PRIVACY = 'Privacy Policy content will be provided by the administrator.';

export default function PolicyModal({ visible, type, onClose }) {
  const styles = authStyles;
  const isTerms = type === 'terms';
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const apiBase = getApiBase();
    fetch(`${apiBase.replace(/\/$/, '')}/api/content/legal`)
      .then((res) => res.json())
      .then((data) => {
        const text = isTerms
          ? (data.termsOfService && data.termsOfService.trim() ? data.termsOfService : PLACEHOLDER_TERMS)
          : (data.privacyPolicy && data.privacyPolicy.trim() ? data.privacyPolicy : PLACEHOLDER_PRIVACY);
        setContent(text);
      })
      .catch(() => {
        setContent(isTerms ? PLACEHOLDER_TERMS : PLACEHOLDER_PRIVACY);
      })
      .finally(() => setLoading(false));
  }, [visible, type, isTerms]);

  return (
    <Modal visible={visible} transparent={false} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isTerms ? 'Terms of Service' : 'Privacy Policy'}</Text>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <View style={styles.modalLoaderWrap}>
                <ActivityIndicator size="large" color="#1F2A44" />
              </View>
            ) : (
              <Text style={styles.modalP}>{content}</Text>
            )}
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalAccept} onPress={onClose}>
              <Text style={styles.modalAcceptText}>I Understand & Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
