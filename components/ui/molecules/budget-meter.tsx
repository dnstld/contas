import { StyleSheet, View } from 'react-native';

import { PriceText } from '@/components/ui/atoms/price-text';
import { ProgressBar } from '@/components/ui/atoms/progress-bar';
import { Text } from '@/components/ui/atoms/text';
import { currencyLocale } from '@/data/currency';
import { formatPercent } from '@/utils/format';

export interface BudgetMeterProps {
  spent: number;
  budget: number;
  currency?: string;
}

export function BudgetMeter({ spent, budget, currency = 'USD' }: BudgetMeterProps) {
  const ratio = budget > 0 ? spent / budget : 0;
  const overBudget = spent > budget;
  const tone = overBudget ? 'negative' : 'positive';
  // The ratio percent belongs to this money meter, so format it in the
  // currency's locale to stay visually consistent with the amounts.
  const locale = currencyLocale(currency);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.values}>
          <PriceText value={spent} currency={currency} tone={tone} size="md" />
          <Text variant="caption" tone="textMuted">
            {' '}
            /{' '}
          </Text>
          <PriceText value={budget} currency={currency} tone="neutral" size="md" />
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
