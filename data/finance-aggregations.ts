import { type CategoryCardData } from '@/components/ui/organisms/category-card';
import { type DailyTimelinePoint } from '@/components/ui/organisms/daily-timeline';
import { type MonthlyTimelinePoint } from '@/components/ui/organisms/monthly-timeline';
import { MONTHS, type Month, type TimeFilterState } from '@/hooks/use-time-filter-state';
import { monthName } from '@/utils/format';

import {
  parseDayStart,
  toDayString,
  transactionDate,
  txDate,
  type Category,
  type CategoryItem,
  type Finance,
  type RecurringRecurrence,
  type Transaction,
  type TransactionType,
} from './finance-types';

export type DashboardMode = 'month' | 'year';

export interface DashboardOverviewData {
  mode: DashboardMode;
  primaryLabel: string;
  primaryValue: number;
  comparisonLabel?: string;
  // Previous-period totals for each lens (used to compute per-lens deltas in the Overview).
  previousExpenses?: number;
  previousRevenue?: number;
  revenue?: number;
  expenses?: number;
  net?: number;
  /**
   * ISO date of the most recent *transaction* (its `occurred_at`), used for the
   * card's "Last update" line. This is the newest completed, non-future
   * transaction — the date a user perceives as "last activity" — not the
   * database write timestamp (`updated_at`). Undefined when the wallet has no
   * such transaction.
   */
  lastActivityAt?: string;
  // Months strip (year mode):
  timeline?: MonthlyTimelinePoint[];
  /** Anchors the strip ordering (current-month-first); undefined for past years. */
  currentMonth?: Month;
  // Per-day spend strip (month mode), newest day first:
  dailyTimeline?: DailyTimelinePoint[];
}

export interface DashboardData {
  mode: DashboardMode;
  overview: DashboardOverviewData;
  categories: CategoryCardData[];
  filterItems: { id: string; label: string }[];
}

function isCompletedExpense(t: Transaction): boolean {
  return t.status === 'completed' && t.type === 'expense';
}

export function inMonth(d: Date, year: number, month: number): boolean {
  return d.getFullYear() === year && d.getMonth() === month;
}

export function inYear(d: Date, year: number): boolean {
  return d.getFullYear() === year;
}

/** How many most-used categories are surfaced as quick-select shortcuts
 * (the transaction form's chip row, and the "Most used" group in the
 * category picker). */
export const MOST_USED_CATEGORIES_LIMIT = 5;

export interface CategoryUsageRanking {
  /** Categories of this type with at least one transaction, ordered by usage
   * count (most-used first, ties broken alphabetically), capped at
   * MOST_USED_CATEGORIES_LIMIT. */
  mostUsed: Category[];
  /** Every other category of this type — unused, or used but past the
   * mostUsed cut — ordered the same way (usage count desc, then alphabetical). */
  rest: Category[];
}

/**
 * Single source of truth for "usage order" across the transaction form's
 * quick-select chips and the category picker's "Most used" / "All
 * categories" groups, so both surfaces always agree on the same ranking.
 */
