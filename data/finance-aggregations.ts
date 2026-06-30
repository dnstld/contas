import { type CategoryCardData } from '@/components/ui/organisms/category-card';
import { type DailyTimelinePoint } from '@/components/ui/organisms/daily-timeline';
import { type MonthlyTimelinePoint } from '@/components/ui/organisms/monthly-timeline';
import { MONTHS, type Month, type TimeFilterState } from '@/hooks/use-time-filter';

import { transactionDate, type Category, type Finance, type Transaction } from './finance-types';

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
  /** Max `updatedAt` across the wallet's transactions; undefined when the wallet is empty. */
  lastUpdatedAt?: string;
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

function monthFormatter(locale: string): (monthIndex: number) => string {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'long' });
  return (monthIndex: number) => fmt.format(new Date(2024, monthIndex, 1));
}

function txDate(t: Transaction): Date | null {
  return new Date(transactionDate(t));
}

function isCompletedExpense(t: Transaction): boolean {
  return t.status === 'completed' && t.type === 'expense';
}

function isCompletedIncome(t: Transaction): boolean {
  return t.status === 'completed' && t.type === 'income';
}

function inMonth(d: Date, year: number, month: number): boolean {
  return d.getFullYear() === year && d.getMonth() === month;
}

function inYear(d: Date, year: number): boolean {
  return d.getFullYear() === year;
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
  // Max `updatedAt` across the wallet's transactions; undefined when empty.
  lastUpdatedAt?: string;
}

// Single pass replacing the former `yearActiveCategoryIds` / `usedCategoryIds` /
// `lastUpdatedAt` helpers, which each scanned the full transaction set.
function scanFinance(mock: Finance, year: number): FinanceScan {
  const yearActiveIds = new Set<string>();
  const usedIds = new Set<string>();
  let lastUpdatedAt: string | undefined;
  for (const t of mock.transactions) {
    usedIds.add(t.categoryId);
    if (lastUpdatedAt === undefined || t.updatedAt > lastUpdatedAt) lastUpdatedAt = t.updatedAt;
    if (t.status !== 'completed') continue;
    const d = txDate(t);
    if (d && d.getFullYear() === year) yearActiveIds.add(t.categoryId);
  }
  return { yearActiveIds, usedIds, lastUpdatedAt };
}

function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
}

function safePct(delta: number, base: number): number | undefined {
  if (base === 0) return undefined;
  return delta / base;
}

