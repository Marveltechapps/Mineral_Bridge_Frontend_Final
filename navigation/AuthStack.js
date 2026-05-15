import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/Auth/SplashScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';
import SignOnScreen from '../screens/Auth/SignOnScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack({ onAuthComplete, onboardingResume }) {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={onboardingResume ? 'SignOn' : 'Splash'}
    >
      <Stack.Screen
        name="Splash"
        options={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { flex: 1, backgroundColor: '#000000' },
        }}
      >
        {(props) => <SplashScreen {...props} onComplete={() => props.navigation.replace('Onboarding')} />}
      </Stack.Screen>
      <Stack.Screen name="Onboarding">
        {(props) => (
          <OnboardingScreen
            {...props}
            onComplete={() => props.navigation.replace('SignOn')}
            onSkip={() => props.navigation.replace('SignOn')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="SignOn">
        {(props) => (
          <SignOnScreen
            {...props}
            onComplete={onAuthComplete}
            onboardingResume={onboardingResume}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
