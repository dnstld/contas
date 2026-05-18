import { useMemo } from 'react';

import { generateDemoFinance } from '@/data/finance-demo';
import {
  transactionDate,
  type Category,
  type Finance,
  type Transaction,
} from '@/data/finance-types';
import { useCategories, useTransactions } from '@/hooks/use-finance-queries';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useWallet } from '@/hooks/use-wallet';

export type UseFinanceResult = {
  data: Finance | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isDemo: boolean;
  currency: string;
};

function assembleFinance(
  categories: Category[],
  transactions: Transaction[],
  currency: string,
): Finance {
  const years = Array.from(
    new Set(transactions.map((t) => new Date(transactionDate(t)).getFullYear())),
  ).sort((a, b) => a - b);

  return {
    generatedAt: new Date().toISOString(),
    years,
    currency,
    categories,
    transactions,
  };
}

export function useFinance(): UseFinanceResult {
  const [demoMode] = usePersistedState('settings:demo-mode', false);
  const { currency } = useWallet();
  const categoriesQ = useCategories();
  const transactionsQ = useTransactions();

  const demoData = useMemo(
    () => (demoMode ? generateDemoFinance(currency) : undefined),
    [demoMode, currency],
  );

  if (demoMode) {
    return {
      data: demoData,
      isLoading: false,
      isError: false,
      error: null,
      isDemo: true,
      currency,
    };
  }

  const data =
    categoriesQ.data && transactionsQ.data
      ? assembleFinance(categoriesQ.data, transactionsQ.data, currency)
      : undefined;

  return {
    data,
    isLoading: categoriesQ.isPending || transactionsQ.isPending,
    isError: categoriesQ.isError || transactionsQ.isError,
    error: categoriesQ.error ?? transactionsQ.error,
    isDemo: false,
    currency,
  };
}
