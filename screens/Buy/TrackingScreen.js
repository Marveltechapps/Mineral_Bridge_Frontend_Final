import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { fetchWithAuth } from '../../lib/api';

export default function TrackingScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) {
      setError('No order id');
      setLoading(false);
      return;
    }
    fetchWithAuth(`/api/orders/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Order not found');
        return res.json();
      })
      .then(setOrder)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F2A44" />
      </View>
    );
  }
  if (error || !order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Order not found'}</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.getParent()?.navigate('Buy')}>
          <Text style={styles.buttonText}>Back to Buy</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order tracking</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{order.mineralName || 'Order'}</Text>
        <Text style={styles.cardLine}>Quantity: {order.quantity}</Text>
        <Text style={styles.cardLine}>Status: {order.status}</Text>
        {order.timeline?.length > 0 && (
          <Text style={styles.timeline}>
            Last update: {new Date(order.timeline[order.timeline.length - 1].at).toLocaleString()}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Success', { orderId })}
      >
        <Text style={styles.buttonText}>View success</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 48, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2A44', marginBottom: 16 },
  card: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1F2A44' },
  cardLine: { fontSize: 14, color: '#64748b', marginTop: 4 },
  timeline: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  errorText: { color: '#b91c1c', marginBottom: 16 },
  button: { backgroundColor: '#1F2A44', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
