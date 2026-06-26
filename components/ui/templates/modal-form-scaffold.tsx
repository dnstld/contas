import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { StickyFooter } from '@/components/ui/molecules/sticky-footer';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface ModalFormScaffoldProps {
  /** Form fields rendered inside the scrollable, keyboard-aware body. */
  children: ReactNode;
  /** CTA node pinned in a footer that sticks above the keyboard. */
  footer: ReactNode;
  /** Override the default body content padding. */
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Shared layout for every text-input modal: a keyboard-aware scrolling body
 * with a sticky footer that keeps the CTA(s) above the keyboard.
 *
 * `KeyboardAwareScrollView` scrolls the focused field into view, so screens no
 * longer need the manual `useHeaderHeight()` / `keyboardVerticalOffset` dance
 * the old `KeyboardAvoidingView` required.
 */
export function ModalFormScaffold({
  children,
  footer,
  contentContainerStyle,
}: ModalFormScaffoldProps) {
  const backgroundColor = useThemeColor({}, 'modalBackground');

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
      >
        {children}
      </KeyboardAwareScrollView>
      <StickyFooter>{footer}</StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 20,
  },
});
