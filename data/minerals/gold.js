/**
 * Gold – reference mineral for the sell flow (Mineral Details → Logistics → Settlement → Sale Confirmed).
 * Each mineral has its own file; this is the canonical shape.
 */
export default {
  id: 'gold',
  name: 'Gold',
  category: 'Precious Metals',
  image: 'https://images.unsplash.com/photo-1624365169364-0640dd10e180?w=1080',
  priceDisplay: '$2,400 / oz',
  /** Options shown in Sell Intro "WHAT WE ACCEPT" and used as default in Sell Details */
  acceptedFormats: ['Raw', 'Semi-Processed', 'Processed'],
  defaultUnit: 'grams',
  /** Optional: default accepted format when entering sell flow */
  defaultAcceptedFormat: 'Raw',
};
