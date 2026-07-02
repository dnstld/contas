import { describe, expect, it } from 'vitest';

import { buildDashboard } from '@/data/finance-aggregations';
import type { Category, Finance, OneOffTransaction } from '@/data/finance-types';
import { buildTransactionsList } from '@/data/transactions-list';
import type { TimeFilterState } from '@/hooks/use-time-filter-state';

// Fixed reference instant so tests never depend on the real "today".
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
    createdAt: overrides.date,
    updatedAt: overrides.date,
    createdByUserId: null,
    ...overrides,
  };
}

const transactions: OneOffTransaction[] = [
  // July 2026 (current month, current year)
  mkTx({
    id: 't1',
    date: '2026-07-05',
    type: 'income',
    categoryId: 'salary',
    categoryName: 'Salary',
    amount: 500,
  }),
  mkTx({
    id: 't2',
    date: '2026-07-10',
    type: 'expense',
    categoryId: 'rent',
    categoryName: 'Rent',
    amount: 250,
  }),
  mkTx({
    id: 't3',
    date: '2026-07-12',
    type: 'expense',
    categoryId: 'groceries',
    categoryName: 'Groceries',
    amount: 100,
  }),

  // June 2026 (previous month, same year)
  mkTx({
    id: 't4',
    date: '2026-06-20',
    type: 'income',
    categoryId: 'salary',
    categoryName: 'Salary',
    amount: 500,
  }),
  mkTx({
    id: 't5',
    date: '2026-06-22',
    type: 'expense',
    categoryId: 'rent',
    categoryName: 'Rent',
    amount: 250,
  }),

  // May 2026 (current year, another month)
  mkTx({
    id: 't6',
    date: '2026-05-15',
    type: 'income',
    categoryId: 'freelance',
    categoryName: 'Freelance',
    amount: 100,
  }),
  mkTx({
    id: 't7',
    date: '2026-05-18',
    type: 'expense',
    categoryId: 'groceries',
    categoryName: 'Groceries',
    amount: 100,
  }),

  // Year-boundary pair
  mkTx({
    id: 't8',
    date: '2025-12-31',
    type: 'expense',
    categoryId: 'rent',
    categoryName: 'Rent',
    amount: 250,
  }),
  mkTx({
    id: 't9',
    date: '2026-01-01',
    type: 'income',
    categoryId: 'salary',
    categoryName: 'Salary',
    amount: 500,
  }),

  // Previous year (2025)
  mkTx({
    id: 't10',
    date: '2025-06-10',
    type: 'income',
    categoryId: 'salary',
    categoryName: 'Salary',
    amount: 500,
  }),
  mkTx({
    id: 't11',
    date: '2025-06-11',
    type: 'expense',
    categoryId: 'groceries',
    categoryName: 'Groceries',
    amount: 100,
  }),

  // Scheduled — must be excluded from every total.
  mkTx({
    id: 't12',
    date: '2026-07-20',
    type: 'expense',
    categoryId: 'rent',
    categoryName: 'Rent',
    amount: 999,
    status: 'scheduled',
  }),
];

const finance: Finance = { years: [2025, 2026], currency: 'USD', categories, transactions };

const monthFilter: TimeFilterState = { years: [2026], months: ['jul'], all: false };
const yearFilter: TimeFilterState = { years: [2026], months: [], all: true };

describe('finance-aggregations characterization (pre-refactor baseline)', () => {
  it('month mode: July 2026 vs June 2026', () => {
    const dashboard = buildDashboard(finance, monthFilter, now, 'en');
    const { overview } = dashboard;

    expect(overview.revenue).toBe(500);
    expect(overview.expenses).toBe(350);
    expect(overview.net).toBe(150);
    expect(overview.previousRevenue).toBe(500);
    expect(overview.previousExpenses).toBe(250);
  });

  it('year mode: 2026 vs 2025', () => {
    const dashboard = buildDashboard(finance, yearFilter, now, 'en');
    const { overview } = dashboard;

    expect(overview.revenue).toBe(1600);
    expect(overview.expenses).toBe(700);
    expect(overview.net).toBe(900);
    expect(overview.previousRevenue).toBe(500);
    expect(overview.previousExpenses).toBe(350);
  });

  it('buildTransactionsList totals for July 2026', () => {
    const { totals } = buildTransactionsList(finance, monthFilter, now);

    expect(totals.income).toBe(500);
    expect(totals.expenses).toBe(350);
    expect(totals.net).toBe(150);
  });
});
