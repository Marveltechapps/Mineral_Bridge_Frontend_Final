import { View, Text, StyleSheet } from 'react-native';

export default function PlaceholderSettingsScreen({ route }) {
  const name = route?.params?.name || route?.name || 'Settings';
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.subtitle}>Coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2A44', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b' },
});
