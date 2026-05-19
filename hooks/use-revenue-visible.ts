import { useAuth } from '@/hooks/use-auth';
import { usePersistedState } from '@/hooks/use-persisted-state';

const ANONYMOUS_BUCKET = 'anon';

function revenueVisibleKey(userId: string | null): string {
  return `dashboard:revenue-visible:${userId ?? ANONYMOUS_BUCKET}`;
}

export function useRevenueVisible(): [boolean, (next: boolean) => void] {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [enabled, set] = usePersistedState<boolean>(revenueVisibleKey(userId), false);
  return [enabled, set];
}
