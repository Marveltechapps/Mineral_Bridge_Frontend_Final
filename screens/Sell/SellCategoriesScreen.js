import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getApiBase } from '../../lib/api';
import { sortMineralCategories } from '../../lib/services';
import { shouldSkipFocusRefetchForMediaPicker } from '../../lib/stablePicker';

const API_BASE = getApiBase();

const FALLBACK_CATEGORIES = ['Precious metals', 'Gemstone', 'Industrial mineral', 'Critical mineral', 'Energy mineral', 'Other'];

function fetchCategories() {
  return fetch(`${API_BASE}/api/minerals?forSell=1`)
    .then((res) => (res.ok ? res.json() : []))
    .then((list) => {
      const catSet = [...new Set((list || []).map((m) => m.category || 'Other').filter(Boolean))];
      const catsOrdered = sortMineralCategories(catSet);
      return catsOrdered.length ? catsOrdered : FALLBACK_CATEGORIES;
    })
    .catch(() => FALLBACK_CATEGORIES);
}

export default function SellCategoriesScreen({ navigation, route }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fromArtisanal = route?.params?.fromArtisanal === true;

  useFocusEffect(
    useCallback(() => {
      if (shouldSkipFocusRefetchForMediaPicker()) return undefined;
      setLoading(true);
      fetchCategories()
        .then(setCategories)
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
      return undefined;
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories()
      .then(setCategories)
      .finally(() => setRefreshing(false));
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
      <Text style={styles.title}>Choose category</Text>
      <FlatList
        data={categories}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('SellMineralList', { category: item, fromArtisanal })}
          >
            <Text style={styles.cardText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2A44', margin: 24, marginBottom: 8 },
  list: { padding: 24, paddingBottom: 48 },
  card: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardText: { fontSize: 16, fontWeight: '600', color: '#1F2A44' },
});
