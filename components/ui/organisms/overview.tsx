import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PriceText } from '@/components/ui/atoms/price-text';
import { SegmentedControl } from '@/components/ui/atoms/segmented-control';
import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { TrendIndicator } from '@/components/ui/atoms/trend-indicator';
import { MetricRow } from '@/components/ui/molecules/metric-row';
import {
  MonthlyTimeline,
  type MonthlyTimelinePoint,
} from '@/components/ui/organisms/monthly-timeline';
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
  // All mode:
  yearTotals?: { year: number; value: number }[];
  timeline?: readonly MonthlyTimelinePoint[];
  currentMonth?: Month;
}

const LENS_OPTIONS = [
  { value: 'expenses' as const, label: 'Despesas' },
  { value: 'revenue' as const, label: 'Receitas' },
  { value: 'net' as const, label: 'Saldo' },
];

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
  yearTotals,
  timeline,
  currentMonth,
}: OverviewProps) {
  const [lens, setLens] = useState<OverviewLens>('expenses');

  const lensValue =
    lens === 'revenue' ? revenue ?? 0 : lens === 'net' ? net ?? 0 : primaryValue;

  const lensTone =
    lens === 'net'
      ? lensValue >= 0
        ? 'positive'
        : 'negative'
      : 'neutral';

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
        <Text variant="caption" tone="textMuted" weight="semibold">
          {primaryLabel.toUpperCase()}
        </Text>
        <Text variant="caption" tone="textMuted">
          {modeBadge(mode)}
        </Text>
      </View>
      <PriceText
        value={revenueVisible ? lensValue : primaryValue}
        currency={currency}
        tone={revenueVisible ? lensTone : 'neutral'}
        size="xl"
      />
      {comparison ? (
        <View style={styles.compRow}>
          <TrendIndicator
            delta={comparison.delta}
            percentage={comparison.deltaPct}
            currency={currency}
            locale="pt-BR"
            hideValue
            lowerIsBetter={comparison.lowerIsBetter}
          />
          {comparisonLabel ? (
            <Text variant="caption" tone="textMuted">
              {`vs ${comparisonLabel}: ${formatNumber(comparison.prev)}`}
            </Text>
          ) : null}
        </View>
      ) : null}

      {revenueVisible ? (
        <View style={styles.lens}>
          <SegmentedControl
            options={LENS_OPTIONS}
            value={lens}
            onChange={setLens}
          />
          <View style={styles.lensRows}>
            <MetricRow label="Receitas" value={formatCurrency(revenue ?? 0, currency)} />
            <MetricRow label="Despesas" value={formatCurrency(expenses ?? primaryValue, currency)} />
            <MetricRow label="Saldo" value={formatCurrency(net ?? 0, currency)} emphasis="strong" />
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

      {(mode === 'all' || mode === 'year') && timeline && timeline.length > 0 ? (
        <View style={styles.timeline}>
          <Text variant="caption" tone="textMuted" weight="semibold">
            TODOS OS MESES
          </Text>
          <MonthlyTimeline
            points={timeline}
            currency={currency}
            currentMonth={currentMonth}
          />
        </View>
      ) : null}
    </Surface>
  );
}

function modeBadge(mode: OverviewMode) {
  switch (mode) {
    case 'month':
      return 'MÊS';
    case 'year':
      return 'ANO';
    case 'all':
      return 'TUDO';
  }
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
