import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { TimelineItem } from '@/components/ui/molecules/timeline-item';
import { useFormatters } from '@/hooks/use-formatters';

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
  const { locale } = useFormatters();
  const weekdayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {points.map((p) => {
        const d = new Date(`${p.date}T00:00:00`);
        return (
          <View key={p.date} style={styles.cell}>
            <TimelineItem
              label={`${weekdayFmt.format(d)} ${d.getDate()}`}
              value={p.value}
              currency={currency}
              current={p.current}
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
