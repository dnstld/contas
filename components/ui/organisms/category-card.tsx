import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { CategoryHeader } from '@/components/ui/molecules/category-header';
import { ComparisonLine } from '@/components/ui/molecules/comparison-line';
import { useFormatters } from '@/hooks/use-formatters';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface CategoryCardData {
  id: string;
  name: string;
  total: number;
  /** Share of total expenses in the period. No longer displayed on the card,
   * kept for potential future use (e.g. a detail screen or alternate sort). */
  percentage?: number;
  budget?: number;
  /** current − previous, drives the comparison line's arrow/tone/amount. */
  delta?: number;
  /** No longer displayed (the comparison line shows the delta amount directly). */
  deltaPercentage?: number;
  revenue?: number;
  /** Number of completed transactions in the period — used by the grid's "most used" sort. */
  entryCount?: number;
  /** 'expense' inverts the trend tone (higher = bad). 'income' keeps the default (higher = good). */
  kind?: 'expense' | 'income';
  /** No longer displayed (the comparison line shows the delta amount directly, not the previous absolute value). */
  previousValue?: number;
  /** Previous-period label, shown in the comparison line (e.g. "Abril" or "2025"). */
  previousLabel?: string;
}

export interface CategoryCardProps {
  data: CategoryCardData;
  currency?: string;
  revenueVisible?: boolean;
  onPress?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

function CategoryCardImpl({
  data,
  currency = 'USD',
  revenueVisible = false,
  onPress,
  onLongPress,
}: CategoryCardProps) {
  const rippleColor = useThemeColor({}, 'surfaceMuted');
  const { t } = useTranslation();
  const { formatNumber, formatCurrency } = useFormatters();

  // With a goal: under → green, exactly at the goal → warning, over → red.
  const tone =
    data.budget == null
      ? 'neutral'
      : data.total > data.budget
        ? 'negative'
        : data.total === data.budget
          ? 'warning'
          : 'positive';
  const isEmpty = data.total === 0;
  const goalText =
    data.budget != null ? t('category.goalOf', { value: formatNumber(data.budget) }) : undefined;

  const Body = (
    <Surface variant="plain" bordered padding={14} style={styles.card}>
      <CategoryHeader
        name={data.name}
        total={data.total}
        currency={currency}
        tone={tone}
        goalText={goalText}
      />

      {data.delta !== undefined && data.previousLabel && !isEmpty ? (
        <ComparisonLine
          delta={data.delta}
          label={data.previousLabel}
          currency={currency}
          lowerIsBetter={data.kind === 'expense'}
        />
      ) : null}

      {data.entryCount !== undefined && data.entryCount > 0 && !isEmpty ? (
        <Text variant="caption" tone="textMuted">
          {t('category.transactionCount', { count: data.entryCount })}
        </Text>
      ) : null}

      {isEmpty ? (
        <Text variant="caption" tone="textMuted">
          {t('category.noActivity')}
        </Text>
      ) : null}
    </Surface>
  );

  const handlePress = useCallback(() => {
    if (onPress) onPress(data.id);
  }, [onPress, data.id]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) onLongPress(data.id);
  }, [onLongPress, data.id]);

  if (!onPress && !onLongPress) return Body;

  // One grouped label so the card announces as a single element (name · amount ·
  // goal · status) instead of the child texts one by one.
  const statusLabel = isEmpty
    ? t('category.noActivity')
    : data.entryCount !== undefined && data.entryCount > 0
      ? t('category.transactionCount', { count: data.entryCount })
      : undefined;
  const accessibilityLabel = [
    data.name,
    formatCurrency(data.total, currency),
    goalText,
    statusLabel,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      onLongPress={onLongPress ? handleLongPress : undefined}
      delayLongPress={400}
      android_ripple={{ color: rippleColor }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onPress ? t('accessibility.hints.viewTransactions') : undefined}
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      {Body}
    </Pressable>
  );
}

// Memoized so the grid doesn't re-render every card on unrelated parent
// updates (filter chip taps, header re-flows, etc).
export const CategoryCard = memo(CategoryCardImpl);

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  pressed: { opacity: 0.85 },
});
