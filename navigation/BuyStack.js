import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useArtisanalCanAccess } from '../lib/ArtisanalAccessContext';
import BuyScreen from '../screens/Buy/BuyScreen';
import BuyCategoryPickScreen from '../screens/Buy/BuyCategoryPickScreen';
import BuySubCategoryScreen from '../screens/Buy/BuySubCategoryScreen';
import MineralDetailScreen from '../screens/Buy/MineralDetailScreen';
import QuantityScreen from '../screens/Buy/QuantityScreen';
import DeliveryScreen from '../screens/Buy/DeliveryScreen';
import PaymentScreen from '../screens/Buy/PaymentScreen';
import OrderConfirmedScreen from '../screens/Buy/OrderConfirmedScreen';
import TrackingScreen from '../screens/Buy/TrackingScreen';
import SuccessScreen from '../screens/Buy/SuccessScreen';

const Stack = createNativeStackNavigator();

function BuyRestrictedScreen({ navigation }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Buying not available</Text>
      <Text style={styles.body}>
        Artisanal users are not allowed to buy minerals. You can sell minerals from the Sell tab.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        onPress={() => navigation.getParent()?.navigate('Sell')}
      >
        <Text style={styles.primaryBtnText}>Go to Sell</Text>
      </Pressable>
    </View>
  );
}

export default function BuyStack() {
  const { isAfrican } = useArtisanalCanAccess();

  if (isAfrican) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="BuyRestricted" component={BuyRestrictedScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: true, title: 'Buy' }}>
      <Stack.Screen name="BuyList" component={BuyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BuyCategoryPick" component={BuyCategoryPickScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BuySubCategory" component={BuySubCategoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MineralDetail" component={MineralDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Quantity" component={QuantityScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Delivery" component={DeliveryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrderConfirmed" component={OrderConfirmedScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Tracking" component={TrackingScreen} />
      <Stack.Screen name="Success" component={SuccessScreen} options={{ title: 'Order placed' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  body: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 18 },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2A44',
  },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
