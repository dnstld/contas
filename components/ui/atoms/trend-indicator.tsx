import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { currencyLocale } from '@/data/currency';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatCurrency, formatPercent } from '@/utils/format';

export interface TrendIndicatorProps {
  delta: number;
  percentage?: number;
  currency?: string;
  hideValue?: boolean;
  /** When true, a positive delta is treated as bad (red/down) — e.g. for expenses. */
  lowerIsBetter?: boolean;
}

export function TrendIndicator({
  delta,
  percentage,
  currency = 'USD',
  hideValue = false,
  lowerIsBetter = false,
}: TrendIndicatorProps) {
  const locale = currencyLocale(currency);
  const isFlat = delta === 0;
  const isUp = delta > 0;
  const isPositiveOutcome = lowerIsBetter ? !isUp : isUp;
  const tone = isFlat ? 'textMuted' : isPositiveOutcome ? 'positive' : 'negative';
  const color = useThemeColor({}, tone);

  const iconName = isFlat ? 'minus' : isUp ? 'arrow.up.right' : 'arrow.down.right';

  const valueText = formatCurrency(delta, currency, locale, { signDisplay: 'exceptZero' });
  const pctText =
    percentage !== undefined
      ? formatPercent(percentage, locale, { signDisplay: 'exceptZero' })
      : '';

  return (
    <View style={styles.row}>
      <Icon name={iconName} size={14} color={color} />
      {!hideValue && (
        <Text variant="caption" tone={tone} weight="semibold">
          {valueText}
        </Text>
      )}
      {percentage !== undefined && (
        <Text variant="caption" tone={tone} weight="medium">
          {pctText}
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
