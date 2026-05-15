import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockFetchWithAuth = jest.fn();
const mockGetBuyContent = jest.fn(() => Promise.resolve({ paymentStep: { defaultTransport: 0, feePercent: 0.01 } }));

jest.mock('../../lib/api', () => ({
  fetchWithAuth: (...args) => mockFetchWithAuth(...args),
}));

jest.mock('../../lib/services', () => ({
  getBuyContent: (...args) => mockGetBuyContent(...args),
}));

jest.mock('../../lib/icons', () => ({
  Icon: () => null,
}));

jest.mock('@react-navigation/native', () => ({}));

const PaymentScreen = require('../../screens/Buy/PaymentScreen').default;

describe('PaymentScreen placeOrder flow', () => {
  it('submits an order and navigates to OrderConfirmed', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'order-123' }),
    });

    const route = {
      params: {
        mineral: { id: 'gold-1', name: 'Gold', price: 1950 },
        quantity: 2,
        unit: 'kg',
        addressId: 'addr-1',
        deliveryDetails: null,
      },
    };

    const navigation = {
      goBack: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByText } = render(<PaymentScreen route={route} navigation={navigation} />);

    await waitFor(() => expect(getByText('Confirm Payment in Secure Flow')).toBeTruthy());

    // Press the footer CTA
    fireEvent.press(getByText('Confirm Payment in Secure Flow'));

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalled();
      expect(navigation.navigate).toHaveBeenCalledWith('OrderConfirmed', expect.objectContaining({ orderId: 'order-123' }));
    });
  });
});

