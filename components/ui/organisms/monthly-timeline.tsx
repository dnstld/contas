import { ScrollView, StyleSheet, View } from 'react-native';

import { TimelineItem } from '@/components/ui/molecules/timeline-item';
import { useFormatters } from '@/hooks/use-formatters';
import { MONTHS, type Month } from '@/hooks/use-time-filter';

export interface MonthlyTimelinePoint {
  month: Month;
  value: number;
  delta?: number;
}

export interface MonthlyTimelineProps {
  points: readonly MonthlyTimelinePoint[];
  currency?: string;
  currentMonth?: Month;
}

/**
 * Reorders points so that current month is first, prior months follow in reverse chronology.
 */
function orderPoints(
  points: readonly MonthlyTimelinePoint[],
  currentMonth: Month,
): MonthlyTimelinePoint[] {
  const idx = MONTHS.indexOf(currentMonth);
  const ordered: MonthlyTimelinePoint[] = [];
  for (let offset = 0; offset < MONTHS.length; offset++) {
    const monthIdx = (idx - offset + MONTHS.length) % MONTHS.length;
    const month = MONTHS[monthIdx];
    const point = points.find((p) => p.month === month);
    if (point) ordered.push(point);
  }
  return ordered;
}

export function MonthlyTimeline({
  points,
  currency = 'USD',
  currentMonth = MONTHS[new Date().getMonth()],
}: MonthlyTimelineProps) {
  const ordered = orderPoints(points, currentMonth);
  const { monthName } = useFormatters();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {ordered.map((p) => (
        <View key={p.month} style={styles.cell}>
          <TimelineItem
            label={monthName(MONTHS.indexOf(p.month), 'short')}
            value={p.value}
            delta={p.delta}
            currency={currency}
            current={p.month === currentMonth}
            tone={p.delta === undefined ? 'neutral' : p.delta >= 0 ? 'positive' : 'negative'}
          />
        </View>
      ))}
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