interface CategoryBucket {
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
    if (!d) continue;
    if (inYear(d, year)) monthExpense[d.getMonth()]! += t.amount;
    else if (inYear(d, prevYear)) prevMonthExpense[d.getMonth()]! += t.amount;
  }

  const lastMonthIdx = year === now.getFullYear() ? now.getMonth() : MONTHS.length - 1;
  return MONTHS.slice(0, lastMonthIdx + 1).map((monthKey, idx) => {
    const value = monthExpense[idx] ?? 0;
    const previous = prevMonthExpense[idx] ?? 0;
    return { month: monthKey, value, delta: value - previous };
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
    if (!d) continue;
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
  const fmtMonth = monthFormatter(locale);
  const monthLabel = `${fmtMonth(month)} ${year}`;

  const prev = previousMonth(year, month);
  const prevMonthLabel = fmtMonth(prev.month);

  let monthExpenses = 0;
  let monthRevenue = 0;
  let prevExpenses = 0;
  let prevRevenue = 0;

  const current = bucketKey();
  const previousBucket = bucketKey();
  for (const c of mock.categories) {
    current[c.id] = emptyBucket();
    previousBucket[c.id] = emptyBucket();
  }

  for (const t of mock.transactions) {
    if (t.status !== 'completed') continue;
    const d = txDate(t);
    if (!d) continue;

    if (inMonth(d, year, month)) {
      if (isCompletedExpense(t)) monthExpenses += t.amount;
      else if (isCompletedIncome(t)) monthRevenue += t.amount;
      const bucket = current[t.categoryId];
      if (bucket) {
        if (t.type === 'expense') bucket.expense += t.amount;
        else bucket.revenue += t.amount;
        bucket.count += 1;
      }
    } else if (inMonth(d, prev.year, prev.month)) {
      if (isCompletedExpense(t)) prevExpenses += t.amount;
      else if (isCompletedIncome(t)) prevRevenue += t.amount;
      const bucket = previousBucket[t.categoryId];
      if (bucket) {
        if (t.type === 'expense') bucket.expense += t.amount;
        else bucket.revenue += t.amount;
      }
    }
  }

  const hasPrevMonthData = prevExpenses > 0 || prevRevenue > 0;

  const overview: DashboardOverviewData = {
    mode: 'month',
    primaryLabel: monthLabel,
    primaryValue: monthExpenses,
    comparisonLabel: hasPrevMonthData ? prevMonthLabel : undefined,
    previousExpenses: hasPrevMonthData ? prevExpenses : undefined,
    previousRevenue: hasPrevMonthData ? prevRevenue : undefined,
    revenue: monthRevenue,
    expenses: monthExpenses,
    net: monthRevenue - monthExpenses,
    dailyTimeline: buildDailyTimeline(mock, year, month, now),
  };

  const visibleCategories = mock.categories.filter((c) =>
    isCategoryVisibleInYear(c, year, yearActiveIds, usedIds),
  );
  const categories = visibleCategories.map((c) =>
    toCardData(
      c,
      current[c.id] ?? emptyBucket(),
      previousBucket[c.id] ?? emptyBucket(),
      monthExpenses,
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

  let yearExpenses = 0;
  let yearRevenue = 0;
  let prevYearExpenses = 0;
  let prevYearRevenue = 0;

  const current = bucketKey();
  const previous = bucketKey();
  for (const c of mock.categories) {
    current[c.id] = emptyBucket();
    previous[c.id] = emptyBucket();
  }

  for (const t of mock.transactions) {
    if (t.status !== 'completed') continue;
    const d = txDate(t);
    if (!d) continue;

    if (inYear(d, year)) {
      if (isCompletedExpense(t)) yearExpenses += t.amount;
      else if (isCompletedIncome(t)) yearRevenue += t.amount;
      const bucket = current[t.categoryId];
      if (bucket) {
        if (t.type === 'expense') bucket.expense += t.amount;
        else bucket.revenue += t.amount;
        bucket.count += 1;
      }
    } else if (inYear(d, prevYear)) {
      if (isCompletedExpense(t)) prevYearExpenses += t.amount;
      else if (isCompletedIncome(t)) prevYearRevenue += t.amount;
      const bucket = previous[t.categoryId];
      if (bucket) {
        if (t.type === 'expense') bucket.expense += t.amount;
        else bucket.revenue += t.amount;
      }
    }
  }

  const timeline = buildYearTimeline(mock, year, now);

  const hasPrevYear = mock.years.includes(prevYear);

  const overview: DashboardOverviewData = {
    mode: 'year',
    primaryLabel: yearLabel,
    primaryValue: yearExpenses,
    comparisonLabel: hasPrevYear ? prevYearLabel : undefined,
    previousExpenses: hasPrevYear ? prevYearExpenses : undefined,
    previousRevenue: hasPrevYear ? prevYearRevenue : undefined,
    revenue: yearRevenue,
    expenses: yearExpenses,
    net: yearRevenue - yearExpenses,
    timeline,
    currentMonth: year === now.getFullYear() ? MONTHS[now.getMonth()]! : undefined,
  };

  const visibleCategories = mock.categories.filter((c) =>
    isCategoryVisibleInYear(c, year, yearActiveIds, usedIds),
  );
  const categories = visibleCategories.map((c) =>
    toCardData(
      c,
      current[c.id] ?? emptyBucket(),
      previous[c.id] ?? emptyBucket(),
      yearExpenses,
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
  const { yearActiveIds, usedIds, lastUpdatedAt } = scanFinance(mock, year);
  const base = filter.all
    ? buildYearMode(mock, year, now, yearActiveIds, usedIds)
    : (() => {
        const monthKey: Month = filter.months[0] ?? MONTHS[now.getMonth()]!;
        const month = MONTHS.indexOf(monthKey);
        return buildMonthMode(mock, year, month, now, locale, yearActiveIds, usedIds);
      })();
  return {
    ...base,
    overview: { ...base.overview, lastUpdatedAt },
  };
}
