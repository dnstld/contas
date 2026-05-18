import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { withAlpha } from '@/utils/color';

export type BadgeTone = 'neutral' | 'positive' | 'negative' | 'tint';

const TONE_TO_BG: Record<BadgeTone, keyof typeof Colors.light> = {
  neutral: 'surfaceMuted',
  positive: 'positive',
  negative: 'negative',
  tint: 'tint',
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  variant?: 'solid' | 'soft';
}

export function Badge({ label, tone = 'neutral', variant = 'soft' }: BadgeProps) {
  const baseColor = useThemeColor({}, TONE_TO_BG[tone]);
  const textOnSolid = useThemeColor({}, 'background');
  const textOnNeutral = useThemeColor({}, 'text');

  const isSoft = variant === 'soft';
  const bg = isSoft ? withAlpha(baseColor, 0.18) : baseColor;
  const fg = isSoft
    ? tone === 'neutral'
      ? textOnNeutral
      : baseColor
    : tone === 'neutral'
      ? textOnNeutral
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
