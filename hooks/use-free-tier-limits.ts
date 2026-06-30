import { useQuery } from '@tanstack/react-query';

import { FreeTierLimitsRowSchema } from '@/data/schemas';
import { captureMessage } from '@/utils/monitoring';
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
    // Returns `null` (not `undefined`) on parse failure: TanStack Query v5
    // disallows a queryFn resolving to `undefined`. The hook maps it back to
    // `undefined` below so callers keep their "unknown ⇒ not at limit" handling.
    queryFn: async (): Promise<FreeTierLimits | null> => {
      const { data, error } = await supabase.rpc('free_tier_limits');
      if (error) throw error;
      const parsed = FreeTierLimitsRowSchema.safeParse(data);
      if (!parsed.success) {
        captureMessage('free_tier_limits returned an unexpected shape', 'warning', {
          extra: { issues: parsed.error.issues },
        });
        return null;
      }
      return {
        maxWalletsPerUser: parsed.data.max_wallets_per_user,
        maxPendingInvitesPerWallet: parsed.data.max_pending_invites_per_wallet,
      };
    },
  });

  return data ?? undefined;
}
