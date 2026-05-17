import { useQuery } from '@tanstack/react-query';

import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';

export type WalletMember = {
  userId: string;
  joinedAt: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export const walletMemberKeys = {
  list: (walletId: string) => ['wallet-members', walletId] as const,
};

export function useWalletMembers() {
  const { walletId } = useWallet();

  const query = useQuery({
    queryKey: walletMemberKeys.list(walletId ?? ''),
    enabled: !!walletId,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data: memberRows, error: memberErr } = await supabase
        .from('wallet_members')
        .select('user_id, joined_at')
        .eq('wallet_id', walletId!);

      if (memberErr) throw memberErr;
      if (!memberRows || memberRows.length === 0) return [];

      const userIds = memberRows.map((m) => m.user_id);
      const { data: profileRows, error: profileErr } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      if (profileErr) throw profileErr;

      const profileById = new Map(
        (profileRows ?? []).map((p) => [p.id, p] as const),
      );

      return memberRows.map<WalletMember>((row) => {
        const profile = profileById.get(row.user_id);
        return {
          userId: row.user_id,
          joinedAt: row.joined_at,
          displayName: profile?.display_name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
        };
      });
    },
  });

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
