import { useCallback, useMemo } from 'react';

import { usePersistedState } from '@/hooks/use-persisted-state';

import {
  DEFAULT_TIME_FILTER_KEY,
  defaultTimeFilterState,
  normalizeTimeFilterState,
  type Month,
  type TimeFilterApi,
  type TimeFilterState,
  type UseTimeFilterOptions,
} from './use-time-filter-state';

// Re-export the pure time-filter API so existing consumers can keep importing
// from `@/hooks/use-time-filter`. New pure/data-layer code should import from
// `@/hooks/use-time-filter-state` directly to avoid the native import chain.
export {
  MONTHS,
  defaultTimeFilterState,
  type Month,
  type TimeFilterState,
  type TimeFilterApi,
  type UseTimeFilterOptions,
} from './use-time-filter-state';

export function useTimeFilter({
  storageKey = DEFAULT_TIME_FILTER_KEY,
  now = new Date(),
}: UseTimeFilterOptions = {}): TimeFilterApi {
  const initial = useMemo(() => defaultTimeFilterState(now), [now]);
  const [rawState, setState] = usePersistedState<TimeFilterState>(storageKey, initial);
  const state = useMemo(() => normalizeTimeFilterState(rawState, now), [rawState, now]);

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
