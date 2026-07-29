import { StyleSheet, View } from 'react-native';

import { type IconName } from '@/components/ui/atoms/icon';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import {
  ModalActionLink,
  type ModalActionLinkTone,
} from '@/components/ui/molecules/modal-action-link';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface ModalPrimaryAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading icon shown inside the primary button. */
  iconName?: IconName;
}

export interface ModalSecondaryAction {
  label: string;
  onPress: () => void;
  tone?: ModalActionLinkTone; // default 'muted'
  loading?: boolean;
  disabled?: boolean;
}

export interface ModalActionsProps {
  primary: ModalPrimaryAction;
  /** Rendered as stacked ModalActionLinks ABOVE the primary button. */
  secondary?: ModalSecondaryAction[];
  /** Optional caption shown above the actions (e.g. a delete warning), in the danger color. */
  warning?: string | null;
}

/**
 * The single place every modal lays out its bottom actions. Passed to
 * `ModalFormScaffold`'s `footer`. Composes the existing `PressableButton`
 * (primary) and `ModalActionLink` (secondary) leaves — no bespoke button
 * styling lives here.
 */
export function ModalActions({ primary, secondary, warning }: ModalActionsProps) {
  const dangerColor = useThemeColor({}, 'negative');

  return (
    <View style={styles.container}>
      {warning ? (
        <Text variant="caption" style={[styles.warning, { color: dangerColor }]}>
          {warning}
        </Text>
      ) : null}

      {secondary?.map((action) => (
        <ModalActionLink
          key={action.label}
          label={action.label}
          tone={action.tone ?? 'muted'}
          loading={action.loading}
          disabled={action.disabled}
          onPress={action.onPress}
        />
      ))}

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
    gap: 4,
  },
  warning: {
    textAlign: 'center',
    marginBottom: 8,
  },
});
