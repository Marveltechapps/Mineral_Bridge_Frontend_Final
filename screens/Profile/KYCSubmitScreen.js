import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { fetchWithAuth } from '../../lib/api';

export default function KYCSubmitScreen({ navigation, route }) {
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const idType = route?.params?.idType;
      const res = await fetchWithAuth('/api/kyc/submit', {
        method: 'POST',
        body: JSON.stringify(idType ? { idType } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      Alert.alert('Submitted', 'Verification submitted. Your account is now in secure review.', [
        { text: 'OK', onPress: () => navigation.navigate('ProfileHome') },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 3 of 3: Review and Submit</Text>
      <Text style={styles.subtitle}>Final step: submit your KYC to complete trusted account verification.</Text>
      <TouchableOpacity style={styles.button} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Complete Verification</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 24, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2A44', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  button: { marginTop: 24, backgroundColor: '#1F2A44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
