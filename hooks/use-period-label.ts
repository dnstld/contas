import { useMemo } from 'react';

import { useFormatters } from '@/hooks/use-formatters';
import { MONTHS, type TimeFilterState } from '@/hooks/use-time-filter';

/**
 * Human label for the active time filter: the full month name when scoped to a
 * single month (e.g. "July"), or the year when in "all" mode (e.g. "2026").
 *
 * Centralizes the month/year formatting so screens and the category filter
 * share one source of truth instead of each formatting dates inline.
 */
export function usePeriodLabel(state: TimeFilterState, now: Date): string {
  const { monthName } = useFormatters();
  return useMemo(() => {
    const year = state.years[0] ?? now.getFullYear();
    if (state.all) return String(year);
    const monthKey = state.months[0] ?? MONTHS[now.getMonth()]!;
    return monthName(MONTHS.indexOf(monthKey), 'long');
  }, [state, now, monthName]);
}
