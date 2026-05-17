import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { WalletWithMeta } from '@/data/finance-types';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/utils/supabase';

export const walletKeys = {
  list: (userId: string) => ['wallets', userId, 'list'] as const,
};

export function useWalletList(): UseQueryResult<WalletWithMeta[]> {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: userId ? walletKeys.list(userId) : ['wallets', 'unbound'],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async (): Promise<WalletWithMeta[]> => {
      // Fetch wallets the current user is a member of
      const { data: memberRows, error: memberError } = await supabase
        .from('wallet_members')
        .select('wallet_id, joined_at, wallets(id, name, currency, created_at)')
        .eq('user_id', userId as string)
        .order('joined_at', { ascending: true });

      if (memberError) throw memberError;
      if (!memberRows || memberRows.length === 0) return [];

      const walletIds = memberRows.map((r) => r.wallet_id);

      // Fetch all members of those wallets + their profiles
      const { data: allMembers, error: membersError } = await supabase
        .from('wallet_members')
        .select('wallet_id, user_id, joined_at, profiles(display_name, avatar_url)')
        .in('wallet_id', walletIds);

      if (membersError) throw membersError;

      // Fetch any pending delete requests for those wallets
      const { data: deleteRequests, error: drError } = await supabase
        .from('wallet_delete_requests')
        .select('wallet_id, requested_by, created_at')
        .in('wallet_id', walletIds);

      if (drError) throw drError;

      const deleteRequestByWallet = new Map(
        (deleteRequests ?? []).map((r) => [
          r.wallet_id,
          { requestedByUserId: r.requested_by, createdAt: r.created_at },
        ]),
      );

      const membersByWallet = new Map<string, typeof allMembers>();
      for (const m of allMembers ?? []) {
        if (!membersByWallet.has(m.wallet_id)) membersByWallet.set(m.wallet_id, []);
        membersByWallet.get(m.wallet_id)!.push(m);
      }

      return memberRows.map((row) => {
        const wallet = row.wallets as {
          id: string;
          name: string;
          currency: string;
          created_at: string;
        } | null;
        if (!wallet) throw new Error('wallet join returned null');

        const members = membersByWallet.get(row.wallet_id) ?? [];
        return {
          id: wallet.id,
          name: wallet.name,
          currency: wallet.currency,
          createdAt: wallet.created_at,
          memberCount: members.length,
          members: members.map((m) => {
            const profile = m.profiles as {
              display_name: string | null;
              avatar_url: string | null;
            } | null;
            return {
              userId: m.user_id,
              displayName: profile?.display_name ?? null,
              avatarUrl: profile?.avatar_url ?? null,
              joinedAt: m.joined_at,
            };
          }),
          pendingDeleteRequest: deleteRequestByWallet.get(row.wallet_id) ?? null,
        };
      });
    },
  });
}
