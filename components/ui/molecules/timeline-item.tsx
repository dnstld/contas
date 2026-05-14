import { StyleSheet, View } from 'react-native';

import { PriceText, type PriceTone } from '@/components/ui/atoms/price-text';
import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { TrendIndicator } from '@/components/ui/atoms/trend-indicator';

export interface TimelineItemProps {
  label: string;
  value: number;
  delta?: number;
  currency?: string;
  current?: boolean;
  tone?: PriceTone;
}

export function TimelineItem({
  label,
  value,
  delta,
  currency = 'USD',
  current = false,
  tone = 'neutral',
}: TimelineItemProps) {
  return (
    <Surface
      variant={current ? 'elevated' : 'muted'}
      padding={12}
      bordered={!current}
      style={styles.card}
    >
      <Text
        variant="caption"
        tone={current ? 'tint' : 'textMuted'}
        weight="semibold"
      >
        {label.toUpperCase()}
      </Text>
      <PriceText value={value} currency={currency} tone={tone} size="md" />
      {delta !== undefined ? (
        <TrendIndicator delta={delta} hideValue currency={currency} />
      ) : (
        <View style={styles.trendPlaceholder} />
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 96,
    gap: 4,
  },
  trendPlaceholder: {
    height: 14,
  },
});