export function rankCategoriesByUsage(
  categories: Category[],
  transactions: Transaction[],
  type: TransactionType,
): CategoryUsageRanking {
  const counts = new Map<string, number>();
  for (const tx of transactions) {
    counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1);
  }

  const ranked = categories
    .filter((c) => c.type === type)
    .slice()
    .sort((a, b) => {
      const diff = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

  const mostUsed = ranked
    .filter((c) => (counts.get(c.id) ?? 0) > 0)
    .slice(0, MOST_USED_CATEGORIES_LIMIT);
  const mostUsedIds = new Set(mostUsed.map((c) => c.id));
  const rest = ranked.filter((c) => !mostUsedIds.has(c.id));

  return { mostUsed, rest };
}

/** How many curated category items are surfaced as quick-select shortcuts under
 * the transaction form's "What for" field once a category is selected. */
export const MOST_USED_DESCRIPTIONS_LIMIT = 5;

/**
 * The curated items for a category, ordered "most used first" — by the count of
 * transactions linked to each item (`categoryItemId`), with an alphabetical
 * tiebreak — so the "What for" field suggests only user-curated items, not text
 * derived from history. Archived items are excluded. Returns at most `limit`.
 */
export function rankItemsForCategory(
  items: CategoryItem[],
  transactions: Transaction[],
  categoryId: string,
  limit: number = MOST_USED_DESCRIPTIONS_LIMIT,
): CategoryItem[] {
  const usageByItem = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.categoryItemId == null) continue;
    usageByItem.set(tx.categoryItemId, (usageByItem.get(tx.categoryItemId) ?? 0) + 1);
  }

  return items
    .filter((it) => it.categoryId === categoryId && !it.archivedAt)
    .sort((a, b) => {
      const diff = (usageByItem.get(b.id) ?? 0) - (usageByItem.get(a.id) ?? 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

function isCategoryVisibleInYear(
  category: Category,
  year: number,
  activeIds: Set<string>,
  usedIds: Set<string>,
): boolean {
  // Categories with no transactions anywhere always show, so a freshly created
  // category is visible immediately in any selected period (not just its
  // creation year).
  if (!usedIds.has(category.id)) return true;
  if (activeIds.has(category.id)) return true;
  if (category.createdAt && new Date(category.createdAt).getFullYear() === year) {
    return true;
  }
  return false;
}

interface FinanceScan {
  // Categories with a completed transaction in `year`.
  yearActiveIds: Set<string>;
  // Categories referenced by at least one transaction (any year/status). Used to
  // distinguish brand-new/unused categories, which are always shown.
  usedIds: Set<string>;
  // ISO date of the newest completed, non-future transaction (its `occurred_at`);
  // undefined when the wallet has none. Drives the card's "Last update" label.
  lastActivityAt?: string;
}

// Single pass replacing the former `yearActiveCategoryIds` / `usedCategoryIds` /
// `lastActivityAt` helpers, which each scanned the full transaction set.
function scanFinance(mock: Finance, year: number, now: Date): FinanceScan {
  const yearActiveIds = new Set<string>();
  const usedIds = new Set<string>();
  const nowMs = now.getTime();
  let lastActivityAt: string | undefined;
  let lastActivityMs = -Infinity;
  for (const t of mock.transactions) {
    usedIds.add(t.categoryId);
    if (t.status !== 'completed') continue;
    const d = txDate(t);
    const ms = d.getTime();
    // "Last update" reflects the most recent activity the user actually
    // recorded, so use the transaction's own date (`occurred_at`) — not the DB
    // write timestamp — and ignore future-dated rows so a post-dated entry
    // can't make the label read a date that hasn't happened yet.
    if (!Number.isNaN(ms) && ms <= nowMs && ms > lastActivityMs) {
      lastActivityMs = ms;
      lastActivityAt = transactionDate(t);
    }
    if (d.getFullYear() === year) yearActiveIds.add(t.categoryId);
  }
  return { yearActiveIds, usedIds, lastActivityAt };
}

function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
}

function safePct(delta: number, base: number): number | undefined {
  if (base === 0) return undefined;
  return delta / base;
}

export interface CategoryBucket {
  expense: number;
  revenue: number;
  count: number;
}

function emptyBucket(): CategoryBucket {
  return { expense: 0, revenue: 0, count: 0 };
}

function bucketKey(): Record<string, CategoryBucket> {
  return Object.create(null);
}

export interface PeriodAggregate {
  income: number;
  expenses: number;
  net: number;
  count: number;
  byCategory: Record<string, CategoryBucket>;
}

/**
 * Single-pass classification + summation of completed transactions within a
 * period. The one place that decides what counts as "completed income" /
 * "completed expense" for period totals — every period-summing caller goes
 * through this so the classification never gets re-inlined and drifts.
 */
export function aggregate(
  transactions: Transaction[],
  inPeriod: (d: Date) => boolean,
): PeriodAggregate {
  let income = 0;
  let expenses = 0;
  let count = 0;
  const byCategory = bucketKey();

  for (const t of transactions) {
    if (t.status !== 'completed') continue;
    const d = txDate(t);
    if (!inPeriod(d)) continue;

    count += 1;
    const bucket = (byCategory[t.categoryId] ??= emptyBucket());
    if (t.type === 'expense') {
      expenses += t.amount;
      bucket.expense += t.amount;
    } else {
      income += t.amount;
      bucket.revenue += t.amount;
    }
    bucket.count += 1;
  }

  return { income, expenses, net: income - expenses, count, byCategory };
}

function toCardData(
  category: Category,
  current: CategoryBucket,
  previous: CategoryBucket,
  totalDenominator: number,
  budget: number | undefined,
  previousLabel: string,
  // When the previous period has no data (e.g. no past year), omit the
  // comparison so the card doesn't render a "vs 2025: 0" row.
  hasPrevious: boolean,
): CategoryCardData {
  const total = category.type === 'income' ? current.revenue : current.expense;
  const previousTotal = category.type === 'income' ? previous.revenue : previous.expense;
  const delta = total - previousTotal;

  return {
    id: category.id,
    name: category.name,
    total,
    // Percentage is the category's share of total expenses; it's meaningless for
    // income categories, so omit it there.
    percentage:
      category.type === 'income'
        ? undefined
        : totalDenominator > 0
          ? current.expense / totalDenominator
          : 0,
    budget,
    delta: hasPrevious ? delta : undefined,
    deltaPercentage: hasPrevious ? safePct(delta, previousTotal) : undefined,
    revenue: current.revenue,
    entryCount: current.count,
    kind: category.type,
    previousValue: hasPrevious ? previousTotal : undefined,
    previousLabel: hasPrevious ? previousLabel : undefined,
  };
}

// Per-month expense totals for the selected year, shaped for the timeline strip.
// Months run Jan→ but are truncated to the current month for the in-progress
// (current) year; past years show all twelve. `delta` compares each month
// against the same month of the previous year.
function buildYearTimeline(mock: Finance, year: number, now: Date): MonthlyTimelinePoint[] {
  const prevYear = year - 1;
  const monthExpense = new Array<number>(12).fill(0);
  const prevMonthExpense = new Array<number>(12).fill(0);

  for (const t of mock.transactions) {
    if (!isCompletedExpense(t)) continue;
    const d = txDate(t);
    if (inYear(d, year)) monthExpense[d.getMonth()]! += t.amount;
    else if (inYear(d, prevYear)) prevMonthExpense[d.getMonth()]! += t.amount;
  }

  const lastMonthIdx = year === now.getFullYear() ? now.getMonth() : MONTHS.length - 1;
  return MONTHS.slice(0, lastMonthIdx + 1).map((monthKey, idx) => {
    const value = monthExpense[idx] ?? 0;
    const previous = prevMonthExpense[idx] ?? 0;
    const delta = value - previous;
    return { month: monthKey, value, delta, deltaPercentage: safePct(delta, previous) };
  });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isoDay(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Per-day expense totals for the selected month, newest day first. For the
// current month the strip stops at today; past months show every day.
function buildDailyTimeline(
  mock: Finance,
  year: number,
  month: number,
  now: Date,
): DailyTimelinePoint[] {
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const lastDay = isCurrentMonth ? now.getDate() : daysInMonth(year, month);

  const dayExpense = new Array<number>(lastDay + 1).fill(0);
  const dayCount = new Array<number>(lastDay + 1).fill(0);
  for (const t of mock.transactions) {
    if (!isCompletedExpense(t)) continue;
    const d = txDate(t);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (day >= 1 && day <= lastDay) {
        dayExpense[day]! += t.amount;
        dayCount[day]! += 1;
      }
    }
  }

  const points: DailyTimelinePoint[] = [];
  for (let day = lastDay; day >= 1; day--) {
    points.push({
      date: isoDay(year, month, day),
      value: dayExpense[day] ?? 0,
      count: dayCount[day] ?? 0,
      current: isCurrentMonth && day === now.getDate(),
    });
  }
  return points;
}

function buildMonthMode(
  mock: Finance,
  year: number,
  month: number,
  now: Date,
  locale: string,
  yearActiveIds: Set<string>,
  usedIds: Set<string>,
): DashboardData {
  const monthLabel = `${monthName(month, locale)} ${year}`;

  const prev = previousMonth(year, month);
  const prevMonthLabel = monthName(prev.month, locale);

  const cur = aggregate(mock.transactions, (d) => inMonth(d, year, month));
  const prevAgg = aggregate(mock.transactions, (d) => inMonth(d, prev.year, prev.month));

  const hasPrevMonthData = prevAgg.expenses > 0 || prevAgg.income > 0;

  const overview: DashboardOverviewData = {
    mode: 'month',
    primaryLabel: monthLabel,
    primaryValue: cur.expenses,
    comparisonLabel: hasPrevMonthData ? prevMonthLabel : undefined,
    previousExpenses: hasPrevMonthData ? prevAgg.expenses : undefined,
    previousRevenue: hasPrevMonthData ? prevAgg.income : undefined,
    revenue: cur.income,
    expenses: cur.expenses,
    net: cur.net,
    dailyTimeline: buildDailyTimeline(mock, year, month, now),
  };

  const visibleCategories = mock.categories.filter((c) =>
    isCategoryVisibleInYear(c, year, yearActiveIds, usedIds),
  );
  const categories = visibleCategories.map((c) =>
    toCardData(
      c,
      cur.byCategory[c.id] ?? emptyBucket(),
      prevAgg.byCategory[c.id] ?? emptyBucket(),
      cur.expenses,
      c.monthlyBudget,
      prevMonthLabel,
      hasPrevMonthData,
    ),
  );

  return {
    mode: 'month',
    overview,
    categories,
    filterItems: visibleCategories.map((c) => ({ id: c.id, label: c.name })),
  };
}

function buildYearMode(
  mock: Finance,
  year: number,
  now: Date,
  yearActiveIds: Set<string>,
  usedIds: Set<string>,
): DashboardData {
  const yearLabel = String(year);
  const prevYear = year - 1;
  const prevYearLabel = String(prevYear);

  const cur = aggregate(mock.transactions, (d) => inYear(d, year));
  const prevAgg = aggregate(mock.transactions, (d) => inYear(d, prevYear));

  const timeline = buildYearTimeline(mock, year, now);

  const hasPrevYear = mock.years.includes(prevYear);

  const overview: DashboardOverviewData = {
    mode: 'year',
    primaryLabel: yearLabel,
    primaryValue: cur.expenses,
    comparisonLabel: hasPrevYear ? prevYearLabel : undefined,
    previousExpenses: hasPrevYear ? prevAgg.expenses : undefined,
    previousRevenue: hasPrevYear ? prevAgg.income : undefined,
    revenue: cur.income,
    expenses: cur.expenses,
    net: cur.net,
    timeline,
    currentMonth: year === now.getFullYear() ? MONTHS[now.getMonth()]! : undefined,
  };

  const visibleCategories = mock.categories.filter((c) =>
    isCategoryVisibleInYear(c, year, yearActiveIds, usedIds),
  );
  const categories = visibleCategories.map((c) =>
    toCardData(
      c,
      cur.byCategory[c.id] ?? emptyBucket(),
      prevAgg.byCategory[c.id] ?? emptyBucket(),
      cur.expenses,
      undefined,
      prevYearLabel,
      hasPrevYear,
    ),
  );

  return {
    mode: 'year',
    overview,
    categories,
    filterItems: visibleCategories.map((c) => ({ id: c.id, label: c.name })),
  };
}

export function buildDashboard(
  mock: Finance,
  filter: TimeFilterState,
  now: Date = new Date(),
  locale: string = 'en',
): DashboardData {
  const year = filter.years[0] ?? now.getFullYear();
  const { yearActiveIds, usedIds, lastActivityAt } = scanFinance(mock, year, now);
  const base = filter.all
    ? buildYearMode(mock, year, now, yearActiveIds, usedIds)
    : (() => {
        const monthKey: Month = filter.months[0] ?? MONTHS[now.getMonth()]!;
        const month = MONTHS.indexOf(monthKey);
        return buildMonthMode(mock, year, month, now, locale, yearActiveIds, usedIds);
      })();
  return {
    ...base,
    overview: { ...base.overview, lastActivityAt },
  };
}

// ---------------------------------------------------------------------------
// Upcoming forecast (calendar-driven)
// ---------------------------------------------------------------------------

/** A single projected charge for a recurring item, within the forecast window. */
export interface UpcomingOccurrence {
  item: CategoryItem;
  dueOn: string; // 'YYYY-MM-DD'
}

/**
 * Roll a recurrence anchor forward to the first occurrence on or after `from`.
 * All arithmetic goes through local-midnight `Date`s (via `parseDayStart` /
 * plain `Date(y, m, d)`), never `new Date('YYYY-MM-DD')`, so the calendar day
 * is stable across timezones. Returns a `YYYY-MM-DD` string.
 *
 * - `daily`: the anchor if it's already ≥ `from`, otherwise `from` itself.
 * - `weekly`: step +7 days from the anchor until ≥ `from` (preserves weekday).
 * - `monthly`: step whole months, clamping the anchor's day-of-month to the
 *   target month's length (e.g. day 31 → Feb 28/29). Clamping is recomputed
 *   from the original day each step, so a short month doesn't shrink later ones.
 * - `yearly`: step whole years, clamping Feb 29 → Feb 28 on non-leap years.
 */
export function nextOccurrenceOnOrAfter(
  anchor: string,
  recurrence: RecurringRecurrence,
  from: Date,
): string {
  const a = parseDayStart(anchor);
  const fromTime = from.getTime();

  switch (recurrence) {
    case 'daily':
      return a.getTime() >= fromTime ? toDayString(a) : toDayString(from);

    case 'weekly': {
      let cand = a;
      while (cand.getTime() < fromTime) {
        cand = new Date(cand.getFullYear(), cand.getMonth(), cand.getDate() + 7);
      }
      return toDayString(cand);
    }

    case 'monthly': {
      const day = a.getDate();
      let year = a.getFullYear();
      let month = a.getMonth();
      const candidate = () => new Date(year, month, Math.min(day, daysInMonth(year, month)));
      let cand = candidate();
      while (cand.getTime() < fromTime) {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
        cand = candidate();
      }
      return toDayString(cand);
    }

    case 'yearly': {
      const month = a.getMonth();
      const day = a.getDate();
      let year = a.getFullYear();
      const candidate = () => new Date(year, month, Math.min(day, daysInMonth(year, month)));
      let cand = candidate();
      while (cand.getTime() < fromTime) {
        year += 1;
        cand = candidate();
      }
      return toDayString(cand);
    }
  }
}

/**
 * Project the next upcoming expense charge for each recurring item within a
 * rolling window. Pure and timezone-safe. Considers only non-archived items
 * that recur, carry a `nextDueOn` anchor, and belong to an expense category.
 * Emits one occurrence per item (its next within the window), sorted by due
 * date ascending.
 */
export function buildUpcoming(
  items: CategoryItem[],
  categories: Category[],
  now: Date,
  windowDays = 30,
): UpcomingOccurrence[] {
  const todayStart = parseDayStart(toDayString(now));
  const windowEnd = new Date(
    todayStart.getFullYear(),
    todayStart.getMonth(),
    todayStart.getDate() + windowDays,
  );
  const windowEndStr = toDayString(windowEnd);
  const expenseCategoryIds = new Set(
    categories.filter((c) => c.type === 'expense').map((c) => c.id),
  );

  const out: UpcomingOccurrence[] = [];
  for (const item of items) {
    if (item.archivedAt) continue;
    if (item.recurrence === 'none' || !item.nextDueOn) continue;
    if (!expenseCategoryIds.has(item.categoryId)) continue;
    const dueOn = nextOccurrenceOnOrAfter(item.nextDueOn, item.recurrence, todayStart);
    // Day strings compare lexically, so a plain `<=` bounds the window.
    if (dueOn <= windowEndStr) out.push({ item, dueOn });
  }

  return out.sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0));
}
