import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { PriceText } from '@/components/ui/atoms/price-text';
import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { ComparisonLine } from '@/components/ui/molecules/comparison-line';
import { MetricRow } from '@/components/ui/molecules/metric-row';
import { DailyTimeline, type DailyTimelinePoint } from '@/components/ui/organisms/daily-timeline';
import {
  MonthlyTimeline,
  type MonthlyTimelinePoint,
} from '@/components/ui/organisms/monthly-timeline';
import { useFormatters } from '@/hooks/use-formatters';
import { type Month } from '@/hooks/use-time-filter';
import { formatRelativeDate } from '@/utils/format';

export type OverviewMode = 'month' | 'year' | 'all';

export interface OverviewProps {
  mode: OverviewMode;
  primaryLabel: string;
  primaryValue: number;
  comparisonLabel?: string;
  /** Previous-period expenses — baseline for the comparison row. */
  previousExpenses?: number;
  currency?: string;
  // Balance breakdown (any mode):
  revenueVisible?: boolean;
  revenue?: number;
  expenses?: number;
  net?: number;
  /** ISO timestamp of the most recent transaction update; undefined when no transactions exist. */
  lastUpdatedAt?: string;
  // All mode:
  yearTotals?: { year: number; value: number }[];
  timeline?: readonly MonthlyTimelinePoint[];
  currentMonth?: Month;
  /** When provided, months-strip cards are tappable to switch the selected month. */
  onSelectMonth?: (month: Month) => void;
  // Month mode: per-day spend strip (newest day first).
  dailyTimeline?: readonly DailyTimelinePoint[];
}

export function Overview({
  mode,
  primaryLabel,
  primaryValue,
  comparisonLabel,
  previousExpenses,
  currency = 'USD',
  revenueVisible = false,
  revenue,
  expenses,
  net,
  lastUpdatedAt,
  yearTotals,
  timeline,
  currentMonth,
  onSelectMonth,
  dailyTimeline,
}: OverviewProps) {
  const { t } = useTranslation();
  const { formatCurrency, locale } = useFormatters();

  const lastUpdateLabel = useMemo(() => {
    if (!lastUpdatedAt) return t('overview.addFirstTransaction');
    const updated = new Date(lastUpdatedAt);
    const when = formatRelativeDate(updated, new Date(), locale, {
      today: t('transactions.today'),
      yesterday: t('transactions.yesterday'),
    });
    return t('overview.lastUpdate', { date: when });
  }, [lastUpdatedAt, locale, t]);

  // Comparison always reflects expenses — the primary metric shown at the top of the card.
  const comparisonDelta =
    previousExpenses !== undefined && primaryValue !== undefined
      ? primaryValue - previousExpenses
      : undefined;

  return (
    <Surface variant="plain" bordered padding={16} style={styles.card}>
      <View style={styles.headerRow}>
        <Text
          variant="caption"
          tone="textMuted"
          weight="semibold"
          numberOfLines={1}
          style={styles.headerLeft}
        >
          {`${t('overview.primaryPrefix')} ${primaryLabel}`.trim().toUpperCase()}
        </Text>
        <Text variant="caption" tone="textMuted" numberOfLines={1} style={styles.headerRight}>
          {lastUpdateLabel}
        </Text>
      </View>
      <PriceText
        value={primaryValue}
        currency={currency}
        tone={primaryValue < 0 ? 'negative' : 'neutral'}
        size="xl"
      />
      {comparisonDelta !== undefined && comparisonLabel ? (
        <ComparisonLine
          delta={comparisonDelta}
          label={comparisonLabel}
          currency={currency}
          lowerIsBetter
        />
      ) : null}

      {revenueVisible ? (
        <View style={styles.breakdown}>
          <MetricRow
            label={t('overview.revenue')}
            value={formatCurrency(revenue ?? 0, currency)}
            valueTone={
              (revenue ?? 0) > 0 ? 'positive' : (revenue ?? 0) < 0 ? 'negative' : undefined
            }
          />
          <MetricRow
            label={t('overview.expenses')}
            value={formatCurrency(expenses ?? primaryValue, currency)}
          />
          <MetricRow
            label={t('overview.balance')}
            value={formatCurrency(Math.abs(net ?? 0), currency)}
            emphasis="strong"
            valueTone={(net ?? 0) > 0 ? 'positive' : (net ?? 0) < 0 ? 'negative' : undefined}
            valueLeading={
              (net ?? 0) !== 0 ? (
                <Icon
                  name={(net ?? 0) > 0 ? 'arrow.up' : 'arrow.down'}
                  size={14}
                  tone={(net ?? 0) > 0 ? 'positive' : 'negative'}
                />
              ) : null
            }
          />
        </View>
      ) : null}

      {mode === 'all' && yearTotals && yearTotals.length > 0 ? (
        <View style={styles.yearTotals}>
          {yearTotals.map((y) => (
            <MetricRow
              key={y.year}
              label={String(y.year)}
              value={formatCurrency(y.value, currency)}
            />
          ))}
        </View>
      ) : null}

      {timeline && timeline.length > 0 ? (
        <View style={styles.timeline}>
          <MonthlyTimeline
            points={timeline}
            currency={currency}
            currentMonth={currentMonth}
            onSelectMonth={onSelectMonth}
          />
        </View>
      ) : null}

      {dailyTimeline && dailyTimeline.length > 0 ? (
        <View style={styles.timeline}>
          <DailyTimeline points={dailyTimeline} currency={currency} />
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerLeft: { flexShrink: 0 },
  headerRight: { flexShrink: 1, textAlign: 'right' },
  breakdown: { gap: 2, marginTop: 4 },
  yearTotals: { gap: 2, marginTop: 4 },
  timeline: { gap: 8, marginTop: 4 },
});
