import { StyleSheet, View } from 'react-native';

import { PriceText, type PriceTone } from '@/components/ui/atoms/price-text';
import { Surface, type SurfaceVariant } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { TrendIndicator } from '@/components/ui/atoms/trend-indicator';

export interface MetricCardProps {
  label: string;
  value: number;
  currency?: string;
  delta?: number;
  deltaPercentage?: number;
  tone?: PriceTone;
  variant?: SurfaceVariant;
  caption?: string;
}

export function MetricCard({
  label,
  value,
  currency = 'USD',
  delta,
  deltaPercentage,
  tone = 'neutral',
  variant = 'plain',
  caption,
}: MetricCardProps) {
  return (
    <Surface variant={variant} padding={16} style={styles.card}>
      <Text variant="caption" tone="textMuted" weight="medium">
        {label.toUpperCase()}
      </Text>
      <View style={styles.valueRow}>
        <PriceText value={value} currency={currency} tone={tone} size="xl" />
      </View>
      <View style={styles.footer}>
        {delta !== undefined ? (
          <TrendIndicator delta={delta} percentage={deltaPercentage} currency={currency} />
        ) : null}
        {caption ? (
          <Text variant="caption" tone="textMuted">
            {caption}
          </Text>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
