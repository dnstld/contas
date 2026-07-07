import type { ReactNode } from 'react';
import { useState } from 'react';
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
 * Breathing room kept between the focused field and the top of the footer.
 * Sized to clear the field plus any helper row beneath it (e.g. the description
 * character counter), so both stay visible while typing.
 */
const FOCUS_GAP = 48;

/**
 * Shared layout for every text-input modal: a keyboard-aware scrolling body
 * with a sticky footer that keeps the CTA(s) above the keyboard.
 *
 * `KeyboardAwareScrollView` scrolls the focused field to `bottomOffset` above the
 * keyboard. Because the footer floats over the keyboard (a separate
 * `KeyboardStickyView`), the offset has to include the footer's height — otherwise
 * a focused field lands behind the CTA. We measure the footer and feed its overlap
 * into `bottomOffset` so the field always clears both the footer and the keyboard.
 */
export function ModalFormScaffold({
  children,
  footer,
  contentContainerStyle,
}: ModalFormScaffoldProps) {
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const [footerOverlap, setFooterOverlap] = useState(0);

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={footerOverlap + FOCUS_GAP}
      >
        {children}
      </KeyboardAwareScrollView>
      <StickyFooter onOverlapChange={setFooterOverlap}>{footer}</StickyFooter>
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
