// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type SFSymbolName = Extract<SymbolViewProps['name'], string>;
type IconMapping = Partial<Record<SFSymbolName, ComponentProps<typeof MaterialIcons>['name']>>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.down': 'expand-more',
  'chevron.up': 'expand-less',
  sparkles: 'auto-awesome',
  'arrow.up': 'arrow-upward',
  'arrow.down': 'arrow-downward',
  'arrow.up.right': 'north-east',
  'arrow.down.right': 'south-east',
  checkmark: 'check',
  'checkmark.circle.fill': 'check-circle',
  xmark: 'close',
  'line.3.horizontal.decrease.circle': 'tune',
  'chart.bar.fill': 'bar-chart',
  'chart.line.uptrend.xyaxis': 'show-chart',
  'chart.pie.fill': 'pie-chart',
  'dollarsign.circle.fill': 'attach-money',
  'creditcard.fill': 'credit-card',
  'tag.fill': 'sell',
  'cart.fill': 'shopping-cart',
  'fork.knife': 'restaurant',
  'car.fill': 'directions-car',
  gear: 'settings',
  'bell.fill': 'notifications',
  magnifyingglass: 'search',
  plus: 'add',
  minus: 'remove',
  envelope: 'mail',
  'lock.fill': 'lock',
  ellipsis: 'more-horiz',
  eye: 'visibility',
  'eye.slash': 'visibility-off',
  'exclamationmark.triangle.fill': 'warning',
  'arrow.clockwise': 'refresh',
  'hand.tap': 'touch-app',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
