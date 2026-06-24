import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/use-auth';
import { useWallet } from '@/hooks/use-wallet';
import { walletKeys } from '@/hooks/use-wallet-list';
import { walletMemberKeys } from '@/hooks/use-wallet-members';
import { supabase } from '@/utils/supabase';

export type InvitationPreview = {
  walletName: string;
  inviterName: string | null;
  expired: boolean;
};

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
      return data.code;
    },
  });
}

export const invitationPreviewKey = (code: string) => ['invitation-preview', code] as const;

/**
 * Previews the wallet behind an invite code (name + inviter) without
 * consuming the single-use invitation, so the redeem screen can show a
 * "Join {wallet}, shared by {name}" confirmation. Event-driven: it fetches
 * once per code and is invalidated by the redeem mutation, never polled.
 */
export function usePeekInvitation(code: string | null) {
  const trimmed = code?.trim().toLowerCase() ?? '';

  return useQuery<InvitationPreview>({
    queryKey: invitationPreviewKey(trimmed),
    enabled: trimmed.length > 0,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('peek_wallet_invitation', { p_code: trimmed });
      if (error) throw error;
      const row = data?.[0];
      if (!row) throw new Error('invitation not found');
      return {
        walletName: row.wallet_name,
        inviterName: row.inviter_name,
        expired: row.expired,
      };
    },
  });
}

export function useRedeemInvitation() {
  const { switchWallet } = useWallet();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('redeem_wallet_invitation', {
        p_code: code.trim().toLowerCase(),
      });
      if (error) throw error;
      // RPC returns the wallet_id of the joined wallet
      return data;
    },
    onSuccess: (joinedWalletId: string) => {
      switchWallet(joinedWalletId);
      queryClient.invalidateQueries({ queryKey: walletMemberKeys.list(joinedWalletId) });
      const userId = session?.user.id;
      if (userId) {
        queryClient.invalidateQueries({ queryKey: walletKeys.list(userId) });
      }
    },
  });
}
