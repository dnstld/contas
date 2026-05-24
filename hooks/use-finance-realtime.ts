import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useDemoMode } from '@/hooks/use-demo-mode';
import { financeKeys } from '@/hooks/use-finance-queries';
import { useAuth } from '@/hooks/use-auth';
import { walletKeys } from '@/hooks/use-wallet-list';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';

export function useFinanceRealtime() {
  const { walletId } = useWallet();
  const { enabled: demoMode } = useDemoMode();
  const qc = useQueryClient();

  useEffect(() => {
    if (!walletId || demoMode) return;

    const channel = supabase
      .channel(`finance:${walletId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `wallet_id=eq.${walletId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: financeKeys.transactions(walletId) });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `wallet_id=eq.${walletId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: financeKeys.categories(walletId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletId, demoMode, qc]);
}

export function useWalletRealtime() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`wallet-meta:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_delete_requests' },
        () => {
          qc.invalidateQueries({ queryKey: walletKeys.list(userId) });
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_members' }, () => {
        qc.invalidateQueries({ queryKey: walletKeys.list(userId) });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
