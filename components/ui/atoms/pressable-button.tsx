import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon, type IconName } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';

export type PressableButtonVariant = 'primary' | 'secondary' | 'destructive';
export type PressableButtonSize = 'medium' | 'large';

const ICON_SLOT = 18;

export interface PressableButtonProps {
  label: string;
  onPress?: () => void;
  variant?: PressableButtonVariant;
  size?: PressableButtonSize;
  iconName?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function PressableButton({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  iconName,
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: PressableButtonProps) {
  const primaryFill = useThemeColor({}, 'tint');
  const negative = useThemeColor({}, 'negative');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const onPrimary = useThemeColor({}, 'onPrimary');

  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive';
  const labelColor = isPrimary ? onPrimary : isDestructive ? negative : muted;
  const borderColor = isPrimary ? 'transparent' : isDestructive ? negative : border;
  const backgroundColor = isPrimary ? primaryFill : 'transparent';

  const isBusy = loading;
  const isDisabled = disabled || isBusy;
  const verticalPadding = size === 'large' ? 18 : 14;
  const showIconSlot = !!iconName || isBusy;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: isBusy }}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: verticalPadding,
          backgroundColor: isPrimary
            ? primaryFill
            : pressed && !isDisabled
              ? isDestructive
                ? `${negative}14`
                : `${muted}14`
              : backgroundColor,
          borderColor,
          borderWidth: isPrimary ? 0 : StyleSheet.hairlineWidth,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !isDisabled && isPrimary ? 0.98 : 1 }],
          shadowColor: isPrimary ? primaryFill : undefined,
          shadowOpacity: isPrimary ? (pressed ? 0.18 : 0.28) : 0,
        },
        style,
      ]}
    >
      {showIconSlot ? (
        <View style={styles.iconSlot}>
          {isBusy ? (
            <ActivityIndicator size="small" color={labelColor} />
          ) : iconName ? (
            <Icon name={iconName} size={ICON_SLOT} color={labelColor} />
          ) : null}
        </View>
      ) : null}
      <Text
        variant={size === 'large' ? 'subtitle' : 'body'}
        weight={isPrimary ? 'bold' : 'semibold'}
        numberOfLines={1}
        style={[styles.label, { color: labelColor }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 0,
  },
  iconSlot: {
    width: ICON_SLOT,
    height: ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    letterSpacing: 0.3,
  },
});
