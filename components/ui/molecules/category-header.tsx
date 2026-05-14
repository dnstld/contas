import { StyleSheet, View } from 'react-native';

import { PriceText, type PriceTone } from '@/components/ui/atoms/price-text';
import { Text } from '@/components/ui/atoms/text';

export interface CategoryHeaderProps {
  name: string;
  total: number;
  percentage?: number;
  currency?: string;
  locale?: string;
  tone?: PriceTone;
}

export function CategoryHeader({
  name,
  total,
  percentage,
  currency = 'USD',
  locale = 'pt-BR',
  tone = 'neutral',
}: CategoryHeaderProps) {
  const pctFormatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text variant="body" weight="semibold" numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        {percentage !== undefined ? (
          <Text variant="caption" tone="textMuted" weight="medium">
            {pctFormatter.format(percentage)}
          </Text>
        ) : null}
      </View>
      <PriceText value={total} currency={currency} tone={tone} size="lg" />
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
  name: {
    flex: 1,
  },
});
