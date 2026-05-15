import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SellScreen from '../screens/Sell/SellScreen';
import SellCategoriesScreen from '../screens/Sell/SellCategoriesScreen';
import SellMineralListScreen from '../screens/Sell/SellMineralListScreen';
import SellSubCategoryScreen from '../screens/Sell/SellSubCategoryScreen';
import SellIntroScreen from '../screens/Sell/SellIntroScreen';
import SellDetailsScreen from '../screens/Sell/SellDetailsScreen';
import SellLogisticsScreen from '../screens/Sell/SellLogisticsScreen';
import SellSuccessScreen from '../screens/Sell/SellSuccessScreen';
import SellerDashboardScreen from '../screens/Sell/SellerDashboardScreen';

const Stack = createNativeStackNavigator();

// Keep sell screens mounted when camera/gallery/doc picker opens. On Android, detached inactive
// screens remount on return and the form looks like a full reload (state reset + loading flash).
export default function SellStack({ route }) {
  const fromArtisanal = route?.params?.fromArtisanal === true;

  return (
    <Stack.Navigator detachInactiveScreens={false} screenOptions={{ headerShown: true, title: 'Sell' }}>
      <Stack.Screen
        name="SellHome"
        component={SellScreen}
        options={{ headerShown: false }}
        initialParams={{ fromArtisanal }}
      />
      <Stack.Screen
        name="SellCategories"
        component={SellCategoriesScreen}
        options={{ title: 'Category' }}
        initialParams={{ fromArtisanal }}
      />
      <Stack.Screen
        name="SellMineralList"
        component={SellMineralListScreen}
        options={{ headerShown: false }}
        initialParams={{ fromArtisanal }}
      />
      <Stack.Screen
        name="SellSubCategory"
        component={SellSubCategoryScreen}
        options={{ headerShown: false }}
        initialParams={{ fromArtisanal }}
      />
      <Stack.Screen
        name="SellIntro"
        component={SellIntroScreen}
        options={{ headerShown: false }}
        initialParams={{ fromArtisanal }}
      />
      <Stack.Screen
        name="SellDetails"
        component={SellDetailsScreen}
        options={{ headerShown: false }}
        initialParams={{ fromArtisanal }}
      />
      <Stack.Screen
        name="SellLogistics"
        component={SellLogisticsScreen}
        options={{ headerShown: false }}
        initialParams={{ fromArtisanal }}
      />
      <Stack.Screen
        name="SellSuccess"
        component={SellSuccessScreen}
        options={{ headerShown: false }}
        initialParams={{ fromArtisanal }}
      />
      <Stack.Screen
        name="SellerDashboard"
        component={SellerDashboardScreen}
        options={{ title: 'My Sales' }}
      />
    </Stack.Navigator>
  );
}
