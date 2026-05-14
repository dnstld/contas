import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

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

function withAlpha(hex: string, alpha: number) {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
    if (hex.length === 4) {
      const r = hex[1];
      const g = hex[2];
      const b = hex[3];
      return `#${r}${r}${g}${g}${b}${b}${a}`;
    }
    return `${hex}${a}`;
  }
  return hex;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});
