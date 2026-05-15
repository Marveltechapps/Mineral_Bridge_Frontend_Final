import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, useWindowDimensions, Alert } from 'react-native';
import { useArtisanalCanAccess } from '../lib/ArtisanalAccessContext';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Icon } from '../lib/icons';

const PickaxeImage = require('../assets/icon-pickaxe.png');
const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const FOOTER_PADDING_V = Math.round(WINDOW_HEIGHT * 0.02); // 2% vertical padding = center margin
import HomeStack from './HomeStack';
import BuyStack from './BuyStack';
import SellStack from './SellStack';
import ProfileStack from './ProfileStack';
import ArtisanalStack from './ArtisanalStack';

const Tab = createBottomTabNavigator();

// Figma: active icon #F2C94C, active text #1F2A44; inactive #99A1AF. Icon 24–26px, label 10px Inter 700.
const ACTIVE_ICON = '#F2C94C';
const ACTIVE_TEXT = '#1F2A44';
const INACTIVE = '#99A1AF';

function TabBarIconWithLabel({ label, iconName, focused, imageSource }) {
  const iconColor = focused ? ACTIVE_ICON : INACTIVE;
  const textColor = focused ? ACTIVE_TEXT : INACTIVE;
  return (
    <View style={styles.tabButton}>
      <View style={styles.tabIconWrap}>
        {imageSource ? (
          <Image source={imageSource} style={[styles.tabImage, { tintColor: iconColor }]} resizeMode="contain" />
        ) : (
          <Icon name={iconName} size={24} color={iconColor} />
        )}
      </View>
      {label ? <Text style={[styles.tabLabel, { color: textColor }]} numberOfLines={1}>{label}</Text> : null}
    </View>
  );
}

export default function MainTabs({ onLogout }) {
  const { canAccess: artisanalCanAccess, isAfrican } = useArtisanalCanAccess();
  const { width: screenWidth } = useWindowDimensions();
  const safeMaxWidth = Math.min(screenWidth, 420);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [styles.tabBar, { width: safeMaxWidth, maxWidth: safeMaxWidth }],
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Dashboard';
          const hideTabBar = routeName === 'RegionEligible';
          return {
            tabBarStyle: hideTabBar ? { display: 'none' } : [styles.tabBar, { width: safeMaxWidth, maxWidth: safeMaxWidth }],
            tabBarIcon: ({ focused }) => (
              <TabBarIconWithLabel label="Home" iconName="home" focused={focused} />
            ),
          };
        }}
      />
      {!isAfrican && (
        <Tab.Screen
          name="Buy"
          component={BuyStack}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'BuyList';
            const hideTabBar =
              routeName === 'BuySubCategory' ||
              routeName === 'MineralDetail' ||
              routeName === 'Quantity' ||
              routeName === 'Delivery' ||
              routeName === 'Payment' ||
              routeName === 'OrderConfirmed';
            return {
              tabBarStyle: hideTabBar
                ? { display: 'none' }
                : [styles.tabBar, { width: safeMaxWidth, maxWidth: safeMaxWidth }],
              tabBarIcon: ({ focused }) => (
                <TabBarIconWithLabel label="Buy" iconName="cart" focused={focused} />
              ),
            };
          }}
        />
      )}
      <Tab.Screen
        name="Sell"
        component={SellStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'SellHome';
          const hideTabBar = routeName === 'SellIntro' || routeName === 'SellDetails' || routeName === 'SellLogistics' || routeName === 'SellSuccess' || routeName === 'SellMineralList' || routeName === 'SellSubCategory' || routeName === 'SellCategories';
          return {
            tabBarStyle: hideTabBar ? { display: 'none' } : [styles.tabBar, { width: safeMaxWidth, maxWidth: safeMaxWidth }],
            tabBarIcon: ({ focused }) => (
              <TabBarIconWithLabel label="Sell" iconName="briefcase" focused={focused} />
            ),
          };
        }}
      />
      {artisanalCanAccess && (
      <Tab.Screen
        name="Mining"
        component={ArtisanalStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Always open Mining tab to the Mining home screen; do not show artisanal step/dashboard screens
            e.preventDefault();
            navigation.navigate('Mining', { screen: 'ArtisanalHome' });
          },
        })}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ArtisanalHome';
          const hideTabBar = routeName === 'ArtisanalStep1' || routeName === 'ArtisanalLocationDetails' || routeName === 'ArtisanalStep3' || routeName === 'ArtisanalStep4' || routeName === 'ArtisanalStep5' || routeName === 'ArtisanalStep6' || routeName === 'ArtisanalStep7';
          return {
            tabBarStyle: hideTabBar ? { display: 'none' } : [styles.tabBar, { width: safeMaxWidth, maxWidth: safeMaxWidth }],
            tabBarIcon: ({ focused }) => (
              <TabBarIconWithLabel label="Mining" imageSource={PickaxeImage} focused={focused} />
            ),
          };
        }}
      />
      )}
      <Tab.Screen
        name="Profile"
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ProfileHome';
          const hideTabBar = routeName === 'HelpChat';
          return {
            tabBarStyle: hideTabBar ? { display: 'none' } : [styles.tabBar, { width: safeMaxWidth, maxWidth: safeMaxWidth }],
            tabBarIcon: ({ focused }) => (
              <TabBarIconWithLabel label="More" iconName="menu" focused={focused} />
            ),
          };
        }}
      >
        {() => <ProfileStack onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: FOOTER_PADDING_V,
    width: '100%',
    alignSelf: 'center',
    minHeight: 72,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: '#FFFFFF',
  },
  tabBarItem: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 0,
  },
  tabButton: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    minWidth: 52,
  },
  tabIconWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.15,
    includeFontPadding: false,
  },
  tabImage: { width: 24, height: 24, transform: [{ scale: 0.96 }] },
});
