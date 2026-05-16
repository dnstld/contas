import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { financeKeys } from '@/hooks/use-finance-queries';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';

export function useFinanceRealtime() {
  const { walletId } = useWallet();
  const qc = useQueryClient();

  useEffect(() => {
    if (!walletId) return;

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
  }, [walletId, qc]);
}
