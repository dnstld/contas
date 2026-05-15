import { useMemo } from 'react';

import {
  generateFinanceMock,
  type Category,
  type FinanceMock,
} from '@/data/finance-mock';
import { usePersistedState } from '@/hooks/use-persisted-state';

const STARTER_CATEGORIES: Category[] = [
  {
    id: 'bar_restaurante',
    name: 'Bar / Restaurante',
    type: 'expense',
    behavior: { minEntriesPerMonth: 0, maxEntriesPerMonth: 0, minAmount: 0, maxAmount: 0 },
  },
  {
    id: 'mercado',
    name: 'Mercado',
    type: 'expense',
    behavior: { minEntriesPerMonth: 0, maxEntriesPerMonth: 0, minAmount: 0, maxAmount: 0 },
  },
  {
    id: 'farmacia',
    name: 'Farmácia',
    type: 'expense',
    behavior: { minEntriesPerMonth: 0, maxEntriesPerMonth: 0, minAmount: 0, maxAmount: 0 },
  },
  {
    id: 'viagens',
    name: 'Viagens',
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
}

export function useFinanceMock(): UseFinanceMockResult {
  const [demoMode] = usePersistedState('settings:demo-mode', false);
  const generatedMock = useMemo(() => generateFinanceMock(), []);
  const mock = demoMode ? generatedMock : STARTER_MOCK;
  return { mock, currency: mock.currency };
}
