import { type StyleProp, type TextStyle } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type IconName = Parameters<typeof IconSymbol>[0]['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  tone?: keyof typeof Colors.light;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function Icon({ name, size = 20, tone = 'icon', color, style }: IconProps) {
  const themed = useThemeColor({}, tone);
  return <IconSymbol name={name} size={size} color={color ?? themed} style={style} />;
}
