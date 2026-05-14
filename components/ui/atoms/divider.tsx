import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  inset?: number;
  style?: StyleProp<ViewStyle>;
}

export function Divider({ orientation = 'horizontal', inset = 0, style }: DividerProps) {
  const color = useThemeColor({}, 'border');
  const isHorizontal = orientation === 'horizontal';

  return (
    <View
      style={[
        {
          backgroundColor: color,
          ...(isHorizontal
            ? { height: 1, marginHorizontal: inset, alignSelf: 'stretch' }
            : { width: 1, marginVertical: inset, alignSelf: 'stretch' }),
        },
        style,
      ]}
    />
  );
}
