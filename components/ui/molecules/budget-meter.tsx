import { StyleSheet, View } from 'react-native';

import { PriceText } from '@/components/ui/atoms/price-text';
import { ProgressBar } from '@/components/ui/atoms/progress-bar';
import { Text } from '@/components/ui/atoms/text';
import { formatPercent } from '@/utils/format';

export interface BudgetMeterProps {
  spent: number;
  budget: number;
  currency?: string;
  /** Active locale for `Intl` formatting. Required — pass `useFormatters().locale`. */
  locale: string;
}

export function BudgetMeter({ spent, budget, currency = 'USD', locale }: BudgetMeterProps) {
  const ratio = budget > 0 ? spent / budget : 0;
  const overBudget = spent > budget;
  const tone = overBudget ? 'negative' : 'positive';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.values}>
          <PriceText value={spent} currency={currency} locale={locale} tone={tone} size="md" />
          <Text variant="caption" tone="textMuted">
            {' '}
            /{' '}
          </Text>
          <PriceText value={budget} currency={currency} locale={locale} tone="neutral" size="md" />
        </View>
        <Text variant="caption" tone={overBudget ? 'negative' : 'textMuted'} weight="medium">
          {formatPercent(Math.min(ratio, 9.99), locale)}
        </Text>
      </View>
      <ProgressBar value={Math.min(ratio, 1)} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  values: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
});
