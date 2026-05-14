import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/atoms/button';
import { Icon, type IconName } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'chart.bar.fill',
  title,
  body,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const muted = useThemeColor({}, 'textMuted');

  return (
    <View style={styles.container}>
      <Icon name={icon} size={36} color={muted} />
      <View style={styles.text}>
        <Text variant="subtitle" weight="semibold">{title}</Text>
        {body ? (
          <Text variant="body" tone="textMuted" style={styles.body}>{body}</Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" size="small" onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 12,
  },
  text: {
    alignItems: 'center',
    gap: 4,
  },
  body: {
    textAlign: 'center',
  },
});
