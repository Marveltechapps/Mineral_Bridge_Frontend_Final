import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

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

const { getArtisanalProfile } = require('../../lib/services');
const { navigationRef } = require('../../navigation/navigationRef');
const DashboardScreen = require('../../screens/Home/DashboardScreen').default;

describe('DashboardScreen CTA navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getArtisanalProfile.mockResolvedValue(null);
    navigationRef.isReady.mockReturnValue(false);
  });

  it('navigates to Buy and Sell from the CTA cards for any country', async () => {
    const parentNavigate = jest.fn();
    const navigation = {
      navigate: jest.fn(),
      getParent: () => ({ navigate: parentNavigate }),
    };

    const { getByText } = render(<DashboardScreen navigation={navigation} />);

    await waitFor(() => expect(getByText('Buy Minerals')).toBeTruthy());
    fireEvent.press(getByText('Buy Minerals'));
    expect(parentNavigate).toHaveBeenCalledWith('Buy');

    await waitFor(() => expect(getByText('Sell Minerals')).toBeTruthy());
    fireEvent.press(getByText('Sell Minerals'));
    expect(parentNavigate).toHaveBeenCalledWith('Sell');
  });

  it('opens artisanal eligibility from home CTA when onboarding is not completed', async () => {
    const navigation = {
      navigate: jest.fn(),
      getParent: () => ({ navigate: jest.fn(), getParent: () => ({ navigate: jest.fn() }) }),
    };

    const { getByText } = render(<DashboardScreen navigation={navigation} />);

    await waitFor(() => expect(getByText('For Artisanal Miners')).toBeTruthy());
    fireEvent.press(getByText('Enter'));
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('RegionEligible'));
  });

  it('opens ArtisanalDashboard from home CTA when onboarding is already completed', async () => {
    getArtisanalProfile.mockResolvedValue({ status: 'submitted', mineralType: 'Gold' });
    navigationRef.isReady.mockReturnValue(true);

    const navigation = {
      navigate: jest.fn(),
      getParent: () => ({ navigate: jest.fn(), getParent: () => ({ navigate: jest.fn() }) }),
    };

    const { getByText } = render(<DashboardScreen navigation={navigation} />);

    await waitFor(() => expect(getByText('For Artisanal Miners')).toBeTruthy());
    fireEvent.press(getByText('Enter'));
    await waitFor(() => expect(navigationRef.navigate).toHaveBeenCalledWith('ArtisanalDashboard'));
    expect(navigation.navigate).not.toHaveBeenCalledWith('RegionEligible');
  });
});
