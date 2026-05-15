/**
 * Mineral Bridge design system
 * Figma / MINERAL_BRIDGE_SPECIFICATION: Inter font, #1F2A44, #F2C94C, Lucide-style icons.
 */
export const colors = {
  primary: '#1F2A44',       // Institutional Dark Blue
  primaryHover: '#2D3B5E',
  gold: '#F2C94C',          // Gold Accent
  goldMuted: '#B48811',
  headerBg: '#EFF6FF',      // blue-50
  headerBorder: '#BFDBFE',  // blue-200
  white: '#FFFFFF',
  background: '#F8FAFC',    // gray-50
  text: '#1F2A44',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  error: '#B91C1C',
  success: '#15803D',
  /** Sell module (order confirmed, checkmarks, success states): use this green everywhere in Sell */
  successGreen: '#00A63E',
  successGreenBg: '#DCFCE7',
  splashBg: '#0F172A',
  splashSubtext: 'rgba(191, 219, 254, 0.6)',
};

/** Inter font family names (loaded via @expo-google-fonts/inter) */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
};

/** Typography scale – use with fontFamily from fonts */
export const typography = {
  title: { fontSize: 24, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  titleLarge: { fontSize: 28, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  headline: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  body: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  bodySmall: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  caption: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  captionTiny: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  label: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  button: { fontSize: 17, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  uppercase: { textTransform: 'uppercase', letterSpacing: 1 },
};
