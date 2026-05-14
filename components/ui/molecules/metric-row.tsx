import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';

export interface MetricRowProps {
  label: string;
  value?: string | number;
  trailing?: ReactNode;
  emphasis?: 'subtle' | 'strong';
}

export function MetricRow({ label, value, trailing, emphasis = 'subtle' }: MetricRowProps) {
  return (
    <View style={styles.row}>
      <Text variant="body" tone="textMuted">{label}</Text>
      <View style={styles.right}>
        {value !== undefined ? (
          <Text
            variant="body"
            weight={emphasis === 'strong' ? 'semibold' : 'medium'}
          >
            {value}
          </Text>
        ) : null}
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
    gap: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
