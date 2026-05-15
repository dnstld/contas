import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  buildDashboard,
  type DashboardData,
} from '@/data/finance-aggregations';
import { type FinanceMock } from '@/data/finance-mock';
import { useFinanceMock } from '@/hooks/use-finance-mock';
import { type TimeFilterState } from '@/hooks/use-time-filter';

export interface UseFinanceDashboardResult extends DashboardData {
  mock: FinanceMock;
  currency: FinanceMock['currency'];
}

export function useFinanceDashboard(
  filter: TimeFilterState,
  now: Date,
): UseFinanceDashboardResult {
  const { mock, currency } = useFinanceMock();
  const { i18n } = useTranslation();
  const data = useMemo(
    () => buildDashboard(mock, filter, now, i18n.language),
    [mock, filter, now, i18n.language],
  );

  return { mock, currency, ...data };
}
