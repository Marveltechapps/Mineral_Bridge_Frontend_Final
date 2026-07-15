import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

export default function BuyStack() {
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
