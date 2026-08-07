import { describe, expect, it } from 'vitest';

import {
  aggregate,
  buildDashboard,
  inYear,
  rankCategoriesByUsage,
  rankItemsForCategory,
} from '@/data/finance-aggregations';
import type { Category, CategoryItem, Finance, OneOffTransaction } from '@/data/finance-types';
import { buildTransactionsList } from '@/data/transactions-list';
import type { TimeFilterState } from '@/hooks/use-time-filter-state';

const now = new Date('2026-07-15T12:00:00Z');

const categories: Category[] = [
  { id: 'salary', name: 'Salary', type: 'income' },
  { id: 'freelance', name: 'Freelance', type: 'income' },
  { id: 'rent', name: 'Rent', type: 'expense', monthlyBudget: 1000 },
  { id: 'groceries', name: 'Groceries', type: 'expense', monthlyBudget: 400 },
  { id: 'travel', name: 'Travel', type: 'expense', monthlyBudget: 200 }, // no transactions at all
];

function mkTx(
  overrides: Partial<OneOffTransaction> &
    Pick<OneOffTransaction, 'id' | 'date' | 'type' | 'categoryId' | 'categoryName' | 'amount'>,
): OneOffTransaction {
  return {
    kind: 'one-off',
    recurrence: 'none',
    status: 'completed',
    description: '',
    categoryItemId: null,
    createdAt: overrides.date,
    updatedAt: overrides.date,
    createdByUserId: null,
    onBehalfOfUserId: null,
    ...overrides,
  };
}

const t1 = mkTx({
  id: 't1',
  date: '2026-07-05',
  type: 'income',
  categoryId: 'salary',
  categoryName: 'Salary',
  amount: 500,
});
const t2 = mkTx({
  id: 't2',
  date: '2026-07-10',
  type: 'expense',
  categoryId: 'rent',
  categoryName: 'Rent',
  amount: 250,
});
const t3 = mkTx({
  id: 't3',
  date: '2026-07-12',
  type: 'expense',
  categoryId: 'groceries',
  categoryName: 'Groceries',
  amount: 100,
});
const t4 = mkTx({
  id: 't4',
  date: '2026-06-20',
  type: 'income',
  categoryId: 'salary',
  categoryName: 'Salary',
  amount: 500,
});
const t5 = mkTx({
  id: 't5',
  date: '2026-06-22',
  type: 'expense',
  categoryId: 'rent',
  categoryName: 'Rent',
  amount: 250,
});
const t6 = mkTx({
  id: 't6',
  date: '2026-05-15',
  type: 'income',
  categoryId: 'freelance',
  categoryName: 'Freelance',
  amount: 100,
});
const t7 = mkTx({
  id: 't7',
  date: '2026-05-18',
  type: 'expense',
  categoryId: 'groceries',
  categoryName: 'Groceries',
  amount: 100,
});
const t8 = mkTx({
  id: 't8',
  date: '2025-12-31',
  type: 'expense',
  categoryId: 'rent',
  categoryName: 'Rent',
  amount: 250,
});
const t9 = mkTx({
  id: 't9',
  date: '2026-01-01',
  type: 'income',
  categoryId: 'salary',
  categoryName: 'Salary',
  amount: 500,
});
const t10 = mkTx({
  id: 't10',
  date: '2025-06-10',
  type: 'income',
  categoryId: 'salary',
  categoryName: 'Salary',
  amount: 500,
});
const t11 = mkTx({
  id: 't11',
  date: '2025-06-11',
  type: 'expense',
  categoryId: 'groceries',
  categoryName: 'Groceries',
  amount: 100,
});
const t12Scheduled = mkTx({
  id: 't12',
  date: '2026-07-20',
  type: 'expense',
  categoryId: 'rent',
  categoryName: 'Rent',
  amount: 999,
  status: 'scheduled',
});

const transactions: OneOffTransaction[] = [
  t1,
  t2,
  t3,
  t4,
  t5,
  t6,
  t7,
  t8,
  t9,
  t10,
  t11,
  t12Scheduled,
];

const finance: Finance = { years: [2025, 2026], currency: 'USD', categories, transactions };

