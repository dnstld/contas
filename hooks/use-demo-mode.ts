import { useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { usePersistedState } from '@/hooks/use-persisted-state';

const ANONYMOUS_BUCKET = 'anon';

function demoModeKey(userId: string | null): string {
  return `settings:demo-mode:${userId ?? ANONYMOUS_BUCKET}`;
}

export function useDemoMode(): { enabled: boolean; set: (next: boolean) => void } {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [enabled, set] = usePersistedState<boolean>(demoModeKey(userId), false);

  return {
    enabled: !!userId && enabled,
    set: useCallback(
      (next: boolean) => {
        if (!userId) return;
        set(next);
      },
      [userId, set],
    ),
  };
}
