import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('../../lib/services', () => ({
  getMe: jest.fn(() => Promise.resolve({ name: 'Alice' })),
  getMarketInsights: jest.fn(() => Promise.resolve([])),
  getBanners: jest.fn(() => Promise.resolve([])),
  getUnreadNotificationCount: jest.fn(() => Promise.resolve(0)),
  getArtisanalCanAccess: jest.fn(() => Promise.resolve({ canAccess: true, country: true })),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(() => {}),
}));

jest.mock('../../lib/ArtisanalAccessContext', () => ({
  useArtisanalCanAccess: () => ({ isAfrican: true }),
}));

jest.mock('../../lib/icons', () => ({
  Icon: () => null,
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

const DashboardScreen = require('../../screens/Home/DashboardScreen').default;

describe('DashboardScreen StoryBrand microcopy', () => {
  it('renders the 2 primary CTAs after loading', async () => {
    const navigation = {
      navigate: jest.fn(),
      getParent: () => ({ navigate: jest.fn() }),
    };

    const { getByText } = render(<DashboardScreen navigation={navigation} />);

    await waitFor(() => {
      expect(getByText('Start Buying Verified Minerals')).toBeTruthy();
      expect(getByText('Start Selling at Fair Price')).toBeTruthy();
      expect(getByText('You are trading in a verified global mineral market.')).toBeTruthy();
    });
  });
});