const yearFilter: TimeFilterState = { years: [2026], months: [], all: true };
const monthFilter: TimeFilterState = { years: [2026], months: ['jul'], all: false };

describe('aggregate() — the displayed values (month mode + year mode)', () => {
  it('1-2: month expenses current + previous', () => {
    const dashboard = buildDashboard(finance, monthFilter, now, 'en');
    expect(dashboard.overview.expenses).toBe(350);
    expect(dashboard.overview.previousExpenses).toBe(250);
  });

  it('3-4: month income current + previous', () => {
    const dashboard = buildDashboard(finance, monthFilter, now, 'en');
    expect(dashboard.overview.revenue).toBe(500);
    expect(dashboard.overview.previousRevenue).toBe(500);
  });

  it('5-6: year expenses current + previous', () => {
    const cur = aggregate(finance.transactions, (d) => inYear(d, 2026));
    const prev = aggregate(finance.transactions, (d) => inYear(d, 2025));
    expect(cur.expenses).toBe(700);
    expect(prev.expenses).toBe(350);
  });

  it('7: year income current + previous, and year net', () => {
    const cur = aggregate(finance.transactions, (d) => inYear(d, 2026));
    const prev = aggregate(finance.transactions, (d) => inYear(d, 2025));
    expect(cur.income).toBe(1600);
    expect(prev.income).toBe(500);
    expect(cur.net).toBe(900);
    expect(cur.net).toBe(cur.income - cur.expenses);
  });

  it('8-9: per-month timeline points (year mode) reflect the fixture', () => {
    const dashboard = buildDashboard(finance, yearFilter, now, 'en');
    const timeline = dashboard.overview.timeline ?? [];

    const may = timeline.find((p) => p.month === 'may');
    const jun = timeline.find((p) => p.month === 'jun');
    const jul = timeline.find((p) => p.month === 'jul');

    expect(may?.value).toBe(100); // t7
    expect(may?.delta).toBe(100); // no May 2025 expense
    expect(jun?.value).toBe(250); // t5
    expect(jun?.delta).toBe(150); // vs 100 (t11, June 2025)
    expect(jul?.value).toBe(350); // t2 + t3
    expect(jul?.delta).toBe(350); // no July 2025 expense
  });

  it('10: per-year total equals the sum of the per-month timeline (== value 1)', () => {
    const dashboard = buildDashboard(finance, yearFilter, now, 'en');
    const timeline = dashboard.overview.timeline ?? [];
    const timelineTotal = timeline.reduce((sum, p) => sum + p.value, 0);

    expect(timelineTotal).toBe(700);
    expect(timelineTotal).toBe(dashboard.overview.expenses);
  });
});

