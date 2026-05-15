/**
 * Mineral Bridge icons – Figma/spec: Pickaxe, Briefcase, ShoppingBag, TrendingUp, ShieldCheck.
 * Uses Ionicons from @expo/vector-icons (Expo) for consistency.
 */
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

const sizeDefault = 24;
const colorDefault = '#1F2A44';

export const IconNames = {
  check: 'checkmark',
  checkCircle: 'checkmark-circle',
  chevronDown: 'chevron-down',
  chevronRight: 'chevron-forward',
  chevronLeft: 'chevron-back',
  home: 'home-outline',             // Tab: Home
  pickaxe: 'hammer-outline',        // Mining / Pickaxe (tab + dashboard)
  briefcase: 'briefcase-outline',   // Sell (tab)
  cart: 'cart-outline',             // Buy (tab)
  menu: 'menu',                     // Tab: More (hamburger)
  trendingUp: 'trending-up',        // Market / Insights
  star: 'star',
  shieldCheck: 'shield-checkmark',   // Verified / KYC
  person: 'person-outline',
  people: 'people-outline',
  mail: 'mail-outline',
  camera: 'camera-outline',
  location: 'location-outline',
  card: 'card-outline',
  idCard: 'id-card-outline',
  passport: 'passport-outline',
  airplane: 'airplane-outline',   // Figma: Global Passport card
  lock: 'lock-closed-outline',
  settings: 'settings-outline',
  help: 'help-circle-outline',
  notifications: 'notifications-outline',
  globe: 'globe-outline',
  logOut: 'log-out-outline',
  close: 'close',
  search: 'search',
  mic: 'mic-outline',
  codeOutline: 'code-outline',
  lightning: 'flash',
  wallet: 'wallet-outline',
  truck: 'car-outline',
  vault: 'lock-closed-outline',
  building: 'business-outline',
  document: 'document-text-outline',
  download: 'download-outline',
  phone: 'call-outline',
  info: 'information-circle-outline',
  warning: 'warning',
  flask: 'flask-outline',
  upload: 'cloud-upload-outline',
  scale: 'scale-outline',
  add: 'add',
  calendar: 'calendar-outline',
  water: 'water-outline',
  cube: 'cube-outline',
  mountain: 'terrain-outline',
  construct: 'construct-outline',   // Semi-mech / tools
  cog: 'settings-outline',          // Mechanized
  apps: 'apps-outline',             // Crusher / grid
  waterDrop: 'water-outline',       // Washing plant
  closeCircle: 'close-circle-outline', // None
  archive: 'archive-outline',       // Storage
  play: 'play-circle-outline',      // Training / video play
  trash: 'trash-outline',
  openOutline: 'open-outline',
  time: 'time-outline',
  create: 'create-outline',
  receipt: 'receipt-outline',
  chatbubbles: 'chatbubbles-outline',
  chatbubble: 'chatbubble-outline',
  send: 'send-outline',
  shield: 'shield-outline',
  moon: 'moon-outline',
};

/**
 * Renders an icon. Usage: <Icon name="pickaxe" size={24} color="#1F2A44" />
 */
export function Icon({ name, size = sizeDefault, color = colorDefault, style }) {
  const ionName = typeof name === 'string' ? (IconNames[name] || name) : 'help-circle-outline';
  return <Ionicons name={ionName} size={size} color={color} style={style} />;
}

export default Icon;
