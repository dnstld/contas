import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import type { Category, Transaction } from '@/data/finance-types';
import { RecurrenceSchema, TransactionStatusSchema, TransactionTypeSchema } from '@/data/schemas';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';
import type { Tables } from '@/types/database.types';

export const financeKeys = {
  all: (walletId: string) => ['finance', walletId] as const,
  categories: (walletId: string) => ['finance', walletId, 'categories'] as const,
  transactions: (walletId: string) => ['finance', walletId, 'transactions'] as const,
  transaction: (walletId: string, transactionId: string) =>
    ['finance', walletId, 'transaction', transactionId] as const,
};

type CategoryRow = Tables<'categories'>;
type TransactionRow = Tables<'transactions'>;

function adaptCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: TransactionTypeSchema.catch('expense').parse(row.type),
    monthlyBudget: row.monthly_budget_cents == null ? undefined : row.monthly_budget_cents / 100,
    createdAt: row.created_at,
  };
}

export function adaptTransaction(
  row: TransactionRow,
  categoryById: Map<string, Category>,
): Transaction {
  const cat = categoryById.get(row.category_id);
  const recurrence = RecurrenceSchema.catch('none').parse(row.recurrence);
  const base = {
    id: row.id,
    type: cat?.type ?? ('expense' as const),
    categoryId: row.category_id,
    categoryName: cat?.name ?? '',
    amount: row.amount_cents / 100,
    description: row.description,
    status: TransactionStatusSchema.catch('completed').parse(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by ?? null,
  };
  if (recurrence !== 'none') {
    return {
      ...base,
      kind: 'recurring',
      recurrence,
      startDate: row.occurred_at,
      nextOccurrence: row.occurred_at,
    };
  }
  return {
    ...base,
    kind: 'one-off',
    recurrence: 'none',
    date: row.occurred_at,
  };
}

async function fetchCategories(walletId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type, monthly_budget_cents, created_at, updated_at, wallet_id')
    .eq('wallet_id', walletId);
  if (error) throw error;
  return (data ?? []).map(adaptCategory);
}

const TRANSACTIONS_PAGE_SIZE = 1000;

async function fetchTransactionRows(walletId: string): Promise<TransactionRow[]> {
  const all: TransactionRow[] = [];
  for (let from = 0; ; from += TRANSACTIONS_PAGE_SIZE) {
    const to = from + TRANSACTIONS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('transactions')
      .select(
        'id, category_id, amount_cents, description, status, occurred_at, recurrence, wallet_id, created_at, created_by, updated_at',
      )
      .eq('wallet_id', walletId)
      // occurred_at is a date (no time), so tiebreak same-day rows by entry time
      // for a stable, deterministic feed (newest first).
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    const page = data ?? [];
    all.push(...page);
    if (page.length < TRANSACTIONS_PAGE_SIZE) break;
  }
  return all;
}

export function useCategories(): UseQueryResult<Category[]> {
  const { walletId } = useWallet();

  return useQuery({
    queryKey: walletId ? financeKeys.categories(walletId) : ['finance', 'unbound', 'categories'],
    enabled: !!walletId,
    queryFn: () => fetchCategories(walletId!),
  });
}

export function useTransaction(transactionId: string | null): UseQueryResult<Transaction | null> {
  const { walletId } = useWallet();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey:
      walletId && transactionId
        ? financeKeys.transaction(walletId, transactionId)
        : ['finance', 'unbound', 'transaction', transactionId ?? 'null'],
    enabled: !!walletId && !!transactionId,
    queryFn: async () => {
      const wid = walletId!;
      const tid = transactionId!;

      const { data, error } = await supabase
        .from('transactions')
        .select(
          'id, category_id, amount_cents, description, status, occurred_at, recurrence, wallet_id, created_at, created_by, updated_at',
        )
        .eq('id', tid)
        .eq('wallet_id', wid)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      // Reuse the cached categories list when available; otherwise fetch once.
      const cached = queryClient.getQueryData<Category[]>(financeKeys.categories(wid));
      const categories: Category[] =
        cached ??
        (await queryClient.fetchQuery<Category[]>({
          queryKey: financeKeys.categories(wid),
          queryFn: () => fetchCategories(wid),
        }));
      const categoryById = new Map(categories.map((c) => [c.id, c]));

      return adaptTransaction(data, categoryById);
    },
  });
}

export function useTransactions(): UseQueryResult<Transaction[]> {
  const { walletId } = useWallet();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: walletId
      ? financeKeys.transactions(walletId)
      : ['finance', 'unbound', 'transactions'],
    enabled: !!walletId,
    queryFn: async () => {
      const wid = walletId!;
      // Prefer the cached categories list to avoid a duplicate fetch. Fall back to
      // a fresh fetch the first time `useTransactions` runs before `useCategories`.
      const cached = queryClient.getQueryData<Category[]>(financeKeys.categories(wid));
      const categories: Category[] =
        cached ??
        (await queryClient.fetchQuery<Category[]>({
          queryKey: financeKeys.categories(wid),
          queryFn: () => fetchCategories(wid),
        }));
      const categoryById = new Map(categories.map((c) => [c.id, c]));

      const rows = await fetchTransactionRows(wid);
      return rows.map((row) => adaptTransaction(row, categoryById));
    },
  });
}
