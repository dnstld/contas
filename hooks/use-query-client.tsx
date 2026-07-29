import {
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useEffect, useRef, type ReactNode } from 'react';

import { useAppForeground } from '@/hooks/use-app-foreground';
import { useAuth } from '@/hooks/use-auth';
import { isCategoryItemInUseError } from '@/hooks/use-category-item-mutations';
import { isCategoryHasTransactionsError } from '@/hooks/use-finance-mutations';
import { financeKeys } from '@/hooks/use-finance-queries';
import { myProfileKey } from '@/hooks/use-my-profile';
import { useWallet } from '@/hooks/use-wallet';
import { walletKeys } from '@/hooks/use-wallet-list';
import { walletMemberKeys } from '@/hooks/use-wallet-members';
import { outgoingInvitationKeys, pendingInvitationKeys } from '@/hooks/use-wallet-invitation';
import i18n from '@/i18n';
import { mapSupabaseErrorKey } from '@/utils/error';
import { captureError } from '@/utils/monitoring';
import { toast } from '@/utils/toast';

// Wire TanStack Query's onlineManager to native connectivity so that
// `refetchOnReconnect` actually fires when the device regains network. Without
// this, RN's `navigator.onLine` is always `true` and reconnect refetches never
// trigger — errored queries would stay in their error state forever.
onlineManager.setEventListener((setOnline) => {
  // Seed initial state. On cold start we may already be offline.
  getNetworkStateAsync()
    .then((state) => setOnline(state.isInternetReachable !== false && state.isConnected !== false))
    .catch(() => {
      // Failing closed (assume offline) would block initial queries. Default
      // to online; if we really are offline, queries fail and the listener
      // below will flip us back online on recovery.
      setOnline(true);
    });
  const sub = addNetworkStateListener((state) => {
    setOnline(state.isInternetReachable !== false && state.isConnected !== false);
  });
  return () => sub.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      // We refetch *errored* queries on reconnect via the onlineManager
      // listener below — explicit and targeted, rather than refetching every
      // query on every reconnect.
      refetchOnReconnect: false,
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (err, query) => {
      captureError(err, {
        tags: { source: 'query' },
        extra: { queryKey: query.queryKey },
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (err, _vars, _ctx, mutation) => {
      // Known business errors: handled by callers, never toasted, never sent
      // to Sentry (they're expected).
      if (isCategoryHasTransactionsError(err)) return;
      if (isCategoryItemInUseError(err)) return;

      // Always capture unexpected errors — `silent` only suppresses the user-
      // facing toast for screens that render their own inline error UI.
      captureError(err, { tags: { source: 'mutation' } });
      if (mutation.meta?.['silent']) return;
      toast.error(i18n.t('common.errors.actionFailed'), i18n.t(mapSupabaseErrorKey(err)));
    },
  }),
});

// When the device comes back online, refetch only the queries that are
// currently in an error state. Successful queries stay cached — this respects
// the event-driven invalidation rule while letting transient network failures
// self-heal without user action.
onlineManager.subscribe((isOnline) => {
  if (!isOnline) return;
  queryClient.invalidateQueries({
    predicate: (q) => q.state.status === 'error',
  });
});

/**
 * Invalidates finance queries when the app returns to the foreground from a
 * real background — not from transient inactive states (control center,
 * incoming notification banner) which would refetch unnecessarily.
 *
 * iOS surfaces the foreground sequence as `background → inactive → active`,
 * so we can't rely on the immediate `previous` state. `useAppForeground`
 * handles that detection; the callback below reads the current identifiers
 * from render scope (kept fresh via `useAppForeground`'s callback ref, so the
 * AppState listener still subscribes only once).
 *
 * Must be called inside `WalletProvider` because it reads the current wallet
 * to scope invalidation to the relevant cache entries.
 */
export function useAppStateInvalidate() {
  const qc = useQueryClient();
  const { walletId } = useWallet();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const email = session?.user.email ?? null;

  useAppForeground(() => {
    if (walletId) {
      qc.invalidateQueries({ queryKey: financeKeys.all(walletId) });
      // Refresh shared-wallet state on app open: the invitee's banner and
      // the inviter's member/invite cards.
      qc.invalidateQueries({ queryKey: walletMemberKeys.list(walletId) });
      qc.invalidateQueries({ queryKey: outgoingInvitationKeys.list(walletId) });
    }
    if (userId) {
      qc.invalidateQueries({ queryKey: walletKeys.list(userId) });
      // Catch a cross-device self-edit of the profile on app open (the only
      // case not covered by `useUpdateMyProfile`'s own invalidation).
      qc.invalidateQueries({ queryKey: myProfileKey(userId) });
    }
    if (email) {
      qc.invalidateQueries({ queryKey: pendingInvitationKeys.list(email) });
    }
  });
}

/**
 * Clears the query cache when the session disappears (sign-out, token
 * revocation). Prevents user A's cached data from briefly showing up after
 * user B signs in on the same device. Must be mounted inside both
 * `AuthProvider` and `QueryClientProvider`.
 */
export function useClearCacheOnSignOut() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const hadSession = useRef(session !== null);

  useEffect(() => {
    const hasSession = session !== null;
    if (hadSession.current && !hasSession) {
      qc.clear();
    }
    hadSession.current = hasSession;
  }, [session, qc]);
}

export function FinanceQueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
