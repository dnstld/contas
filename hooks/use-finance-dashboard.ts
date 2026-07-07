import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { buildDashboard, type DashboardData } from '@/data/finance-aggregations';
import type { Finance } from '@/data/finance-types';
import { formattingLocale } from '@/i18n';
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
  refetch: () => Promise<void>;
}

export function useFinanceDashboard(filter: TimeFilterState, now: Date): UseFinanceDashboardResult {
  const { data, isLoading, isError, error, currency, refetch } = useFinance();
  const { i18n } = useTranslation();
  const locale = formattingLocale(i18n.language);
  const dashboard = useMemo(
    () => buildDashboard(data ?? EMPTY_FINANCE, filter, now, locale),
    [data, filter, now, locale],
  );

  return { data, currency, isLoading, isError, error, refetch, ...dashboard };
}
