import { useCallback, useMemo } from 'react';

import { txDate, type Category, type Finance, type Transaction } from '@/data/finance-types';
import { useCategories, useTransactions } from '@/hooks/use-finance-queries';
import { useWallet } from '@/hooks/use-wallet';

export type UseFinanceResult = {
  data: Finance | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  currency: string;
  refetch: () => Promise<void>;
};

function assembleFinance(
  categories: Category[],
  transactions: Transaction[],
  currency: string,
): Finance {
  const years = Array.from(new Set(transactions.map((t) => txDate(t).getFullYear()))).sort(
    (a, b) => a - b,
  );

  return {
    years,
    currency,
    categories,
    transactions,
  };
}

export function useFinance(): UseFinanceResult {
  const { currency } = useWallet();
  const categoriesQ = useCategories();
  const transactionsQ = useTransactions();

  const data = useMemo(
    () =>
      categoriesQ.data && transactionsQ.data
        ? assembleFinance(categoriesQ.data, transactionsQ.data, currency)
        : undefined,
    [categoriesQ.data, transactionsQ.data, currency],
  );

  const refetch = useCallback(async () => {
    await Promise.all([categoriesQ.refetch(), transactionsQ.refetch()]);
  }, [categoriesQ, transactionsQ]);

  return {
    data,
    isLoading: categoriesQ.isPending || transactionsQ.isPending,
    isError: categoriesQ.isError || transactionsQ.isError,
    error: categoriesQ.error ?? transactionsQ.error,
    currency,
    refetch,
  };
}
