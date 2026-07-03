import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { PriceText, type PriceTone } from '@/components/ui/atoms/price-text';
import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { TrendIndicator } from '@/components/ui/atoms/trend-indicator';
import { useFormatters } from '@/hooks/use-formatters';

export interface TimelineItemProps {
  label: string;
  value: number;
  delta?: number;
  /** Signed fraction shown next to the trend arrow, e.g. 0.12 for "+12%". */
  percentage?: number;
  currency?: string;
  current?: boolean;
  tone?: PriceTone;
  /** When true, a positive delta is treated as unfavorable (red) — e.g. spending. */
  lowerIsBetter?: boolean;
  onPress?: () => void;
  /** Replaces the bottom trend row (e.g. a transaction count). Takes precedence over `delta`. */
  footer?: ReactNode;
}

export function TimelineItem({
  label,
  value,
  delta,
  percentage,
  currency = 'USD',
  current = false,
  tone = 'neutral',
  lowerIsBetter = false,
  onPress,
  footer,
}: TimelineItemProps) {
  const { t } = useTranslation();
  const { formatCurrency, locale } = useFormatters();
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
      <PriceText value={value} currency={currency} locale={locale} tone={tone} size="md" />
      {footer !== undefined ? (
        footer
      ) : delta !== undefined ? (
        <TrendIndicator
          delta={delta}
          percentage={percentage}
          hideValue
          currency={currency}
          locale={locale}
          lowerIsBetter={lowerIsBetter}
        />
      ) : (
        <View style={styles.trendPlaceholder} />
      )}
    </Surface>
  );

  if (!onPress) return card;

  const accessibilityLabel = [label, formatCurrency(value, currency)].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: current }}
      accessibilityHint={t('accessibility.hints.filterByMonth')}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
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
