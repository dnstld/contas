import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { Category, Transaction } from '@/data/finance-types';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';

export const financeKeys = {
  all: (walletId: string) => ['finance', walletId] as const,
  categories: (walletId: string) => ['finance', walletId, 'categories'] as const,
  transactions: (walletId: string) =>
    ['finance', walletId, 'transactions'] as const,
};

type CategoryRow = {
  id: string;
  name: string;
  type: string;
  monthly_budget_cents: number | null;
  created_at: string;
};

type TransactionRow = {
  id: string;
  category_id: string;
  amount_cents: number;
  description: string;
  status: string;
  occurred_at: string;
  recurrence: string;
};

function adaptCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type === 'income' ? 'income' : 'expense',
    monthlyBudget:
      row.monthly_budget_cents == null
        ? undefined
        : row.monthly_budget_cents / 100,
    createdAt: row.created_at,
  };
}

function adaptTransaction(row: TransactionRow, categoryById: Map<string, Category>): Transaction {
  const cat = categoryById.get(row.category_id);
  return {
    id: row.id,
    type: cat?.type ?? 'expense',
    categoryId: row.category_id,
    categoryName: cat?.name ?? '',
    amount: row.amount_cents / 100,
    description: row.description,
    status: row.status === 'scheduled' ? 'scheduled' : 'completed',
    recurrence:
      row.recurrence === 'daily' ||
      row.recurrence === 'weekly' ||
      row.recurrence === 'monthly'
        ? row.recurrence
        : 'none',
    date: row.occurred_at,
  };
}

export function useCategories(): UseQueryResult<Category[]> {
  const { walletId } = useWallet();
  const [demoMode] = usePersistedState('settings:demo-mode', false);

  return useQuery({
    queryKey: walletId ? financeKeys.categories(walletId) : ['finance', 'unbound', 'categories'],
    enabled: !!walletId && !demoMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type, monthly_budget_cents, created_at')
        .eq('wallet_id', walletId as string);
      if (error) throw error;
      return (data ?? []).map(adaptCategory);
    },
  });
}

export function useTransactions(): UseQueryResult<Transaction[]> {
  const { walletId } = useWallet();
  const [demoMode] = usePersistedState('settings:demo-mode', false);

  return useQuery({
    queryKey: walletId
      ? financeKeys.transactions(walletId)
      : ['finance', 'unbound', 'transactions'],
    enabled: !!walletId && !demoMode,
    queryFn: async () => {
      const cats = await supabase
        .from('categories')
        .select('id, name, type, monthly_budget_cents, created_at')
        .eq('wallet_id', walletId as string);
      if (cats.error) throw cats.error;
      const categoryById = new Map(
        (cats.data ?? []).map((row) => [row.id, adaptCategory(row)]),
      );

      const txns = await supabase
        .from('transactions')
        .select(
          'id, category_id, amount_cents, description, status, occurred_at, recurrence',
        )
        .eq('wallet_id', walletId as string)
        .order('occurred_at', { ascending: false });
      if (txns.error) throw txns.error;
      return (txns.data ?? []).map((row) => adaptTransaction(row, categoryById));
    },
  });
}
