import { useAuth } from '@/hooks/use-auth';
import { useTimeFilter, type TimeFilterApi } from '@/hooks/use-time-filter';

const ANONYMOUS_BUCKET = 'anon';

function financeTimeFilterKey(userId: string | null): string {
  return `dashboard:time-filter:v2:${userId ?? ANONYMOUS_BUCKET}`;
}

export function useFinanceTimeFilter(now?: Date): TimeFilterApi {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  return useTimeFilter({ storageKey: financeTimeFilterKey(userId), now });
}