describe('aggregate() — edges', () => {
  it('empty finance: all zeros, no crash', () => {
    const emptyFinance: Finance = { years: [], currency: 'USD', categories: [], transactions: [] };

    const emptyAgg = aggregate(emptyFinance.transactions, () => true);
    expect(emptyAgg).toEqual({ income: 0, expenses: 0, net: 0, count: 0, byCategory: {} });

    for (const filter of [yearFilter, monthFilter]) {
      expect(() => buildDashboard(emptyFinance, filter, now, 'en')).not.toThrow();
      expect(() => buildTransactionsList(emptyFinance, filter, now)).not.toThrow();

      const dashboard = buildDashboard(emptyFinance, filter, now, 'en');
      expect(dashboard.overview.expenses).toBe(0);
      expect(dashboard.overview.revenue).toBe(0);
      expect(dashboard.overview.net).toBe(0);
      expect(dashboard.categories).toEqual([]);

      const list = buildTransactionsList(emptyFinance, filter, now);
      expect(list.sections).toEqual([]);
      expect(list.totals).toEqual({ income: 0, expenses: 0, net: 0 });
      expect(list.count).toBe(0);
    }
  });

  it('scheduled transactions are excluded from every total', () => {
    const scheduledOnly = aggregate([t12Scheduled], () => true);
    expect(scheduledOnly).toEqual({ income: 0, expenses: 0, net: 0, count: 0, byCategory: {} });
  });

  it('year-boundary: Dec 31 vs Jan 1 land in the right year', () => {
    expect(aggregate([t8], (d) => inYear(d, 2025)).expenses).toBe(250);
    expect(aggregate([t8], (d) => inYear(d, 2026)).expenses).toBe(0);

    expect(aggregate([t9], (d) => inYear(d, 2026)).income).toBe(500);
    expect(aggregate([t9], (d) => inYear(d, 2025)).income).toBe(0);
  });

  it('a category with zero transactions in the period has an empty bucket', () => {
    const cur = aggregate(finance.transactions, (d) => inYear(d, 2026));
    expect(cur.byCategory['travel']).toBeUndefined();
    expect(cur.byCategory['travel'] ?? { expense: 0, revenue: 0, count: 0 }).toEqual({
      expense: 0,
      revenue: 0,
      count: 0,
    });
  });

  it('income-only period: expenses zero, net === income', () => {
    const incomeOnly = [t1, t4, t6, t9, t10];
    const result = aggregate(incomeOnly, () => true);
    expect(result.expenses).toBe(0);
    expect(result.income).toBe(2100);
    expect(result.net).toBe(result.income);
  });

  it('expense-only period: income zero, net negative', () => {
    const expenseOnly = [t2, t3, t5, t7, t8, t11];
    const result = aggregate(expenseOnly, () => true);
    expect(result.income).toBe(0);
    expect(result.expenses).toBe(1050);
    expect(result.net).toBe(-1050);
  });

  it('net sign reflects income vs expenses', () => {
    expect(aggregate(finance.transactions, (d) => inYear(d, 2026)).net).toBeGreaterThan(0);
    expect(aggregate([t2, t3, t5, t7, t8, t11], () => true).net).toBeLessThan(0);
  });
});

describe('overview.lastActivityAt — the "Last update" line', () => {
  it('reflects the newest completed transaction date, not the DB write time', () => {
    // t3 (2026-07-12) is the newest *completed* transaction. t12 is scheduled
    // and dated 2026-07-20 (future) — it must not win, so the label reads the
    // real last activity, not a post-dated/scheduled entry.
    const dashboard = buildDashboard(finance, monthFilter, now, 'en');
    expect(dashboard.overview.lastActivityAt).toBe('2026-07-12');
  });

  it('ignores future-dated completed transactions (label never reads the future)', () => {
    const future = mkTx({
      id: 'future',
      date: '2026-08-01', // after `now` (2026-07-15)
      type: 'expense',
      categoryId: 'rent',
      categoryName: 'Rent',
      amount: 10,
    });
    const withFuture: Finance = { ...finance, transactions: [...transactions, future] };
    const dashboard = buildDashboard(withFuture, monthFilter, now, 'en');
    expect(dashboard.overview.lastActivityAt).toBe('2026-07-12');
  });

  it('is undefined when the wallet has no completed transactions', () => {
    const emptyFinance: Finance = { years: [], currency: 'USD', categories: [], transactions: [] };
    const dashboard = buildDashboard(emptyFinance, monthFilter, now, 'en');
    expect(dashboard.overview.lastActivityAt).toBeUndefined();
  });
});

describe('anti-drift consistency: Overview and Transactions must agree', () => {
  it('buildTransactionsList totals === buildDashboard overview for the same (year, month)', () => {
    const list = buildTransactionsList(finance, monthFilter, now);
    const dashboard = buildDashboard(finance, monthFilter, now, 'en');

    expect(list.totals.income).toBe(dashboard.overview.revenue);
    expect(list.totals.expenses).toBe(dashboard.overview.expenses);
    expect(list.totals.net).toBe(dashboard.overview.net);

    expect(list.totals).toEqual({ income: 500, expenses: 350, net: 150 });
  });
});

