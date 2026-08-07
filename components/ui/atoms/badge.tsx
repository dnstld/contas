import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { withAlpha } from '@/utils/color';

export type BadgeTone = 'neutral' | 'positive' | 'negative' | 'tint' | 'inverse';

const TONE_TO_BG: Record<BadgeTone, keyof typeof Colors.light> = {
  neutral: 'surfaceMuted',
  positive: 'positive',
  negative: 'negative',
  tint: 'tint',
  // High-contrast neutral: a dark chip in light mode, a light chip in dark mode.
  inverse: 'text',
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  variant?: 'solid' | 'soft';
}

export function Badge({ label, tone = 'neutral', variant = 'soft' }: BadgeProps) {
  const baseColor = useThemeColor({}, TONE_TO_BG[tone]);
  const textOnSolid = useThemeColor({}, 'onPrimary');
  const textOnNeutral = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  const isSoft = variant === 'soft';
  const bg = isSoft ? withAlpha(baseColor, 0.18) : baseColor;
  const fg = isSoft
    ? tone === 'neutral'
      ? textOnNeutral
      : baseColor
    : tone === 'neutral'
      ? textOnNeutral
      : // `inverse` fills with the text color, so its label must use the page
        // background to stay legible (and flip correctly between light/dark).
        tone === 'inverse'
        ? backgroundColor
        : textOnSolid;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text variant="caption" weight="semibold" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});
