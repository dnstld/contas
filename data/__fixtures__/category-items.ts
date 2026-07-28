import type { Category, CategoryItem } from '@/data/finance-types';

/**
 * Phase-A sample data for the Categories tab and its child screens. This is a
 * throwaway fixture: no query, hook, or Supabase code depends on it. Later
 * steps replace these constants with real wallet data.
 */
export const MOCK_CATEGORIES: Category[] = [
  // Expenses
  { id: 'cat-subscriptions', name: 'Assinaturas', type: 'expense', monthlyBudget: 150 },
  { id: 'cat-bar-cafe', name: 'Bar / Café', type: 'expense', monthlyBudget: 300 },
  { id: 'cat-groceries', name: 'Mercado', type: 'expense', monthlyBudget: 1200 },
  { id: 'cat-housing', name: 'Moradia', type: 'expense', monthlyBudget: 2500 },
  // Income
  { id: 'cat-salary', name: 'Salário', type: 'income' },
  { id: 'cat-freelance', name: 'Freelance', type: 'income' },
];

export const MOCK_CATEGORY_ITEMS: CategoryItem[] = [
  // Subscriptions
  {
    id: 'item-netflix',
    categoryId: 'cat-subscriptions',
    name: 'Netflix',
    defaultAmount: 39.9,
    recurrence: 'monthly',
    nextDueOn: '2026-08-05',
  },
  {
    id: 'item-apple',
    categoryId: 'cat-subscriptions',
    name: 'Apple One',
    defaultAmount: 34.9,
    recurrence: 'monthly',
    nextDueOn: '2026-08-12',
  },
  {
    id: 'item-amazon-prime',
    categoryId: 'cat-subscriptions',
    name: 'Amazon Prime',
    defaultAmount: 179.9,
    recurrence: 'yearly',
    nextDueOn: '2026-11-20',
  },
  {
    id: 'item-iphone-15',
    categoryId: 'cat-subscriptions',
    name: 'iPhone 15',
    defaultAmount: 416.58,
    recurrence: 'monthly',
    nextDueOn: '2026-08-10',
    recurrenceTotalCount: 12,
  },
  {
    id: 'item-spotify',
    categoryId: 'cat-subscriptions',
    name: 'Spotify',
    defaultAmount: 21.9,
    recurrence: 'monthly',
    archivedAt: '2026-06-01T00:00:00.000Z',
  },
  // Bar / Café
  {
    id: 'item-cafe-do-bairro',
    categoryId: 'cat-bar-cafe',
    name: 'Café do bairro',
    recurrence: 'none',
  },
  // Groceries
  {
    id: 'item-feira',
    categoryId: 'cat-groceries',
    name: 'Feira semanal',
    defaultAmount: 120,
    recurrence: 'none',
  },
  // Income
  {
    id: 'item-salary',
    categoryId: 'cat-salary',
    name: 'Salário CLT',
    defaultAmount: 8500,
    recurrence: 'monthly',
    nextDueOn: '2026-08-01',
  },
];

/**
 * Count of non-archived items per `categoryId`. Precomputed so the list can
 * render counts without any runtime logic.
 */
export function itemCountByCategory(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of MOCK_CATEGORY_ITEMS) {
    if (item.archivedAt) continue;
    counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
  }
  return counts;
}
