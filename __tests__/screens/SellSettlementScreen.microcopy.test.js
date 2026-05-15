import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('../../lib/api', () => ({
  fetchWithAuth: jest.fn(),
}));

jest.mock('../../lib/icons', () => ({
  Icon: () => null,
}));

jest.mock('@react-navigation/native', () => ({}));

const SellSettlementScreen = require('../../screens/Sell/SellSettlementScreen').default;

describe('SellSettlementScreen StoryBrand microcopy', () => {
  it('renders settlement header, sample approval text, and confirm CTA', async () => {
    const route = {
      params: {
        mineral: { id: 'gold-1', name: 'Gold', priceDisplay: '$1950' },
        category: 'Precious',
        quantity: 2,
        unit: 'kg',
        type: 'raw',
        origin: 'Ghana',
        addressId: 'addr-1',
      },
    };

    const navigation = {
      goBack: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByText } = render(<SellSettlementScreen route={route} navigation={navigation} />);

    await waitFor(() => {
      expect(getByText('Confirm Secure Settlement')).toBeTruthy();
      expect(getByText('Sample Test Must Be Approved First')).toBeTruthy();
      expect(getByText('Confirm Sale')).toBeTruthy();
    });
  });
});

