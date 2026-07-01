import { type AccessibilityProps, type StyleProp, type TextStyle } from 'react-native';

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
  /**
   * When provided, the icon is exposed to assistive tech as a labeled image.
   * Omit for decorative icons (the default), which are hidden from screen
   * readers so they don't add noise — icon-only touchables should carry their
   * label on the wrapping pressable, not here.
   */
  accessibilityLabel?: string;
}

export function Icon({
  name,
  size = 20,
  tone = 'icon',
  color,
  style,
  accessibilityLabel,
}: IconProps) {
  const themed = useThemeColor({}, tone);
  const a11y: AccessibilityProps = accessibilityLabel
    ? { accessible: true, accessibilityRole: 'image', accessibilityLabel }
    : {
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      };
  return <IconSymbol name={name} size={size} color={color ?? themed} style={style} {...a11y} />;
}
