import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/Home/DashboardScreen';
import NotificationsScreen from '../screens/Home/NotificationsScreen';
import RegionEligibleScreen from '../screens/Home/RegionEligibleScreen';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="RegionEligible" component={RegionEligibleScreen} />
    </Stack.Navigator>
  );
}
