import { useMemo } from 'react';

import {
  buildDashboard,
  type DashboardData,
} from '@/data/finance-aggregations';
import {
  generateFinanceMock,
  type FinanceMock,
} from '@/data/finance-mock';
import { type TimeFilterState } from '@/hooks/use-time-filter';

export interface UseFinanceDashboardResult extends DashboardData {
  mock: FinanceMock;
  currency: FinanceMock['currency'];
}

export function useFinanceDashboard(
  filter: TimeFilterState,
  now: Date,
): UseFinanceDashboardResult {
  const mock = useMemo(() => generateFinanceMock(), []);
  const data = useMemo(
    () => buildDashboard(mock, filter, now),
    [mock, filter, now],
  );

  return { mock, currency: mock.currency, ...data };
}
