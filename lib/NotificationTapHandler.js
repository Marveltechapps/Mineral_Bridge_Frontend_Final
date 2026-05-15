/**
 * Handles notification taps - opens the link (e.g. Google Meet, bank QR) when user taps a push notification.
 * Skipped in Expo Go (SDK 53+) - push notifications require a development build.
 */
import { useEffect } from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';

function isUrl(str) {
  if (!str || typeof str !== 'string') return false;
  const t = str.trim();
  return /^https?:\/\//i.test(t);
}

function getLinkFromData(data) {
  if (!data || typeof data !== 'object') return null;
  if (isUrl(data.link)) return data.link;
  if (isUrl(data.detail)) return data.detail;
  if (isUrl(data.url)) return data.url;
  return null;
}

function openLinkIfPresent(response) {
  const data = response?.notification?.request?.content?.data;
  const link = getLinkFromData(data);
  if (link) Linking.openURL(link).catch(() => {});
}

export function useNotificationTapHandler() {
  useEffect(() => {
    if (Constants.appOwnership === 'expo') return;
    let Notifications;
    try {
      Notifications = require('expo-notifications');
    } catch {
      return;
    }
    if (!Notifications || typeof Notifications !== 'object') return;
    if (Notifications.getLastNotificationResponseAsync) {
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) openLinkIfPresent(response);
      }).catch(() => {});
    }
    const addListener = Notifications.addNotificationResponseReceivedListener;
    if (typeof addListener !== 'function') return;
    const sub = addListener((response) => {
      openLinkIfPresent(response);
    });
    return () => sub.remove();
  }, []);
}
