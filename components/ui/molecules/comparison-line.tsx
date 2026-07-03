import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { Text, type TextTone } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatCurrency } from '@/utils/format';

export interface ComparisonLineProps {
  /** current − previous. */
  delta: number;
  /** The previous-period label, e.g. a month name or a 4-digit year. */
  label: string;
  currency?: string;
  /** Active locale for `Intl` formatting. Required — pass `useFormatters().locale`. */
  locale: string;
  /** When true, a positive delta is unfavorable (red) — e.g. expenses. Default false (income-like: higher is favorable). */
  lowerIsBetter?: boolean;
}

/**
 * Shared "X less/more than Y" comparison line — used below the Balance
 * card's total and on each category card. Single source for this format so
 * both surfaces stay in sync; see docs/specs/overview.md and
 * docs/specs/category-card.md for the full case table.
 */
export function ComparisonLine({
  delta,
  label,
  currency = 'USD',
  locale,
  lowerIsBetter = false,
}: ComparisonLineProps) {
  const { t } = useTranslation();
  const isFlat = delta === 0;
  const isUp = delta > 0;
  const isFavorable = lowerIsBetter ? !isUp : isUp;
  const tone: TextTone = isFlat ? 'textMuted' : isFavorable ? 'positive' : 'negative';
  const color = useThemeColor({}, tone);
  const iconName = isFlat ? 'minus' : isUp ? 'arrow.up.right' : 'arrow.down.right';

  const trailingText = isFlat
    ? t('comparison.sameAs', { label })
    : t(isUp ? 'comparison.moreThan' : 'comparison.lessThan', { label });

  return (
    <View style={styles.row}>
      <Icon name={iconName} size={14} color={color} />
      {!isFlat ? (
        <Text variant="caption" tone={tone} weight="semibold">
          {formatCurrency(Math.abs(delta), currency, locale)}
        </Text>
      ) : null}
      <Text variant="caption" tone="textMuted">
        {trailingText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
