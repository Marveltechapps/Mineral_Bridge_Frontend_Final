import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

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

describe('DashboardScreen CTA navigation', () => {
  it('navigates to Buy and Sell from the CTA cards', async () => {
    const parentNavigate = jest.fn();
    const navigation = {
      navigate: jest.fn(),
      getParent: () => ({ navigate: parentNavigate }),
    };

    const { getByText } = render(<DashboardScreen navigation={navigation} />);

    await waitFor(() => expect(getByText('Start Buying Verified Minerals')).toBeTruthy());
    fireEvent.press(getByText('Start Buying Verified Minerals'));
    expect(parentNavigate).toHaveBeenCalledWith('Buy');

    await waitFor(() => expect(getByText('Start Selling at Fair Price')).toBeTruthy());
    fireEvent.press(getByText('Start Selling at Fair Price'));
    expect(parentNavigate).toHaveBeenCalledWith('Sell');
  });
});

