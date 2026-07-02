/**
 * Pure time-filter types, constants, and state helpers — no React, no native
 * modules. Split out from `use-time-filter.ts` so the data layer (and its unit
 * tests) can import `MONTHS`/`Month`/`TimeFilterState` without transitively
 * pulling in `use-persisted-state` → Sentry/env, which can't load outside Metro.
 * `use-time-filter.ts` re-exports the public names, so existing consumers are
 * unaffected.
 */

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

export const DEFAULT_TIME_FILTER_KEY = 'time-filter:v2';

export function currentMonth(now: Date): Month {
  return MONTHS[now.getMonth()]!;
}

export function defaultTimeFilterState(now: Date = new Date()): TimeFilterState {
  return {
    years: [now.getFullYear()],
    months: [currentMonth(now)],
    all: false,
  };
}

export function normalizeTimeFilterState(state: TimeFilterState, now: Date): TimeFilterState {
  const firstYear = state.years?.[0];
  const years = firstYear !== undefined ? [firstYear] : [now.getFullYear()];
  if (state.all) return { years, months: [], all: true };
  const firstMonth = state.months?.[0];
  const months: Month[] = [firstMonth ?? currentMonth(now)];
  return { years, months, all: false };
}
