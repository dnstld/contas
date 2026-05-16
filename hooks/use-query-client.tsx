import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

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

function useAppStateInvalidate() {
  const qc = useQueryClient();
  const lastState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const wasInactive = lastState.current !== 'active';
      lastState.current = next;
      if (wasInactive && next === 'active') {
        qc.invalidateQueries({ queryKey: ['finance'] });
      }
    });
    return () => sub.remove();
  }, [qc]);
}

function AppStateInvalidator() {
  useAppStateInvalidate();
  return null;
}

export function FinanceQueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStateInvalidator />
      {children}
    </QueryClientProvider>
  );
}
