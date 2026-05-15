import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('../../lib/api', () => ({
  fetchWithAuth: jest.fn(),
}));

jest.mock('../../lib/services', () => ({
  getBuyContent: jest.fn(() => Promise.resolve({ paymentStep: { defaultTransport: 0, feePercent: 0.01 } })),
}));

jest.mock('../../lib/icons', () => ({
  Icon: () => null,
}));

jest.mock('@react-navigation/native', () => ({}));

const PaymentScreen = require('../../screens/Buy/PaymentScreen').default;

describe('PaymentScreen StoryBrand microcopy', () => {
  it('renders the secure payment header and CTA', async () => {
    const route = {
      params: {
        mineral: { id: 'gold-1', name: 'Gold', price: 1950 },
        quantity: 2,
        addressId: 'addr-1',
      },
    };

    const navigation = {
      goBack: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByText } = render(<PaymentScreen route={route} navigation={navigation} />);

    await waitFor(() => {
      expect(getByText('Confirm Secure Payment')).toBeTruthy();
      expect(getByText('STEP 3 OF 3')).toBeTruthy();
      expect(getByText('Escrow Protected Transaction')).toBeTruthy();
      expect(getByText('Confirm Payment in Secure Flow')).toBeTruthy();
    });
  });
});

