import { useCallback, useMemo } from 'react';

import { usePersistedState } from '@/hooks/use-persisted-state';

export type Month =
  | 'jan'
  | 'feb'
  | 'mar'
  | 'apr'
  | 'may'
  | 'jun'
  | 'jul'
  | 'aug'
  | 'sep'
  | 'oct'
  | 'nov'
  | 'dec';

export const MONTHS: readonly Month[] = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

/**
 * Single-select per axis. A year is always selected. Either a specific month
 * is selected (`all=false`) OR "all months" is selected (`all=true`).
 */
export interface TimeFilterState {
  years: number[];
  months: Month[];
  all: boolean;
}

export interface TimeFilterApi {
  state: TimeFilterState;
  selectAll: () => void;
  toggleYear: (year: number) => void;
  toggleMonth: (month: Month) => void;
  reset: () => void;
}

export interface UseTimeFilterOptions {
  storageKey?: string;
  now?: Date;
  yearsRange?: number;
}

const DEFAULT_KEY = 'time-filter:v2';

function currentMonth(now: Date): Month {
  return MONTHS[now.getMonth()]!;
}

export function defaultTimeFilterState(now: Date = new Date()): TimeFilterState {
  return {
    years: [now.getFullYear()],
    months: [currentMonth(now)],
    all: false,
  };
}

function normalize(state: TimeFilterState, now: Date): TimeFilterState {
  const firstYear = state.years?.[0];
  const years = firstYear !== undefined ? [firstYear] : [now.getFullYear()];
  if (state.all) return { years, months: [], all: true };
  const firstMonth = state.months?.[0];
  const months: Month[] = [firstMonth ?? currentMonth(now)];
  return { years, months, all: false };
}

export function useTimeFilter({
  storageKey = DEFAULT_KEY,
  now = new Date(),
}: UseTimeFilterOptions = {}): TimeFilterApi {
  const initial = useMemo(() => defaultTimeFilterState(now), [now]);
  const [rawState, setState] = usePersistedState<TimeFilterState>(storageKey, initial);
  const state = useMemo(() => normalize(rawState, now), [rawState, now]);

  const selectAll = useCallback(() => {
    setState((prev) => ({
      years: prev.years.length > 0 ? prev.years : [now.getFullYear()],
      months: [],
      all: true,
    }));
  }, [now, setState]);

  const toggleYear = useCallback(
    (year: number) => {
      setState((prev) => {
        // Single-select. Tapping the same year is a no-op (year is always required).
        if (prev.years.length === 1 && prev.years[0] === year) return prev;
        return { ...prev, years: [year] };
      });
    },
    [setState],
  );

  const toggleMonth = useCallback(
    (month: Month) => {
      setState((prev) => {
        // Single-select. Tapping the active month while not in `all` mode is a no-op
        // (a month is always required when not in `all` mode).
        if (!prev.all && prev.months.length === 1 && prev.months[0] === month) {
          return prev;
        }
        return {
          years: prev.years.length > 0 ? prev.years : [now.getFullYear()],
          months: [month],
          all: false,
        };
      });
    },
    [now, setState],
  );

  const reset = useCallback(() => {
    setState(initial);
  }, [initial, setState]);

  return { state, selectAll, toggleYear, toggleMonth, reset };
}
