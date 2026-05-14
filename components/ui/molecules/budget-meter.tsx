import { StyleSheet, View } from 'react-native';

import { PriceText } from '@/components/ui/atoms/price-text';
import { ProgressBar } from '@/components/ui/atoms/progress-bar';
import { Text } from '@/components/ui/atoms/text';

export interface BudgetMeterProps {
  spent: number;
  budget: number;
  currency?: string;
  locale?: string;
}

export function BudgetMeter({ spent, budget, currency = 'USD', locale = 'pt-BR' }: BudgetMeterProps) {
  const ratio = budget > 0 ? spent / budget : 0;
  const overBudget = spent > budget;
  const tone = overBudget ? 'negative' : 'positive';

  const pctFormatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.values}>
          <PriceText value={spent} currency={currency} tone={tone} size="md" />
          <Text variant="caption" tone="textMuted"> / </Text>
          <PriceText value={budget} currency={currency} tone="neutral" size="md" />
        </View>
        <Text variant="caption" tone={overBudget ? 'negative' : 'textMuted'} weight="medium">
          {pctFormatter.format(Math.min(ratio, 9.99))}
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
