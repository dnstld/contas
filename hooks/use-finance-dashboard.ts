import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { buildDashboard, type DashboardData } from '@/data/finance-aggregations';
import type { Finance } from '@/data/finance-types';
import { useFinance } from '@/hooks/use-finance';
import { type TimeFilterState } from '@/hooks/use-time-filter';

const EMPTY_FINANCE: Finance = {
  years: [],
  currency: 'BRL',
  categories: [],
  transactions: [],
};

export interface UseFinanceDashboardResult extends DashboardData {
  data: Finance | undefined;
  currency: string;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isDemo: boolean;
  refetch: () => Promise<void>;
}

export function useFinanceDashboard(filter: TimeFilterState, now: Date): UseFinanceDashboardResult {
  const { data, isLoading, isError, error, isDemo, currency, refetch } = useFinance();
  const { i18n } = useTranslation();
  const dashboard = useMemo(
    () => buildDashboard(data ?? EMPTY_FINANCE, filter, now, i18n.language),
    [data, filter, now, i18n.language],
  );

  return { data, currency, isLoading, isError, error, isDemo, refetch, ...dashboard };
}
