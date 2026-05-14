import { Platform } from 'react-native';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  disabled as disabledMod,
  fixedSize,
  foregroundStyle,
  tint as tintMod,
} from '@expo/ui/swift-ui/modifiers';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  systemImage?: Parameters<typeof SwiftUI.Button>[0]['systemImage'];
  disabled?: boolean;
}

const SWIFT_STYLE: Record<ButtonVariant, Parameters<typeof buttonStyle>[0]> = {
  primary: 'glassProminent',
  secondary: 'glass',
  tertiary: 'borderless',
  destructive: 'glassProminent',
};

const SWIFT_SIZE: Record<ButtonSize, Parameters<typeof controlSize>[0]> = {
  small: 'small',
  medium: 'regular',
  large: 'large',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  systemImage,
  disabled,
}: ButtonProps) {
  const tintColor = useThemeColor({}, variant === 'destructive' ? 'negative' : 'tint');
  const labelColor = useThemeColor(
    {},
    variant === 'primary' || variant === 'destructive' ? 'background' : 'text',
  );

  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents>
        <SwiftUI.Button
          label={label}
          systemImage={systemImage}
          onPress={onPress}
          role={variant === 'destructive' ? 'destructive' : 'default'}
          modifiers={[
            buttonStyle(SWIFT_STYLE[variant]),
            controlSize(SWIFT_SIZE[size]),
            tintMod(tintColor),
            foregroundStyle(labelColor),
            disabledMod(!!disabled),
            fixedSize(),
          ]}
        />
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    const Variant =
      variant === 'primary'
        ? Compose.Button
        : variant === 'secondary'
          ? Compose.FilledTonalButton
          : variant === 'tertiary'
            ? Compose.TextButton
            : Compose.Button;
    return (
      <Compose.Host matchContents>
        <Variant onClick={onPress} enabled={!disabled}>
          {label}
        </Variant>
      </Compose.Host>
    );
  }

  return null;
}