describe('rankItemsForCategory — "What for" curated item suggestions', () => {
  const mkItem = (
    overrides: Partial<CategoryItem> & Pick<CategoryItem, 'id' | 'name'>,
  ): CategoryItem => ({
    categoryId: 'groceries',
    recurrence: 'none',
    ...overrides,
  });

  // A groceries transaction linked to a given item.
  const linked = (id: string, categoryItemId: string | null) =>
    mkTx({
      id,
      date: '2026-07-01',
      type: 'expense',
      categoryId: 'groceries',
      categoryName: 'Groceries',
      amount: 10,
      categoryItemId,
    });

  it('orders by linked-transaction usage, most-used first', () => {
    const items = [
      mkItem({ id: 'bakery', name: 'Bakery' }),
      mkItem({ id: 'market', name: 'Market' }),
    ];
    const txs = [linked('a', 'market'), linked('b', 'market'), linked('c', 'bakery')];
    expect(rankItemsForCategory(items, txs, 'groceries').map((i) => i.id)).toEqual([
      'market',
      'bakery',
    ]);
  });

  it('breaks usage ties alphabetically by name', () => {
    const items = [mkItem({ id: 'z', name: 'Zucchini' }), mkItem({ id: 'a', name: 'Apple' })];
    // Neither is linked (usage 0) → alphabetical.
    expect(rankItemsForCategory(items, [], 'groceries').map((i) => i.id)).toEqual(['a', 'z']);
  });

  it('excludes archived items', () => {
    const items = [
      mkItem({ id: 'active', name: 'Active' }),
      mkItem({ id: 'archived', name: 'Archived', archivedAt: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(rankItemsForCategory(items, [], 'groceries').map((i) => i.id)).toEqual(['active']);
  });

  it('only considers items in the given category', () => {
    const items = [
      mkItem({ id: 'g', name: 'Groceries item', categoryId: 'groceries' }),
      mkItem({ id: 'r', name: 'Rent item', categoryId: 'rent' }),
    ];
    expect(rankItemsForCategory(items, [], 'groceries').map((i) => i.id)).toEqual(['g']);
    expect(rankItemsForCategory(items, [], 'travel')).toEqual([]);
  });

  it('caps the result at the limit', () => {
    const items = Array.from({ length: 8 }, (_, i) => mkItem({ id: `i${i}`, name: `Item ${i}` }));
    expect(rankItemsForCategory(items, [], 'groceries')).toHaveLength(5);
    expect(rankItemsForCategory(items, [], 'groceries', 3)).toHaveLength(3);
  });
});

describe('archived categories', () => {
  it('rankCategoriesByUsage excludes archived categories', () => {
    const cats: Category[] = [
      { id: 'rent', name: 'Rent', type: 'expense' },
      { id: 'old', name: 'Old', type: 'expense', archivedAt: '2026-06-01T00:00:00.000Z' },
    ];
    const { mostUsed, rest } = rankCategoriesByUsage(cats, [], 'expense');
    const ids = [...mostUsed, ...rest].map((c) => c.id);
    expect(ids).toEqual(['rent']);
  });

  it('shows an archived category (badged) in periods it contributed to, keeping the total reconciled', () => {
    const archivedFinance: Finance = {
      ...finance,
      categories: finance.categories.map((c) =>
        c.id === 'rent' ? { ...c, archivedAt: '2026-06-01T00:00:00.000Z' } : c,
      ),
    };
    const dashboard = buildDashboard(archivedFinance, monthFilter, now, 'en');
    const rentCard = dashboard.categories.find((c) => c.id === 'rent');
    // Rent has a July 2026 transaction, so its card stays visible with the flag.
    expect(rentCard?.archived).toBe(true);
    // Card totals still reconcile with the header (rent 250 + groceries 100).
    const cardExpenseSum = dashboard.categories
      .filter((c) => c.kind === 'expense')
      .reduce((sum, c) => sum + c.total, 0);
    expect(cardExpenseSum).toBe(350);
    expect(dashboard.overview.expenses).toBe(350);
  });

  it('hides an archived category in periods with no transactions (nothing to reconcile)', () => {
    // `travel` has no transactions at all; archived, it should not surface even
    // though unused non-archived categories normally show.
    const archivedFinance: Finance = {
      ...finance,
      categories: finance.categories.map((c) =>
        c.id === 'travel' ? { ...c, archivedAt: '2026-06-01T00:00:00.000Z' } : c,
      ),
    };
    const dashboard = buildDashboard(archivedFinance, monthFilter, now, 'en');
    expect(dashboard.categories.map((c) => c.id)).not.toContain('travel');
  });
});
