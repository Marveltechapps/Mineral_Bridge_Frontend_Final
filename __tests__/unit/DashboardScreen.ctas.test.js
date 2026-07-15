import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('../../lib/services', () => ({
  getMe: jest.fn(() => Promise.resolve({ name: 'Alice' })),
  getMarketInsights: jest.fn(() => Promise.resolve([])),
  getBanners: jest.fn(() => Promise.resolve([])),
  getUnreadNotificationCount: jest.fn(() => Promise.resolve(0)),
  getArtisanalCanAccess: jest.fn(() => Promise.resolve({ canAccess: true, isEligible: true, country: null })),
  getArtisanalProfile: jest.fn(() => Promise.resolve(null)),
  getBannerImageLayout: jest.fn(() => ({ uri: null, contentFit: 'cover' })),
}));

jest.mock('../../navigation/navigationRef', () => ({
  navigationRef: {
    isReady: jest.fn(() => false),
    navigate: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(() => {}),
}));

jest.mock('../../lib/ArtisanalAccessContext', () => ({
  useArtisanalCanAccess: () => ({ canAccess: true, isEligible: true, isAfrican: false }),
}));

jest.mock('../../lib/headerInsets', () => ({
  useHeaderPaddingTop: (n) => n || 0,
}));

jest.mock('../../lib/icons', () => ({
  Icon: () => null,
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

const DashboardScreen = require('../../screens/Home/DashboardScreen').default;

describe('DashboardScreen StoryBrand microcopy', () => {
  it('renders Buy, Sell, and Artisanal CTAs after loading', async () => {
    const navigation = {
      navigate: jest.fn(),
      getParent: () => ({ navigate: jest.fn() }),
    };

    const { getByText } = render(<DashboardScreen navigation={navigation} />);

    await waitFor(() => {
      expect(getByText('Buy Minerals')).toBeTruthy();
      expect(getByText('Sell Minerals')).toBeTruthy();
      expect(getByText('For Artisanal Miners')).toBeTruthy();
    });
  });
});
