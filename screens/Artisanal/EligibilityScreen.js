import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getApiBase } from '../../lib/api';

const API_BASE = getApiBase();

export default function EligibilityScreen({ navigation }) {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/artisanal/eligibility`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setCountries(data.countries || ['Ghana', 'Tanzania', 'DRC', 'Zambia', 'Other']))
      .catch(() => setCountries(['Ghana', 'Tanzania', 'DRC', 'Zambia', 'Other']))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F2A44" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Artisanal mining program</Text>
      <Text style={styles.subtitle}>Without verified eligibility, miners face low trust and poor pricing.</Text>
      <Text style={styles.regionList}>{countries.join(', ')}</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ArtisanalStep1')}>
        <Text style={styles.buttonText}>Start Mining Verification Flow</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 48, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2A44', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  regionList: { fontSize: 13, color: '#64748b', marginBottom: 24 },
  button: { backgroundColor: '#1F2A44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
