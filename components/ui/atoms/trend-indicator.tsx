import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface TrendIndicatorProps {
  delta: number;
  percentage?: number;
  locale?: string;
  currency?: string;
  hideValue?: boolean;
  /** When true, a positive delta is treated as bad (red/down) — e.g. for expenses. */
  lowerIsBetter?: boolean;
}

export function TrendIndicator({
  delta,
  percentage,
  locale = 'pt-BR',
  currency = 'USD',
  hideValue = false,
  lowerIsBetter = false,
}: TrendIndicatorProps) {
  const isUp = delta >= 0;
  const isPositiveOutcome = lowerIsBetter ? !isUp : isUp;
  const tone = isPositiveOutcome ? 'positive' : 'negative';
  const color = useThemeColor({}, tone);

  const valueFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    signDisplay: 'always',
    maximumFractionDigits: 2,
  });

  const pctFormatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'always',
    maximumFractionDigits: 0,
  });

  return (
    <View style={styles.row}>
      <Icon name={isUp ? 'arrow.up.right' : 'arrow.down.right'} size={14} color={color} />
      {!hideValue && (
        <Text variant="caption" tone={tone} weight="semibold">
          {valueFormatter.format(delta)}
        </Text>
      )}
      {percentage !== undefined && (
        <Text variant="caption" tone={tone} weight="medium">
          {pctFormatter.format(percentage)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
