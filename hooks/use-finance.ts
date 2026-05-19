import { useMemo } from 'react';

import { generateDemoFinance } from '@/data/finance-demo';
import {
  transactionDate,
  type Category,
  type Finance,
  type Transaction,
} from '@/data/finance-types';
import { useDemoMode } from '@/hooks/use-demo-mode';
import { useCategories, useTransactions } from '@/hooks/use-finance-queries';
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
    years,
    currency,
    categories,
    transactions,
  };
}

export function useFinance(): UseFinanceResult {
  const { enabled: demoMode } = useDemoMode();
  const { currency } = useWallet();
  const categoriesQ = useCategories();
  const transactionsQ = useTransactions();

  const demoData = useMemo(
    () => (demoMode ? generateDemoFinance(currency) : undefined),
    [demoMode, currency],
  );

  const liveData = useMemo(
    () =>
      categoriesQ.data && transactionsQ.data
        ? assembleFinance(categoriesQ.data, transactionsQ.data, currency)
        : undefined,
    [categoriesQ.data, transactionsQ.data, currency],
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

  return {
    data: liveData,
    isLoading: categoriesQ.isPending || transactionsQ.isPending,
    isError: categoriesQ.isError || transactionsQ.isError,
    error: categoriesQ.error ?? transactionsQ.error,
    isDemo: false,
    currency,
  };
}
