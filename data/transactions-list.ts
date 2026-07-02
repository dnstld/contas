import { aggregate, inMonth, inYear } from '@/data/finance-aggregations';
import { txDate, type Finance, type Transaction } from '@/data/finance-types';
import { MONTHS, type TimeFilterState } from '@/hooks/use-time-filter-state';
import { formatDate } from '@/utils/format';

export interface TransactionsSection {
  /** Stable per-day identifier (e.g. "2026-4-30"). Same data → same key. */
  dayKey: string;
  /** Representative date for this day, used by the labeler for formatting. */
  date: Date;
  data: Transaction[];
}

export interface TransactionsTotals {
  income: number;
  expenses: number;
  net: number;
}

export interface TransactionsListResult {
  sections: TransactionsSection[];
  totals: TransactionsTotals;
  count: number;
}

export interface DateLabels {
  today: string;
  yesterday: string;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Groups transactions into per-day sections. The `now` argument is only used
 * to fill missing year/month in the filter — it does NOT affect section
 * labels. Labels are rendered separately via {@link makeSectionLabeler} so
 * they stay correct against real current time without re-running this.
 */
export function buildTransactionsList(
  finance: Finance,
  filter: TimeFilterState,
  now: Date,
): TransactionsListResult {
  const year = filter.years[0] ?? now.getFullYear();
  const monthKey = filter.all ? undefined : (filter.months[0] ?? MONTHS[now.getMonth()]);
  const monthIndex = monthKey ? MONTHS.indexOf(monthKey) : undefined;

  const inPeriod = (d: Date): boolean =>
    monthIndex !== undefined ? inMonth(d, year, monthIndex) : inYear(d, year);
  const agg = aggregate(finance.transactions, inPeriod);

  const filtered: { tx: Transaction; date: Date }[] = [];
  for (const tx of finance.transactions) {
    if (tx.status !== 'completed') continue;
    const date = txDate(tx);
    if (!inPeriod(date)) continue;
    filtered.push({ tx, date });
  }

  filtered.sort((a, b) => b.date.getTime() - a.date.getTime());

  const sections: TransactionsSection[] = [];
  let current: TransactionsSection | null = null;

  for (const { tx, date } of filtered) {
    const key = dayKey(date);
    if (!current || current.dayKey !== key) {
      current = { dayKey: key, date, data: [tx] };
      sections.push(current);
    } else {
      current.data.push(tx);
    }
  }

  return {
    sections,
    totals: { income: agg.income, expenses: agg.expenses, net: agg.net },
    count: filtered.length,
  };
}

/**
 * Returns a function that maps a section to its display label. Call this at
 * render time with `new Date()` so HOJE/ONTEM track real current time —
 * sections themselves stay cached and stable.
 */
export function makeSectionLabeler(now: Date, locale: string, labels: DateLabels) {
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayKey = dayKey(today);
  const yesterdayKey = dayKey(yesterday);
  const currentYear = today.getFullYear();

  return (section: Pick<TransactionsSection, 'dayKey' | 'date'>): string => {
    if (section.dayKey === todayKey) return labels.today;
    if (section.dayKey === yesterdayKey) return labels.yesterday;
    return section.date.getFullYear() === currentYear
      ? formatDate(section.date, locale, { day: 'numeric', month: 'long' })
      : formatDate(section.date, locale, { day: 'numeric', month: 'long', year: 'numeric' });
  };
}
