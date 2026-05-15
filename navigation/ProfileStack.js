import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import PersonalInfoScreen from '../screens/Profile/PersonalInfoScreen';
import SettingsScreen from '../screens/Profile/SettingsScreen';
import AddressesSettingsScreen from '../screens/Profile/AddressesSettingsScreen';
import OrderHistoryScreen from '../screens/Profile/OrderHistoryScreen';
import PlaceholderSettingsScreen from '../screens/Profile/PlaceholderSettingsScreen';
import PaymentMethodsScreen from '../screens/Profile/PaymentMethodsScreen';
import ArtisanalMiningProfileScreen from '../screens/Profile/ArtisanalMiningProfileScreen';
import KYCIdTypeScreen from '../screens/Profile/KYCIdTypeScreen';
import KYCStatusScreen from '../screens/Profile/KYCStatusScreen';
import NationalIdDetailScreen from '../screens/Profile/NationalIdDetailScreen';
import DocumentUploadScreen from '../screens/Profile/DocumentUploadScreen';
import OrderDetailScreen from '../screens/Profile/OrderDetailScreen';
import OrderChatScreen from '../screens/Profile/OrderChatScreen';
import ScheduleCallScreen from '../screens/Profile/ScheduleCallScreen';
import KYCDocumentsScreen from '../screens/Profile/KYCDocumentsScreen';
import KYCSubmitScreen from '../screens/Profile/KYCSubmitScreen';
import TransactionHistoryScreen from '../screens/Profile/TransactionHistoryScreen';
import TransactionDetailScreen from '../screens/Profile/TransactionDetailScreen';
import SecurityScreen from '../screens/Profile/SecurityScreen';
import AppSettingsScreen from '../screens/Profile/AppSettingsScreen';
import TermsOfServiceScreen from '../screens/Profile/TermsOfServiceScreen';
import PrivacyPolicyScreen from '../screens/Profile/PrivacyPolicyScreen';
import HelpSupportScreen from '../screens/Profile/HelpSupportScreen';
import HelpChatScreen from '../screens/Profile/HelpChatScreen';

const Stack = createNativeStackNavigator();

export default function ProfileStack({ onLogout }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true, title: 'More' }}>
      <Stack.Screen name="ProfileHome" options={{ headerShown: false }}>
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="ArtisanalProfile" component={ArtisanalMiningProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Addresses" component={AddressesSettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrderChat" component={OrderChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ScheduleCall" component={ScheduleCallScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Security" component={SecurityScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AppSettings" component={AppSettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Help" component={HelpSupportScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HelpChat" component={HelpChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="KYCStatus" component={KYCStatusScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NationalIdDetail" component={NationalIdDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} options={{ headerShown: false }} />
      <Stack.Screen name="KYCIdType" component={KYCIdTypeScreen} options={{ title: 'Verify identity' }} />
      <Stack.Screen name="KYCDocuments" component={KYCDocumentsScreen} options={{ title: 'KYC documents' }} />
      <Stack.Screen name="KYCSubmit" component={KYCSubmitScreen} options={{ title: 'Submit KYC' }} />
    </Stack.Navigator>
  );
}
