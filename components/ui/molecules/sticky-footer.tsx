import type { ReactNode } from 'react';
import { useCallback } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useThemeColor } from '@/hooks/use-theme-color';

/** Gap kept between the footer and the top of the keyboard while it's open. */
const KEYBOARD_GAP = 12;

export interface StickyFooterProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Reports the footer height that overlaps the keyboard while typing (its laid-out
   * height minus how far `KeyboardStickyView` shifts it up when the keyboard opens).
   * The scaffold feeds this into the scroll
   * view's `bottomOffset` so focused fields scroll clear of the footer, not just the
   * keyboard. Fires again when the footer grows/shrinks (e.g. an error banner appears).
   */
  onOverlapChange?: (height: number) => void;
}

/**
 * Footer that pins the modal CTA(s) directly above the keyboard and rides
 * up/down in sync with it (via `KeyboardStickyView`), so the buttons stay
 * tappable without dismissing the keyboard first.
 *
 * Owns the footer chrome (top hairline border, padding) and the bottom
 * safe-area inset that every modal previously duplicated. At rest the footer
 * pads by the safe-area inset; when the keyboard opens it rides up but keeps a
 * `KEYBOARD_GAP` above the keyboard instead of hugging it.
 */
export function StickyFooter({ children, style, onOverlapChange }: StickyFooterProps) {
  const bottomInset = useModalBottomPadding();
  const { border: borderColor } = useModalChrome();
  const backgroundColor = useThemeColor({}, 'modalBackground');

  // Ensure there's always room for the keyboard gap, even with no home indicator.
  const paddingBottom = Math.max(bottomInset, KEYBOARD_GAP);
  // How far the footer shifts up when the keyboard opens: enough to consume the
  // resting padding down to a `KEYBOARD_GAP` breathing space above the keyboard.
  const openedOffset = paddingBottom - KEYBOARD_GAP;

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      // The footer rides up by `openedOffset` when the keyboard opens, so the part
      // actually covering the fields is the layout height minus that shift.
      onOverlapChange?.(Math.max(0, height - openedOffset));
    },
    [openedOffset, onOverlapChange],
  );

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: openedOffset }}>
      <View
        onLayout={handleLayout}
        style={[
          styles.footer,
          { borderTopColor: borderColor, backgroundColor, paddingBottom },
          style,
        ]}
      >
        {children}
      </View>
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
