import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { financeKeys } from '@/hooks/use-finance-queries';
import { useWallet } from '@/hooks/use-wallet';

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
