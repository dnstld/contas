import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom padding for modal screens — just the device safe-area inset.
 *
 * Kept as a hook so every modal calls one shared helper; if the modal
 * presentation later picks up its own chrome or grabber that needs to be
 * accounted for, this is the single place to update.
 */
export function useModalBottomPadding(): number {
  return useSafeAreaInsets().bottom;
}
