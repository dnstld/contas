import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/use-auth';
import { useWallet } from '@/hooks/use-wallet';
import { walletKeys } from '@/hooks/use-wallet-list';
import { supabase } from '@/utils/supabase';

export function useLeaveWallet() {
  const { walletId, refresh } = useWallet();
  const { session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    // The danger-zone screen surfaces failures via its own Alert; suppress the
    // global MutationCache toast to avoid double-surfacing the same failure.
    meta: { silent: true },
    mutationFn: async () => {
      if (!walletId || !session?.user.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('wallet_members')
        .delete()
        .eq('wallet_id', walletId)
        .eq('user_id', session.user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      const userId = session?.user.id;
      if (userId) qc.invalidateQueries({ queryKey: walletKeys.list(userId) });
      await refresh();
    },
  });
}
