import { MutationCache, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  isCategoryHasTransactionsError,
  isDemoModeReadOnlyError,
} from '@/hooks/use-finance-mutations';
import { financeKeys } from '@/hooks/use-finance-queries';
import { useWallet } from '@/hooks/use-wallet';
import i18n from '@/i18n';
import { getErrorMessage } from '@/utils/error';
import { captureError } from '@/utils/monitoring';
import { toast } from '@/utils/toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
  mutationCache: new MutationCache({
    onError: (err, _vars, _ctx, mutation) => {
      if (mutation.meta?.silent) return;
      if (isDemoModeReadOnlyError(err)) {
        toast.info(i18n.t('edit.demoReadOnly'));
        return;
      }
      if (isCategoryHasTransactionsError(err)) return;
      toast.error(i18n.t('common.errors.actionFailed'), getErrorMessage(err, ''));
      captureError(err, { tags: { source: 'mutation' } });
    },
  }),
});

/**
 * Invalidates finance queries when the app returns to the foreground.
 * Must be called inside `WalletProvider` because it reads the current wallet
 * to scope invalidation to the relevant cache entries.
 */
export function useAppStateInvalidate() {
  const qc = useQueryClient();
  const { walletId } = useWallet();
  const lastState = useRef<AppStateStatus>(AppState.currentState);
  const walletIdRef = useRef(walletId);
  walletIdRef.current = walletId;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const wasInactive = lastState.current !== 'active';
      lastState.current = next;
      if (wasInactive && next === 'active' && walletIdRef.current) {
        qc.invalidateQueries({ queryKey: financeKeys.all(walletIdRef.current) });
      }
    });
    return () => sub.remove();
  }, [qc]);
}

export function FinanceQueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
