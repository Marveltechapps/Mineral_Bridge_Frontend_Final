import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const ITEMS = [
  { key: 'Addresses', screen: 'Addresses', subtitle: 'Delivery addresses' },
  { key: 'PaymentMethods', screen: 'PaymentMethods', subtitle: 'Cards & payment' },
  { key: 'OrderHistory', screen: 'OrderHistory', subtitle: 'Your orders' },
  { key: 'TransactionHistory', screen: 'TransactionHistory', subtitle: 'Transactions' },
  { key: 'Security', screen: 'Security', subtitle: 'Password & security' },
  { key: 'AppSettings', screen: 'AppSettings', subtitle: 'Notifications, language' },
  { key: 'Help', screen: 'Help', subtitle: 'FAQ & support' },
];

export default function SettingsScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {ITEMS.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.row}
          onPress={() => navigation.navigate(item.screen)}
        >
          <Text style={styles.rowTitle}>{item.key}</Text>
          <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#1F2A44' },
  rowSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
});
