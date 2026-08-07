import { StyleSheet, View } from 'react-native';

import { type IconName } from '@/components/ui/atoms/icon';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface ModalPrimaryAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading icon shown inside the primary button. */
  iconName?: IconName;
}

export type ModalSecondaryTone = 'destructive' | 'muted';

export interface ModalSecondaryAction {
  label: string;
  onPress: () => void;
  tone?: ModalSecondaryTone; // default 'muted'
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading icon shown inside the secondary button. */
  iconName?: IconName;
}

export interface ModalActionsProps {
  primary: ModalPrimaryAction;
  /** Rendered as an inline row of outlined buttons ABOVE the primary button. */
  secondary?: ModalSecondaryAction[];
  /** Optional caption shown above the actions (e.g. a delete warning), in the danger color. */
  warning?: string | null;
}

/**
 * The single place every modal lays out its bottom actions. Passed to
 * `ModalFormScaffold`'s `footer`. Every action — primary and secondary — is a
 * `PressableButton`, so loading/disabled/pressed states are identical across
 * them. The (up to two) secondary actions sit inline in a row above the
 * full-width primary.
 */
export function ModalActions({ primary, secondary, warning }: ModalActionsProps) {
  const dangerColor = useThemeColor({}, 'negative');
  const hasSecondary = !!secondary && secondary.length > 0;

  return (
    <View style={styles.container}>
      {warning ? (
        <Text variant="caption" style={[styles.warning, { color: dangerColor }]}>
          {warning}
        </Text>
      ) : null}

      {hasSecondary ? (
        <View style={styles.secondaryRow}>
          {secondary.map((action) => (
            <PressableButton
              key={action.label}
              label={action.label}
              variant={action.tone === 'destructive' ? 'destructive' : 'secondary'}
              size="large"
              iconName={action.iconName}
              loading={action.loading}
              disabled={action.disabled}
              onPress={action.onPress}
              style={styles.secondaryButton}
            />
          ))}
        </View>
      ) : null}

      <PressableButton
        label={primary.label}
        variant="primary"
        size="large"
        iconName={primary.iconName}
        loading={primary.loading}
        disabled={primary.disabled}
        onPress={primary.onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  warning: {
    textAlign: 'center',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
  },
});
