import { type CategoryCardData } from '@/components/ui/organisms/category-card';
import { type MonthlyTimelinePoint } from '@/components/ui/organisms/monthly-timeline';
import { MONTHS, type Month, type TimeFilterState } from '@/hooks/use-time-filter';

import type { Category, Finance, Transaction } from './finance-types';

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
  // Year mode only:
  timeline?: MonthlyTimelinePoint[];
  currentMonth?: Month;
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
  if (!t.date) return null;
  return new Date(t.date);
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
): boolean {
  if (activeIds.has(category.id)) return true;
  if (category.createdAt && new Date(category.createdAt).getFullYear() === year) {
    return true;
  }
  return false;
}

function yearActiveCategoryIds(mock: Finance, year: number): Set<string> {
  const ids = new Set<string>();
  for (const t of mock.transactions) {
    if (t.status !== 'completed') continue;
    const d = txDate(t);
    if (!d) continue;
    if (d.getFullYear() === year) ids.add(t.categoryId);
  }
  return ids;
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
): CategoryCardData {
  const total = category.type === 'income' ? current.revenue : current.expense;
  const previousTotal = category.type === 'income' ? previous.revenue : previous.expense;
  const delta = total - previousTotal;

  return {
    id: category.id,
    name: category.name,
    total,
    percentage: totalDenominator > 0 ? current.expense / totalDenominator : 0,
    budget,
    delta,
    deltaPercentage: safePct(delta, previousTotal),
    revenue: current.revenue,
    entryCount: current.count,
    kind: category.type,
    previousValue: previousTotal,
    previousLabel,
  };
}

function buildMonthMode(mock: Finance, year: number, month: number, locale: string): DashboardData {
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

  const overview: DashboardOverviewData = {
    mode: 'month',
    primaryLabel: monthLabel,
    primaryValue: monthExpenses,
    comparisonLabel: prevMonthLabel,
    previousExpenses: prevExpenses,
    previousRevenue: prevRevenue,
    revenue: monthRevenue,
    expenses: monthExpenses,
    net: monthRevenue - monthExpenses,
  };

  const yearActive = yearActiveCategoryIds(mock, year);
  const expenseCategories = mock.categories.filter(
    (c) => c.type === 'expense' && isCategoryVisibleInYear(c, year, yearActive),
  );
  const categories = expenseCategories.map((c) =>
    toCardData(
      c,
      current[c.id],
      previousBucket[c.id],
      monthExpenses,
      c.monthlyBudget,
      prevMonthLabel,
    ),
  );

  return {
    mode: 'month',
    overview,
    categories,
    filterItems: expenseCategories.map((c) => ({ id: c.id, label: c.name })),
  };
}

function buildYearMode(mock: Finance, year: number, now: Date): DashboardData {
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

  // Per-month expense totals for the selected year (for the timeline).
  const monthExpense = new Array<number>(12).fill(0);
  // Same for previous year, used for monthly delta in the timeline.
  const prevMonthExpense = new Array<number>(12).fill(0);

  for (const t of mock.transactions) {
    if (t.status !== 'completed') continue;
    const d = txDate(t);
    if (!d) continue;

    if (inYear(d, year)) {
      if (isCompletedExpense(t)) {
        yearExpenses += t.amount;
        monthExpense[d.getMonth()] += t.amount;
      } else if (isCompletedIncome(t)) {
        yearRevenue += t.amount;
      }
      const bucket = current[t.categoryId];
      if (bucket) {
        if (t.type === 'expense') bucket.expense += t.amount;
        else bucket.revenue += t.amount;
        bucket.count += 1;
      }
    } else if (inYear(d, prevYear)) {
      if (isCompletedExpense(t)) {
        prevYearExpenses += t.amount;
        prevMonthExpense[d.getMonth()] += t.amount;
      } else if (isCompletedIncome(t)) {
        prevYearRevenue += t.amount;
      }
      const bucket = previous[t.categoryId];
      if (bucket) {
        if (t.type === 'expense') bucket.expense += t.amount;
        else bucket.revenue += t.amount;
      }
    }
  }

  const timeline: MonthlyTimelinePoint[] = MONTHS.map((monthKey, idx) => ({
    month: monthKey,
    value: monthExpense[idx],
    delta: monthExpense[idx] - prevMonthExpense[idx],
  })).filter((p) => p.value > 0 || p.delta !== 0);

  const overview: DashboardOverviewData = {
    mode: 'year',
    primaryLabel: yearLabel,
    primaryValue: yearExpenses,
    comparisonLabel: prevYearLabel,
    previousExpenses: prevYearExpenses,
    previousRevenue: prevYearRevenue,
    revenue: yearRevenue,
    expenses: yearExpenses,
    net: yearRevenue - yearExpenses,
    timeline,
    currentMonth: year === now.getFullYear() ? MONTHS[now.getMonth()] : undefined,
  };

  const yearActive = yearActiveCategoryIds(mock, year);
  const expenseCategories = mock.categories.filter(
    (c) => c.type === 'expense' && isCategoryVisibleInYear(c, year, yearActive),
  );
  const categories = expenseCategories.map((c) =>
    toCardData(c, current[c.id], previous[c.id], yearExpenses, undefined, prevYearLabel),
  );

  return {
    mode: 'year',
    overview,
    categories,
    filterItems: expenseCategories.map((c) => ({ id: c.id, label: c.name })),
  };
}

export function buildDashboard(
  mock: Finance,
  filter: TimeFilterState,
  now: Date = new Date(),
  locale: string = 'en',
): DashboardData {
  const year = filter.years[0] ?? now.getFullYear();

  if (filter.all) return buildYearMode(mock, year, now);

  const monthKey = filter.months[0] ?? MONTHS[now.getMonth()];
  const month = MONTHS.indexOf(monthKey);
  return buildMonthMode(mock, year, month, locale);
}
