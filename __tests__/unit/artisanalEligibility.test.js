const { isAfricanEligible, hasCompletedArtisanalOnboarding } = require('../../lib/artisanalEligibility');

describe('isAfricanEligible', () => {
  it('always allows access regardless of dial code', () => {
    expect(isAfricanEligible('+91', '+91|9876543210').canAccess).toBe(true);
    expect(isAfricanEligible('+233', '+233|201234567').canAccess).toBe(true);
    expect(isAfricanEligible('+1', null).canAccess).toBe(true);
  });

  it('returns African country label when dial matches', () => {
    expect(isAfricanEligible('+233', null).country).toBe('Ghana');
    expect(isAfricanEligible('+91', null).country).toBe('—');
  });
});

describe('hasCompletedArtisanalOnboarding', () => {
  it('returns false when profile is missing', () => {
    expect(hasCompletedArtisanalOnboarding(null)).toBe(false);
    expect(hasCompletedArtisanalOnboarding(undefined)).toBe(false);
  });

  it('returns true when status is submitted', () => {
    expect(hasCompletedArtisanalOnboarding({ status: 'submitted' })).toBe(true);
  });

  it('returns true when core mineral/miner fields exist', () => {
    expect(hasCompletedArtisanalOnboarding({ mineralType: 'Gold' })).toBe(true);
    expect(hasCompletedArtisanalOnboarding({ minerType: 'individual' })).toBe(true);
  });
});
