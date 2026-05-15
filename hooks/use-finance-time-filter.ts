import { useTimeFilter, type TimeFilterApi } from '@/hooks/use-time-filter';

export const FINANCE_TIME_FILTER_KEY = 'dashboard:time-filter:v2';

export function useFinanceTimeFilter(now?: Date): TimeFilterApi {
  return useTimeFilter({ storageKey: FINANCE_TIME_FILTER_KEY, now });
}
