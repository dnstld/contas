import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type SurfaceVariant = 'plain' | 'muted' | 'elevated';

export interface SurfaceProps {
  variant?: SurfaceVariant;
  padding?: number;
  radius?: number;
  bordered?: boolean;
  tone?: keyof typeof Colors.light;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function Surface({
  variant = 'plain',
  padding = 16,
  radius = 14,
  bordered = false,
  tone,
  style,
  children,
}: SurfaceProps) {
  const surfaceTone =
    tone ?? (variant === 'muted' ? 'surfaceMuted' : variant === 'elevated' ? 'background' : 'surface');
  const backgroundColor = useThemeColor({}, surfaceTone);
  const borderColor = useThemeColor({}, 'border');

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor,
          padding,
          borderRadius: radius,
          ...(bordered ? { borderWidth: StyleSheet.hairlineWidth, borderColor } : null),
          ...(variant === 'elevated' ? styles.elevated : null),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  elevated: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
