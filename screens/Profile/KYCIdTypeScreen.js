import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const TYPES = ['National ID', 'Passport', 'Driving license'];

export default function KYCIdTypeScreen({ navigation }) {
  const [selected, setSelected] = useState(null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 1 of 3: Choose ID Type</Text>
      <Text style={styles.subtitle}>We verify identity to protect every mineral transaction. Select the document you will upload.</Text>
      {TYPES.map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.option, selected === t && styles.optionSelected]}
          onPress={() => setSelected(t)}
        >
          <Text style={styles.optionText}>{t}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.button, !selected && styles.buttonDisabled]}
        disabled={!selected}
        onPress={() => navigation.navigate('KYCDocuments', { idType: selected })}
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
  option: { padding: 16, borderRadius: 12, backgroundColor: '#f8fafc', marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  optionSelected: { borderColor: '#1F2A44', backgroundColor: '#eff6ff' },
  optionText: { fontSize: 16, fontWeight: '600', color: '#1F2A44' },
  button: { marginTop: 24, backgroundColor: '#1F2A44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
