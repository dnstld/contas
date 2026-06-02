import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text, type TextProps } from '@/components/ui/atoms/text';

export type ListCardRowSize = 'sm' | 'md';
export type ListCardRowDensity = 'compact' | 'comfortable';

/**
 * Row layout:
 *
 * ```
 * ┌─────────┬─────────────────────┬─────────────────┬───────────┐
 * │         │  title         text1│                 │           │
 * │ leading │                     │                 │  trailing │
 * │         │  subtitle      text2│                 │           │
 * └─────────┴─────────────────────┴─────────────────┴───────────┘
 * ```
 *
 * - `leading` and `trailing` are vertically centered against the middle.
 * - The middle has a left text column (title / subtitle) that flexes and
 *   a right text column (text1 / text2) that hugs content and is right-aligned.
 * - Strings in any text slot are styled with sensible defaults; pass a node
 *   (e.g. `<Badge />`, `<PriceText />`, or a custom `<Text />`) to opt out.
 *
 * String defaults:
 * - `title`, `text1`, `text2` — single line, truncated with ellipsis.
 * - `subtitle` — up to 2 lines, truncated after.
 */
export interface ListCardRowProps {
  leading?: ReactNode;

  title?: ReactNode;
  subtitle?: ReactNode;

  text1?: ReactNode;
  text2?: ReactNode;

  trailing?: ReactNode;

  onPress?: () => void;
  accessibilityLabel?: string;

  size?: ListCardRowSize;
  density?: ListCardRowDensity;

  style?: StyleProp<ViewStyle>;
}

const DENSITY_PADDING: Record<ListCardRowDensity, number> = {
  compact: 10,
  comfortable: 14,
};

const TITLE_DEFAULTS: Record<ListCardRowSize, Pick<TextProps, 'variant' | 'weight'>> = {
  sm: { variant: 'body', weight: 'medium' },
  md: { variant: 'subtitle', weight: 'semibold' },
};

const MUTED_CAPTION: Pick<TextProps, 'variant' | 'tone'> = {
  variant: 'caption',
  tone: 'textMuted',
};

function isTextValue(value: ReactNode): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function renderTextSlot(
  value: ReactNode,
  defaults: Partial<TextProps>,
  numberOfLines: number,
  textStyle?: TextProps['style'],
): ReactNode {
  if (value == null || value === false) return null;
  if (isTextValue(value)) {
    return (
      <Text {...defaults} numberOfLines={numberOfLines} style={textStyle}>
        {value}
      </Text>
    );
  }
  return value;
}

export function ListCardRow({
  leading,
  title,
  subtitle,
  text1,
  text2,
  trailing,
  onPress,
  accessibilityLabel,
  size = 'sm',
  density = 'compact',
  style,
}: ListCardRowProps) {
  const titleNode = renderTextSlot(title, TITLE_DEFAULTS[size], 1);
  const subtitleNode = renderTextSlot(subtitle, MUTED_CAPTION, 2);
  const text1Node = renderTextSlot(text1, MUTED_CAPTION, 1, styles.rightText);
  const text2Node = renderTextSlot(text2, MUTED_CAPTION, 1, styles.rightText);

  const hasTopLine = titleNode != null || text1Node != null;
  const hasBottomLine = subtitleNode != null || text2Node != null;
  const hasMiddle = hasTopLine || hasBottomLine;

  const content = (
    <View style={[styles.row, { paddingVertical: DENSITY_PADDING[density] }, style]}>
      {leading != null ? <View style={styles.sideSlot}>{leading}</View> : null}

      {hasMiddle ? (
        <View style={styles.middle}>
          {hasTopLine ? (
            <View style={styles.line}>
              <View style={styles.leftCell}>{titleNode}</View>
              {text1Node != null ? <View style={styles.rightCell}>{text1Node}</View> : null}
            </View>
          ) : null}
          {hasBottomLine ? (
            <View style={styles.line}>
              <View style={styles.leftCell}>{subtitleNode}</View>
              {text2Node != null ? <View style={styles.rightCell}>{text2Node}</View> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {trailing != null ? <View style={styles.sideSlot}>{trailing}</View> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  sideSlot: {
    flexShrink: 0,
  },
  middle: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leftCell: {
    flex: 1,
    minWidth: 0,
  },
  rightCell: {
    flexShrink: 0,
  },
  rightText: {
    textAlign: 'right',
  },
});
