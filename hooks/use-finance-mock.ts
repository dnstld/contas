import { useMemo } from 'react';

import {
  generateFinanceMock,
  type Category,
  type FinanceMock,
} from '@/data/finance-mock';
import { useDbFinanceForCurrentWallet } from '@/hooks/use-db-finance';
import { usePersistedState } from '@/hooks/use-persisted-state';

const STARTER_CATEGORIES: Category[] = [
  {
    id: 'cafe_bar',
    name: 'Café / Bar',
    type: 'expense',
    behavior: { minEntriesPerMonth: 0, maxEntriesPerMonth: 0, minAmount: 0, maxAmount: 0 },
  },
];

const STARTER_MOCK: FinanceMock = {
  generatedAt: new Date(0).toISOString(),
  years: [],
  currency: 'BRL',
  categories: STARTER_CATEGORIES,
  transactions: [],
};

export interface UseFinanceMockResult {
  mock: FinanceMock;
  currency: FinanceMock['currency'];
  loading: boolean;
}

export function useFinanceMock(): UseFinanceMockResult {
  const [demoMode] = usePersistedState('settings:demo-mode', false);
  const generatedMock = useMemo(() => generateFinanceMock(), []);
  const db = useDbFinanceForCurrentWallet();

  if (demoMode) {
    return { mock: generatedMock, currency: generatedMock.currency, loading: false };
  }
  const mock = db.mock ?? STARTER_MOCK;
  return { mock, currency: mock.currency, loading: db.loading };
}
