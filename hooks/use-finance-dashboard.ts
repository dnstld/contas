import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  buildDashboard,
  type DashboardData,
} from '@/data/finance-aggregations';
import {
  generateFinanceMock,
  type Category,
  type FinanceMock,
} from '@/data/finance-mock';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { type TimeFilterState } from '@/hooks/use-time-filter';

export interface UseFinanceDashboardResult extends DashboardData {
  mock: FinanceMock;
  currency: FinanceMock['currency'];
}

// Seeded for a new user when they sign up. For now, served directly from the
// dashboard hook when Modo demo is off — replace with persistence + API later.
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

export function useFinanceDashboard(
  filter: TimeFilterState,
  now: Date,
): UseFinanceDashboardResult {
  const [demoMode] = usePersistedState('settings:demo-mode', false);
  const { i18n } = useTranslation();
  const generatedMock = useMemo(() => generateFinanceMock(), []);
  const mock = demoMode ? generatedMock : STARTER_MOCK;
  const data = useMemo(
    () => buildDashboard(mock, filter, now, i18n.language),
    [mock, filter, now, i18n.language],
  );

  return { mock, currency: mock.currency, ...data };
}
