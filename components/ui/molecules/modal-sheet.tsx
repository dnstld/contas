import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export interface ModalSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  /** `'fade'` for dialog-style modals; `'slide'` for bottom-sheet drawers. */
  animationType?: 'fade' | 'slide';
  /** Cap the sheet height (defaults to `'80%'` for slide sheets, unbounded otherwise). */
  maxHeight?: number | string;
  /** Disable the backdrop press-to-dismiss interaction. */
  dismissOnBackdropPress?: boolean;
  children: ReactNode;
}

/**
 * Bottom-anchored modal sheet shared by every domain modal (wallets, redeem
 * code, edit display name, create category, …). Owns the keyboard-avoiding
 * wrapper, dimmed backdrop, sheet container, themed background + border, and
 * standard radius/padding. Domain modals supply only their own contents and
 * close handler.
 */
export function ModalSheet({
  visible,
  onRequestClose,
  animationType = 'slide',
  maxHeight,
  dismissOnBackdropPress = true,
  children,
}: ModalSheetProps) {
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const borderColor = useThemeColor({}, 'border');
  const overlayColor = useThemeColor({}, 'overlay');

  const sheetStyle = [
    styles.sheet,
    { backgroundColor, borderColor },
    maxHeight !== undefined ? { maxHeight: maxHeight as number } : null,
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: overlayColor }]}
          onPress={dismissOnBackdropPress ? onRequestClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={sheetStyle}>{children}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 24,
    paddingBottom: 36,
  },
});
