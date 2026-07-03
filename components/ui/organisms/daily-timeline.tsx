import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { TimelineItem } from '@/components/ui/molecules/timeline-item';
import { useFormatters } from '@/hooks/use-formatters';

/** A day is flagged as a spend spike once it exceeds the month's average daily spend by this factor. */
const SPIKE_THRESHOLD = 1.5;

export interface DailyTimelinePoint {
  /** Day as ISO `YYYY-MM-DD`. */
  date: string;
  /** Total spend for the day. */
  value: number;
  /** Number of expense transactions that day. */
  count: number;
  /** Whether this is today — emphasized in the strip. */
  current?: boolean;
}

export interface DailyTimelineProps {
  points: readonly DailyTimelinePoint[];
  currency?: string;
}

/**
 * Horizontal per-day spend strip for the selected month. Points are expected
 * pre-ordered newest-day-first. Display only — cards are not interactive.
 */
export function DailyTimeline({ points, currency = 'USD' }: DailyTimelineProps) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();

  // Average daily spend across the visible strip — used to flag spike days,
  // not a true statistical baseline (e.g. it shifts as the month progresses).
  const average = useMemo(() => {
    if (points.length === 0) return 0;
    return points.reduce((sum, p) => sum + p.value, 0) / points.length;
  }, [points]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {points.map((p) => {
        const d = new Date(`${p.date}T00:00:00`);
        const isSpike = average > 0 && p.value > average * SPIKE_THRESHOLD;
        return (
          <View key={p.date} style={styles.cell}>
            <TimelineItem
              label={`${formatDate(d, { weekday: 'short' })} ${d.getDate()}`}
              value={p.value}
              currency={currency}
              current={p.current}
              tone={isSpike ? 'negative' : 'neutral'}
              footer={
                <Text
                  variant="caption"
                  tone={p.current ? 'tint' : 'textMuted'}
                  weight="medium"
                  numberOfLines={1}
                >
                  {t('transactions.countShort', { count: p.count })}
                </Text>
              }
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  cell: {},
});
