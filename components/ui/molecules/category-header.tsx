import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PriceText, type PriceTone } from '@/components/ui/atoms/price-text';
import { Text } from '@/components/ui/atoms/text';
import { formatPercent } from '@/utils/format';

export interface CategoryHeaderProps {
  name: string;
  total: number;
  percentage?: number;
  currency?: string;
  /** Active locale for `Intl` formatting. Required — pass `useFormatters().locale`. */
  locale: string;
  tone?: PriceTone;
  /** Rendered in the top-right slot in place of the percentage when provided. */
  badge?: ReactNode;
  /** Shown next to the amount, e.g. "of 500,00", when the category has a goal. */
  goalText?: string;
}

export function CategoryHeader({
  name,
  total,
  percentage,
  currency = 'USD',
  locale,
  tone = 'neutral',
  badge,
  goalText,
}: CategoryHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text variant="body" weight="semibold" numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        {badge ??
          (percentage !== undefined ? (
            <Text variant="caption" tone="textMuted" weight="medium">
              {formatPercent(percentage, locale)}
            </Text>
          ) : null)}
      </View>
      <View style={styles.amountRow}>
        <PriceText value={total} currency={currency} locale={locale} tone={tone} size="lg" />
        {goalText ? (
          <Text variant="caption" tone="textMuted" weight="medium">
            {goalText}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    flex: 1,
  },
});
