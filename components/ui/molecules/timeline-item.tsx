import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
  onPress?: () => void;
  /** Replaces the bottom trend row (e.g. a transaction count). Takes precedence over `delta`. */
  footer?: ReactNode;
}

export function TimelineItem({
  label,
  value,
  delta,
  currency = 'USD',
  current = false,
  tone = 'neutral',
  onPress,
  footer,
}: TimelineItemProps) {
  const card = (
    <Surface
      variant={current ? 'elevated' : 'muted'}
      padding={12}
      bordered={!current}
      style={styles.card}
    >
      <Text variant="caption" tone={current ? 'tint' : 'textMuted'} weight="semibold">
        {label.toUpperCase()}
      </Text>
      <PriceText value={value} currency={currency} tone={tone} size="md" />
      {footer !== undefined ? (
        footer
      ) : delta !== undefined ? (
        <TrendIndicator delta={delta} hideValue currency={currency} />
      ) : (
        <View style={styles.trendPlaceholder} />
      )}
    </Surface>
  );

  if (!onPress) return card;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {card}
    </Pressable>
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
  pressed: {
    opacity: 0.6,
  },
});
