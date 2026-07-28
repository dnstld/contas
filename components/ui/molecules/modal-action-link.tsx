import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ModalActionLinkTone = 'destructive' | 'muted';

export interface ModalActionLinkProps {
  label: string;
  onPress: () => void;
  tone?: ModalActionLinkTone;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * The single, shared way every modal renders an inline action (Delete, Archive,
 * …) in the form body — full-width, centered, no border or fill, so it reads as
 * a text link rather than a competing button.
 */
export function ModalActionLink({
  label,
  onPress,
  tone = 'muted',
  disabled = false,
  loading = false,
}: ModalActionLinkProps) {
  const color = useThemeColor({}, tone === 'destructive' ? 'negative' : 'textMuted');
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [styles.link, (pressed || isDisabled) && styles.dimmed]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text variant="body" weight="medium" style={{ color }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  dimmed: {
    opacity: 0.5,
  },
});
