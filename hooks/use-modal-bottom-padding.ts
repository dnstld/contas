import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MODAL_SNAP } from '@/constants/modal';

/**
 * Bottom padding to apply to the root of every modal screen.
 *
 * Combines the device safe-area inset with the offscreen portion of the
 * screen-transitions content layer at the settled snap detent. The content
 * layer fills the full window in layout but is translated down by
 * `(1 - MODAL_SNAP) * windowHeight` at settled — without this compensation,
 * the bottom edge of the modal renders below the visible viewport.
 */
export function useModalBottomPadding(): number {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  return insets.bottom + (1 - MODAL_SNAP) * windowHeight;
}
