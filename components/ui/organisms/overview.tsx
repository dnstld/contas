import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { PriceText } from '@/components/ui/atoms/price-text';
import { SegmentedControl } from '@/components/ui/atoms/segmented-control';
import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { TrendIndicator } from '@/components/ui/atoms/trend-indicator';
import { MetricRow } from '@/components/ui/molecules/metric-row';
import {
  DailyTimeline,
  type DailyTimelinePoint,
} from '@/components/ui/organisms/daily-timeline';
import {
  MonthlyTimeline,
  type MonthlyTimelinePoint,
} from '@/components/ui/organisms/monthly-timeline';
import { useFormatters } from '@/hooks/use-formatters';
import { type Month } from '@/hooks/use-time-filter';

export type OverviewMode = 'month' | 'year' | 'all';
export type OverviewLens = 'expenses' | 'revenue' | 'net';

export interface OverviewProps {
  mode: OverviewMode;
  primaryLabel: string;
  primaryValue: number;
  comparisonLabel?: string;
  /** Previous-period totals — used to derive per-lens deltas. */
  previousExpenses?: number;
  previousRevenue?: number;
  currency?: string;
  // Revenue mode (any mode):
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

function safePct(delta: number, base: number): number | undefined {
  if (delta === 0) return 0;
  if (base === 0) return undefined;
  return delta / base;
}

export function Overview({
  mode,
  primaryLabel,
  primaryValue,
  comparisonLabel,
  previousExpenses,
  previousRevenue,
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
  const [lens, setLens] = useState<OverviewLens>('expenses');
  const { t } = useTranslation();
  const { formatCurrency, locale } = useFormatters();

  const lensOptions = useMemo(
    () => [
      { value: 'expenses' as const, label: t('overview.expenses') },
      { value: 'revenue' as const, label: t('overview.revenue') },
      { value: 'net' as const, label: t('overview.balance') },
    ],
    [t],
  );

  const lensValue =
    lens === 'revenue' ? (revenue ?? 0) : lens === 'net' ? (net ?? 0) : primaryValue;

  const lastUpdateLabel = useMemo(() => {
    if (!lastUpdatedAt) return t('overview.addFirstTransaction');
    const updated = new Date(lastUpdatedAt);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    const timePart = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(updated);
    const when = sameDay(updated, new Date())
      ? timePart
      : `${new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(updated)} ${timePart}`;
    return t('overview.lastUpdate', { time: when });
  }, [lastUpdatedAt, locale, t]);

  const lensTone = lens === 'net' ? (lensValue >= 0 ? 'positive' : 'negative') : 'neutral';

  // Per-lens comparison: pick which previous-period value + delta + tone semantics to use.
  const comparison = (() => {
    const activeLens = revenueVisible ? lens : 'expenses';
    if (activeLens === 'revenue') {
      if (previousRevenue === undefined || revenue === undefined) return null;
      const delta = revenue - previousRevenue;
      return {
        prev: previousRevenue,
        delta,
        deltaPct: safePct(delta, previousRevenue),
        lowerIsBetter: false,
      };
    }
    if (activeLens === 'net') {
      if (previousRevenue === undefined || previousExpenses === undefined || net === undefined) {
        return null;
      }
      const previousNet = previousRevenue - previousExpenses;
      const delta = net - previousNet;
      return {
        prev: previousNet,
        delta,
        deltaPct: safePct(delta, Math.abs(previousNet)),
        lowerIsBetter: false,
      };
    }
    // expenses
    if (previousExpenses === undefined || expenses === undefined) return null;
    const delta = expenses - previousExpenses;
    return {
      prev: previousExpenses,
      delta,
      deltaPct: safePct(delta, previousExpenses),
      lowerIsBetter: true,
    };
  })();

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
        value={revenueVisible ? lensValue : primaryValue}
        currency={currency}
        locale={locale}
        tone={revenueVisible ? lensTone : 'neutral'}
        size="xl"
      />
      {comparison ? (
        <View style={styles.compRow}>
          <TrendIndicator
            delta={comparison.delta}
            percentage={comparison.deltaPct}
            currency={currency}
            locale={locale}
            hideValue
            lowerIsBetter={comparison.lowerIsBetter}
          />
          {comparisonLabel ? (
            <Text variant="caption" tone="textMuted">
              {t('overview.vsPrevious', {
                label: comparisonLabel,
                value: formatCurrency(comparison.prev, currency),
              })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {revenueVisible ? (
        <View style={styles.lens}>
          <SegmentedControl options={lensOptions} value={lens} onChange={setLens} />
          <View style={styles.lensRows}>
            <MetricRow
              label={t('overview.revenue')}
              value={formatCurrency(revenue ?? 0, currency)}
              valueTone={(revenue ?? 0) > 0 ? 'positive' : undefined}
            />
            <MetricRow
              label={t('overview.expenses')}
              value={formatCurrency(expenses ?? primaryValue, currency)}
              valueTone={(expenses ?? primaryValue) > 0 ? 'negative' : undefined}
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
          <Text variant="caption" tone="textMuted" weight="semibold">
            {t('overview.allMonths')}
          </Text>
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
          <Text variant="caption" tone="textMuted" weight="semibold">
            {t('overview.byDay')}
          </Text>
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
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lens: { gap: 8, marginTop: 4 },
  lensRows: { gap: 2 },
  yearTotals: { gap: 2, marginTop: 4 },
  timeline: { gap: 8, marginTop: 4 },
});
