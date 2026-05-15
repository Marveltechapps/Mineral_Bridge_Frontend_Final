import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Top padding for headers whose background should extend under the status bar / notch:
 * safe-area inset + each screen’s design spacing (HEADER_TOP, etc.).
 */
export function useHeaderPaddingTop(designPaddingTop) {
  const insets = useSafeAreaInsets();
  return (insets?.top ?? 0) + (designPaddingTop ?? 0);
}
