module.exports = {
  // Use plain RN preset to avoid Expo "winter/runtime" import-scope errors.
  // We mock expo modules (ex: `expo-image`) inside the tests we add.
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testTimeout: 20000,
};

