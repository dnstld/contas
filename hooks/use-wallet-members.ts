import { useQuery } from '@tanstack/react-query';

import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';

export type WalletMember = {
  userId: string;
  joinedAt: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
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
      const { data, error } = await supabase.rpc('list_wallet_members', {
        p_wallet_id: walletId!,
      });

      if (error) throw error;

      return (data ?? []).map<WalletMember>((row) => ({
        userId: row.user_id,
        joinedAt: row.joined_at,
        displayName: row.display_name ?? null,
        avatarUrl: row.avatar_url ?? null,
        email: row.email ?? null,
      }));
    },
  });

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
