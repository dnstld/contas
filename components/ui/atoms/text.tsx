import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type TextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'caption' | 'mono';

export type TextTone = keyof typeof Colors.light;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  /**
   * Exposes the text as a navigable heading to VoiceOver/TalkBack. Opt-in —
   * apply to section/screen titles only, not body copy or captions. An explicit
   * `accessibilityRole` in props takes precedence.
   */
  heading?: boolean;
}

const VARIANT_STYLE = StyleSheet.create({
  display: { fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  subtitle: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21 },
  caption: { fontSize: 12, lineHeight: 16 },
  mono: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.mono },
});

const WEIGHT_MAP = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export function Text({
  variant = 'body',
  tone = 'text',
  weight = 'regular',
  heading = false,
  style,
  ...rest
}: TextProps) {
  const color = useThemeColor({}, tone);
  const fontFamily = variant === 'mono' ? Fonts.mono : Fonts.sans;
  const accessibilityRole = rest.accessibilityRole ?? (heading ? 'header' : undefined);

  return (
    <RNText
      {...rest}
      accessibilityRole={accessibilityRole}
      style={[{ color, fontFamily, fontWeight: WEIGHT_MAP[weight] }, VARIANT_STYLE[variant], style]}
    />
  );
}
