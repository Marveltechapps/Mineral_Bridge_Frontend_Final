import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ArtisanalScreen from '../screens/Artisanal/ArtisanalScreen';
import EligibilityScreen from '../screens/Artisanal/EligibilityScreen';
import ArtisanalLocationScreen from '../screens/Artisanal/ArtisanalLocationScreen';
import ArtisanalStep1Screen from '../screens/Artisanal/ArtisanalStep1Screen';
import ArtisanalStep2Screen from '../screens/Artisanal/ArtisanalStep2Screen';
import ArtisanalStep3Screen from '../screens/Artisanal/ArtisanalStep3Screen';
import ArtisanalStep4Screen from '../screens/Artisanal/ArtisanalStep4Screen';
import ArtisanalStep5Screen from '../screens/Artisanal/ArtisanalStep5Screen';
import ArtisanalStep6Screen from '../screens/Artisanal/ArtisanalStep6Screen';
import ArtisanalStep7Screen from '../screens/Artisanal/ArtisanalStep7Screen';

const Stack = createNativeStackNavigator();

export default function ArtisanalStack() {
  return (
    <Stack.Navigator initialRouteName="ArtisanalHome" screenOptions={{ headerShown: true, title: 'Mining' }}>
      <Stack.Screen name="ArtisanalHome" component={ArtisanalScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Eligibility" component={EligibilityScreen} options={{ title: 'Eligibility' }} />
      <Stack.Screen name="ArtisanalLocationDetails" component={ArtisanalLocationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ArtisanalStep1" component={ArtisanalStep1Screen} options={{ headerShown: false }} />
      <Stack.Screen name="ArtisanalStep2" component={ArtisanalStep2Screen} options={{ title: 'Step 2' }} />
      <Stack.Screen name="ArtisanalStep3" component={ArtisanalStep3Screen} options={{ headerShown: false }} />
      <Stack.Screen name="ArtisanalStep4" component={ArtisanalStep4Screen} options={{ headerShown: false }} />
      <Stack.Screen name="ArtisanalStep5" component={ArtisanalStep5Screen} options={{ headerShown: false }} />
      <Stack.Screen name="ArtisanalStep6" component={ArtisanalStep6Screen} options={{ headerShown: false }} />
      <Stack.Screen name="ArtisanalStep7" component={ArtisanalStep7Screen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
