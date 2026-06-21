import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/atoms/badge';
import { Icon, type IconName } from '@/components/ui/atoms/icon';
import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { TrendIndicator } from '@/components/ui/atoms/trend-indicator';
import { CategoryHeader } from '@/components/ui/molecules/category-header';
import { useFormatters } from '@/hooks/use-formatters';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface CategoryCardData {
  id: string;
  name: string;
  icon?: IconName;
  total: number;
  percentage?: number;
  budget?: number;
  delta?: number;
  deltaPercentage?: number;
  revenue?: number;
  /** Number of completed transactions in the period — used by the grid's "most used" sort. */
  entryCount?: number;
  /** 'expense' inverts the trend tone (higher = bad). 'income' keeps the default (higher = good). */
  kind?: 'expense' | 'income';
  /** Previous-period absolute value, shown in the comparison row (e.g. "(R$ 123,00)"). */
  previousValue?: number;
  /** Previous-period label, shown in the comparison row (e.g. "Abril" or "2025"). */
  previousLabel?: string;
}

export interface CategoryCardProps {
  data: CategoryCardData;
  currency?: string;
  revenueVisible?: boolean;
  /** Shows a badge in the header (in place of the percentage), e.g. "Example". */
  badgeLabel?: string;
  onPress?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

function CategoryCardImpl({
  data,
  currency = 'USD',
  revenueVisible = false,
  badgeLabel,
  onPress,
  onLongPress,
}: CategoryCardProps) {
  const iconBg = useThemeColor({}, 'surfaceMuted');
  const iconColor = useThemeColor({}, 'icon');
  const { t } = useTranslation();
  const { formatNumber, locale } = useFormatters();

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
      <View style={styles.headerRow}>
        {data.icon ? (
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Icon name={data.icon} size={16} color={iconColor} />
          </View>
        ) : null}
        <View style={styles.headerText}>
          <CategoryHeader
            name={data.name}
            total={data.total}
            percentage={data.percentage}
            currency={currency}
            locale={locale}
            tone={tone}
            badge={badgeLabel ? <Badge label={badgeLabel} tone="tint" /> : undefined}
            goalText={goalText}
          />
        </View>
      </View>

      {data.delta !== undefined &&
      data.previousValue !== undefined &&
      data.previousLabel &&
      !isEmpty ? (
        <View style={styles.compRow}>
          <TrendIndicator
            delta={data.delta}
            percentage={data.deltaPercentage}
            currency={currency}
            locale={locale}
            hideValue
            lowerIsBetter={data.kind === 'expense'}
          />
          <Text variant="caption" tone="textMuted">
            {t('category.vsPrevious', {
              label: data.previousLabel,
              value: formatNumber(data.previousValue),
            })}
          </Text>
        </View>
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

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      onLongPress={onLongPress ? handleLongPress : undefined}
      delayLongPress={400}
      android_ripple={{ color: iconBg }}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: { opacity: 0.85 },
});
