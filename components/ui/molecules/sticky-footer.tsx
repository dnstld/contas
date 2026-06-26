import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface StickyFooterProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Footer that pins the modal CTA(s) directly above the keyboard and rides
 * up/down in sync with it (via `KeyboardStickyView`), so the buttons stay
 * tappable without dismissing the keyboard first.
 *
 * Owns the footer chrome (top hairline border, padding) and the bottom
 * safe-area inset that every modal previously duplicated. When the keyboard
 * opens we drop the home-indicator gap (`offset.opened`) so the footer hugs
 * the keyboard.
 */
export function StickyFooter({ children, style }: StickyFooterProps) {
  const bottomInset = useModalBottomPadding();
  const { border: borderColor } = useModalChrome();
  const backgroundColor = useThemeColor({}, 'modalBackground');

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: bottomInset }}>
      <View
        style={[
          styles.footer,
          { borderTopColor: borderColor, backgroundColor, paddingBottom: bottomInset },
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
