import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/atoms/chip';
import { Divider } from '@/components/ui/atoms/divider';
import {
  MONTH_FULL_LABEL,
  MONTHS,
  useTimeFilter,
  type Month,
  type TimeFilterApi,
  type UseTimeFilterOptions,
} from '@/hooks/use-time-filter';

export interface TimeFilterBarProps extends UseTimeFilterOptions {
  yearsRange?: number;
  /** Optional controlled API. When provided, the bar does not own its state. */
  api?: TimeFilterApi;
  onChange?: (state: {
    years: number[];
    months: Month[];
    all: boolean;
  }) => void;
}

export function TimeFilterBar({ api, ...rest }: TimeFilterBarProps) {
  if (api) return <TimeFilterBarView {...rest} api={api} />;
  return <TimeFilterBarUncontrolled {...rest} />;
}

function TimeFilterBarUncontrolled({
  now = new Date(),
  onChange,
  yearsRange,
  ...filterOptions
}: Omit<TimeFilterBarProps, 'api'>) {
  const api = useTimeFilter({ now, ...filterOptions });
  return (
    <TimeFilterBarView
      api={api}
      now={now}
      yearsRange={yearsRange}
      onChange={onChange}
    />
  );
}

interface ViewProps {
  api: TimeFilterApi;
  now?: Date;
  yearsRange?: number;
  onChange?: TimeFilterBarProps['onChange'];
}

function TimeFilterBarView({
  api,
  now = new Date(),
  yearsRange = 4,
  onChange,
}: ViewProps) {
  const { state, selectAll, toggleYear, toggleMonth } = api;

  const years = useMemo(() => {
    const current = now.getFullYear();
    const arr: number[] = [];
    for (let i = yearsRange - 1; i >= 0; i--) arr.push(current - i);
    return arr;
  }, [now, yearsRange]);

  const months = useMemo(() => {
    const start = now.getMonth();
    const arr: Month[] = [];
    for (let i = 0; i < MONTHS.length; i++) {
      arr.push(MONTHS[(start - i + MONTHS.length) % MONTHS.length]);
    }
    return arr;
  }, [now]);

  useEffect(() => {
    onChange?.(state);
  }, [state, onChange]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {years.map((y) => {
        const selected = state.years.includes(y);
        return (
          <Chip
            key={y}
            label={String(y)}
            variant={selected ? 'secondary' : 'default'}
            selected={selected}
            onPress={() => toggleYear(y)}
          />
        );
      })}
      <View style={styles.divider}>
        <Divider orientation="vertical" />
      </View>
      <Chip
        label="Ano todo"
        variant={state.all ? 'primary' : 'tertiary'}
        selected={state.all}
        showCheckWhenSelected
        onPress={selectAll}
      />
      {months.map((m) => {
        const selected = !state.all && state.months.includes(m);
        return (
          <Chip
            key={m}
            label={MONTH_FULL_LABEL[m]}
            variant={selected ? 'primary' : 'tertiary'}
            selected={selected}
            showCheckWhenSelected
            onPress={() => toggleMonth(m)}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  divider: {
    height: 24,
    marginHorizontal: 4,
  },
});
