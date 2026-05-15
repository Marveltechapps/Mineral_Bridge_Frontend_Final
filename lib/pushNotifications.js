/**
 * Register for Expo Push Notifications so the user receives real-time alerts
 * when the dashboard admin records a link in "Record sent to user".
 * Skipped in Expo Go (SDK 53+) - push notifications require a development build.
 */
import Constants from 'expo-constants';
import { registerPushToken } from './services';

export async function registerForPushNotificationsAsync() {
  if (Constants.appOwnership === 'expo') return null;
  try {
    const Notifications = require('expo-notifications');
    const Device = require('expo-device');
    if (!Device.isDevice) return null;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = projectId
      ? (await Notifications.getExpoPushTokenAsync({ projectId }))?.data
      : (await Notifications.getExpoPushTokenAsync())?.data;
    if (token) {
      try {
        await registerPushToken(token);
      } catch (e) {
        // Non-fatal
      }
    }
    return token;
  } catch (e) {
    return null;
  }
}
