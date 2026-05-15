import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { fetchWithAuth } from '../../lib/api';

export default function SellerDashboardScreen() {
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/listings?mine=1').then((r) => (r.ok ? r.json() : [])),
      fetchWithAuth('/api/orders?type=sell').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([list, ords]) => {
        setListings(Array.isArray(list) ? list : []);
        setOrders(Array.isArray(ords) ? ords : []);
      })
      .catch(() => { setListings([]); setOrders([]); })
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Sales</Text>
      <Text style={styles.summaryLine}>You are selling in a verified global marketplace.</Text>
      <Text style={styles.sectionTitle}>Listings</Text>
      {listings.length === 0 ? (
        <Text style={styles.empty}>No verified listings yet. Add one to start secure selling.</Text>
      ) : (
        listings.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>Mineral ID: {item.mineralId}</Text>
            <Text style={styles.cardLine}>{item.quantity} {item.unit} · {item.status}</Text>
          </View>
        ))
      )}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Sell orders</Text>
      {orders.length === 0 ? (
        <Text style={styles.empty}>No verified sell orders yet. Complete a listing to trigger orders.</Text>
      ) : (
        orders.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.mineralName || item.mineralId}</Text>
            <Text style={styles.cardLine}>Qty: {item.quantity} · {item.status}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 24, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2A44', marginBottom: 16 },
  summaryLine: { fontSize: 14, color: '#475569', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#64748b', marginBottom: 12 },
  content: { paddingBottom: 48 },
  card: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1F2A44' },
  cardLine: { fontSize: 14, color: '#64748b', marginTop: 4 },
  empty: { fontSize: 14, color: '#64748b', marginBottom: 8 },
});
