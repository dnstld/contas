import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useDemoMode } from '@/hooks/use-demo-mode';
import { financeKeys } from '@/hooks/use-finance-queries';
import { useAuth } from '@/hooks/use-auth';
import { walletKeys } from '@/hooks/use-wallet-list';
import { walletMemberKeys } from '@/hooks/use-wallet-members';
import { outgoingInvitationKeys } from '@/hooks/use-wallet-invitation';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';

function extractRowId(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === 'string') return id;
  }
  return undefined;
}

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
        (payload) => {
          qc.invalidateQueries({ queryKey: financeKeys.transactions(walletId) });
          const rowId = extractRowId(payload.new) ?? extractRowId(payload.old);
          if (rowId) {
            qc.invalidateQueries({
              queryKey: financeKeys.transaction(walletId, rowId),
            });
          }
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
  const { walletId } = useWallet();
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
      // A member joining (e.g. an invitee accepting) updates the wallet list and
      // the active wallet's member cards.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_members' }, () => {
        qc.invalidateQueries({ queryKey: walletKeys.list(userId) });
        if (walletId) qc.invalidateQueries({ queryKey: walletMemberKeys.list(walletId) });
      })
      // An invite being accepted/declined/cancelled refreshes the inviter's cards.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_invitations' }, () => {
        if (walletId) qc.invalidateQueries({ queryKey: outgoingInvitationKeys.list(walletId) });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, walletId, qc]);
}
