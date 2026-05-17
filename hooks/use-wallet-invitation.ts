import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/use-auth';
import { useWallet } from '@/hooks/use-wallet';
import { walletMemberKeys } from '@/hooks/use-wallet-members';
import { supabase } from '@/utils/supabase';

export function useCreateInvitation() {
  const { walletId } = useWallet();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!walletId || !session?.user.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('wallet_invitations')
        .insert({ wallet_id: walletId, created_by: session.user.id })
        .select('code')
        .single();
      if (error) throw error;
      return data.code as string;
    },
  });
}

export function useRedeemInvitation() {
  const { switchWallet } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('redeem_wallet_invitation', {
        p_code: code.trim().toLowerCase(),
      });
      if (error) throw error;
      // RPC returns the wallet_id of the joined wallet
      return data as string;
    },
    onSuccess: (joinedWalletId: string) => {
      switchWallet(joinedWalletId);
      queryClient.invalidateQueries({ queryKey: walletMemberKeys.list(joinedWalletId) });
    },
  });
}
