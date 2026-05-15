import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ArtisanalAccessProvider } from '../lib/ArtisanalAccessContext';
import MainTabs from './MainTabs';
import ArtisanalDashboardScreen from '../screens/Artisanal/ArtisanalDashboardScreen';
import SafetyTrainingScreen from '../screens/Artisanal/SafetyTrainingScreen';
import SafetyVideoPlayerScreen from '../screens/Artisanal/SafetyVideoPlayerScreen';
import L1SafetyModuleScreen from '../screens/Artisanal/L1SafetyModuleScreen';
import AdvancedToolHandlingModuleScreen from '../screens/AdvancedToolHandling/AdvancedToolHandlingModuleScreen';
import InstitutionalAssetsScreen from '../screens/Artisanal/InstitutionalAssetsScreen';
import FairTradeProofScreen from '../screens/Artisanal/FairTradeProofScreen';
import EmergencyResponseScreen from '../screens/Artisanal/EmergencyResponseScreen';

const Stack = createNativeStackNavigator();

export default function RootStack({ onLogout }) {
  return (
    <ArtisanalAccessProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main">
          {(props) => <MainTabs {...props} onLogout={onLogout} />}
        </Stack.Screen>
      <Stack.Screen
        name="ArtisanalDashboard"
        component={ArtisanalDashboardScreen}
        options={{
          presentation: 'fullScreenModal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SafetyTraining"
        component={SafetyTrainingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SafetyVideoPlayer"
        component={SafetyVideoPlayerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="L1SafetyModule"
        component={L1SafetyModuleScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdvancedToolHandlingModule"
        component={AdvancedToolHandlingModuleScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InstitutionalAssets"
        component={InstitutionalAssetsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FairTradeProof"
        component={FairTradeProofScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EmergencyResponse"
        component={EmergencyResponseScreen}
        options={{ headerShown: false }}
      />
      </Stack.Navigator>
    </ArtisanalAccessProvider>
  );
}
