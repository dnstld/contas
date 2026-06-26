import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/utils/supabase';

export type FreeTierLimits = {
  maxWalletsPerUser: number;
  maxPendingInvitesPerWallet: number;
};

export const freeTierLimitKeys = {
  all: ['free-tier-limits'] as const,
};

/**
 * Free-tier caps, read from the DB so the numbers live in exactly one place:
 * the `free_tier_limits()` RPC, which the enforcement RPCs also read. The
 * value is effectively constant for the app's lifetime, so it's fetched once
 * and never refetched by time — not polling.
 *
 * Returns `undefined` until the value loads. Callers treat "unknown" as
 * "not at the limit" and leave the action enabled — enforcement is
 * authoritative in the DB RPCs, so the UI lock is only a convenience.
 */
export function useFreeTierLimits(): FreeTierLimits | undefined {
  const { data } = useQuery({
    queryKey: freeTierLimitKeys.all,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<FreeTierLimits> => {
      const { data, error } = await supabase.rpc('free_tier_limits');
      if (error) throw error;
      return {
        maxWalletsPerUser: data.max_wallets_per_user,
        maxPendingInvitesPerWallet: data.max_pending_invites_per_wallet,
      };
    },
  });

  return data;
}
