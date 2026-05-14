import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ProgressTone = 'neutral' | 'positive' | 'negative';

export interface ProgressBarProps {
  value: number;
  tone?: ProgressTone;
  height?: number;
}

const TONE_TO_COLOR: Record<ProgressTone, keyof typeof Colors.light> = {
  neutral: 'tint',
  positive: 'positive',
  negative: 'negative',
};

export function ProgressBar({ value, tone = 'neutral', height = 6 }: ProgressBarProps) {
  const trackColor = useThemeColor({}, 'surfaceMuted');
  const fillColor = useThemeColor({}, TONE_TO_COLOR[tone]);
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          backgroundColor: fillColor,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
});
