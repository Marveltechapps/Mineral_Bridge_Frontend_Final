require('dotenv').config();

const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL && String(process.env.EXPO_PUBLIC_API_BASE_URL).trim();
const isEasBuild = process.env.EAS_BUILD === 'true';
// EAS cloud builds do not ship your machine's .env; avoid baking a LAN IP into release APKs.
const apiUrl = fromEnv || (isEasBuild ? '' : 'http://localhost:5000');
// HTTP API (EC2) needs cleartext in release APKs; HTTPS turns it off.
const usesCleartextTraffic = !/^https:\/\//i.test(apiUrl || 'http://');

module.exports = {
  expo: {
    name: 'Mineral Bridge',
    slug: 'mineral-bridge-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    scheme: 'mineralbridge',
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
      './plugins/withAndroidCleartext.js',
      'expo-splash-screen',
      'expo-font',
      '@react-native-community/datetimepicker',
      [
        'expo-location',
        { locationWhenInUsePermission: 'Mineral Bridge uses your location for compliance and logistics.' },
      ],
      [
        'expo-image-picker',
        { photosPermission: 'Mineral Bridge needs access to your photos to set your profile picture.' },
      ],
      [
        'expo-camera',
        { cameraPermission: 'Mineral Bridge needs camera access to capture your face for identity verification.' },
      ],
    ],
    // App icon (legacy). For Android adaptive icon, see android.adaptiveIcon below.
    icon: './assets/mb_1_padded.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.mineralbridge.mobile',
      config: { usesNonExemptEncryption: false },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/mb_1_padded.png',
        backgroundColor: '#000000',
      },
      package: 'com.mineralbridge.mobile',
      usesCleartextTraffic,
    },
    extra: {
      apiUrl,
      apiTimeout: process.env.EXPO_PUBLIC_API_TIMEOUT ? Number(process.env.EXPO_PUBLIC_API_TIMEOUT) : 60000,
      googleMapsToken: process.env.EXPO_PUBLIC_GOOGLE_MAPS_TOKEN || '',
      eas: {
        projectId: 'dc9b93be-9655-42c7-be9d-6797da7db914',
      },
    },
  },
};
