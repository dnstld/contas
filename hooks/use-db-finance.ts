import { useEffect, useMemo, useRef, useState } from 'react';

import type { Category, FinanceMock, Transaction } from '@/data/finance-mock';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';

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

const NOOP_BEHAVIOR = {
  minEntriesPerMonth: 0,
  maxEntriesPerMonth: 0,
  minAmount: 0,
  maxAmount: 0,
};

function adapt(
  categoryRows: CategoryRow[],
  transactionRows: TransactionRow[],
): FinanceMock {
  const categories: Category[] = categoryRows.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type === 'income' ? 'income' : 'expense',
    monthlyBudget:
      c.monthly_budget_cents == null ? undefined : c.monthly_budget_cents / 100,
    createdAt: c.created_at,
    behavior: NOOP_BEHAVIOR,
  }));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const transactions: Transaction[] = transactionRows.map((t) => {
    const cat = categoryById.get(t.category_id);
    return {
      id: t.id,
      type: cat?.type ?? 'expense',
      categoryId: t.category_id,
      categoryName: cat?.name ?? '',
      amount: t.amount_cents / 100,
      description: t.description,
      status: t.status === 'scheduled' ? 'scheduled' : 'completed',
      recurrence:
        t.recurrence === 'daily' ||
        t.recurrence === 'weekly' ||
        t.recurrence === 'monthly'
          ? t.recurrence
          : 'none',
      date: t.occurred_at,
    };
  });

  const years = Array.from(
    new Set(
      transactions
        .map((t) => (t.date ? new Date(t.date).getFullYear() : null))
        .filter((y): y is number => y != null),
    ),
  ).sort((a, b) => a - b);

  return {
    generatedAt: new Date().toISOString(),
    years,
    currency: 'BRL',
    categories,
    transactions,
  };
}

export interface UseDbFinanceResult {
  mock: FinanceMock | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useDbFinance(walletId: string | null): UseDbFinanceResult {
  const [mock, setMock] = useState<FinanceMock | null>(null);
  const [loading, setLoading] = useState<boolean>(walletId != null);
  const [error, setError] = useState<Error | null>(null);
  const requestRef = useRef(0);

  const fetcher = useMemo(() => {
    return async (wid: string) => {
      const reqId = ++requestRef.current;
      setLoading(true);
      setError(null);
      const [cats, txns] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, type, monthly_budget_cents, created_at')
          .eq('wallet_id', wid),
        supabase
          .from('transactions')
          .select(
            'id, category_id, amount_cents, description, status, occurred_at, recurrence',
          )
          .eq('wallet_id', wid)
          .order('occurred_at', { ascending: false }),
      ]);
      if (reqId !== requestRef.current) return;
      if (cats.error) {
        setError(cats.error);
        setLoading(false);
        return;
      }
      if (txns.error) {
        setError(txns.error);
        setLoading(false);
        return;
      }
      setMock(adapt(cats.data ?? [], txns.data ?? []));
      setLoading(false);
    };
  }, []);

  useEffect(() => {
    if (!walletId) {
      requestRef.current++;
      setMock(null);
      setLoading(false);
      setError(null);
      return;
    }
    fetcher(walletId).catch((e) => {
      console.error('[db-finance] fetch failed', e);
      setError(e instanceof Error ? e : new Error(String(e)));
      setLoading(false);
    });
  }, [walletId, fetcher]);

  return {
    mock,
    loading,
    error,
    refresh: async () => {
      if (walletId) await fetcher(walletId);
    },
  };
}

export function useDbFinanceForCurrentWallet(): UseDbFinanceResult {
  const { walletId } = useWallet();
  return useDbFinance(walletId);
}
