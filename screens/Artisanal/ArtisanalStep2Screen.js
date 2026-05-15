import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function ArtisanalStep2Screen({ route, navigation }) {
  const { minerType } = route.params || {};
  const [district, setDistrict] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [gps, setGps] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 2: Site Location</Text>
      <Text style={styles.subtitle}>Step 2: Add your mining location to complete your trusted miner profile.</Text>
      <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="District" />
      <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="Region" />
      <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="Country" />
      <TextInput style={styles.input} value={gps} onChangeText={setGps} placeholder="GPS (optional)" />
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ArtisanalStep3', { minerType, district, region, country, gps: gps || null })}
      >
        <Text style={styles.buttonText}>Save & Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 24, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2A44', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  button: { marginTop: 24, backgroundColor: '#1F2A44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
