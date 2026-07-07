import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { financeKeys } from '@/hooks/use-finance-queries';
import { useAuth } from '@/hooks/use-auth';
import { useWalletList, walletKeys } from '@/hooks/use-wallet-list';
import { walletMemberKeys } from '@/hooks/use-wallet-members';
import { outgoingInvitationKeys } from '@/hooks/use-wallet-invitation';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';

function extractRowId(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'id' in value) {
    const { id } = value;
    if (typeof id === 'string') return id;
  }
  return undefined;
}

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
          // Invalidate the whole finance subtree, not just categories: transactions
          // denormalize `categoryName`, so a category rename by another user must
          // refresh the transaction lists too (mirrors `useUpdateCategory`).
          qc.invalidateQueries({ queryKey: financeKeys.all(walletId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletId, qc]);
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

/**
 * Keeps the active wallet valid. When the wallet the user is currently on
 * disappears from their membership list — e.g. a partner approved its deletion,
 * or they were removed from another device — the stored `walletId` would
 * otherwise dangle: the switcher falls back to another wallet's name while the
 * screen content stays bound to the dead id. Re-resolving fixes both, and
 * (because the previous wallet is gone) announces where the user lands.
 *
 * Only acts on *settled* list data so a stale cache mid-refetch (e.g. right
 * after accepting an invite) doesn't trigger a spurious re-resolve. Even if it
 * did, `resolve_default_wallet` honours the still-valid preferred wallet, so the
 * re-resolve is a no-op with no announcement.
 */
export function useActiveWalletReconciler() {
  const { walletId, refresh } = useWallet();
  const { data: wallets, isSuccess, isFetching } = useWalletList();

  useEffect(() => {
    if (!isSuccess || isFetching || !walletId || !wallets) return;
    if (wallets.some((w) => w.id === walletId)) return; // still a member — nothing to do
    void refresh({ announce: true });
  }, [isSuccess, isFetching, wallets, walletId, refresh]);
}
