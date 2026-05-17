import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { DeleteWalletResult } from '@/data/finance-types';
import { useAuth } from '@/hooks/use-auth';
import { walletKeys } from '@/hooks/use-wallet-list';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';

export function useCreateWallet() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: { name: string; currency: string }): Promise<string> => {
      const { data, error } = await supabase.rpc('create_wallet', {
        p_name: values.name,
        p_currency: values.currency,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: walletKeys.list(userId) });
    },
  });
}

export function useRequestOrDeleteWallet() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const { walletId, refresh } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (targetWalletId: string): Promise<DeleteWalletResult> => {
      const { data, error } = await supabase.rpc('request_or_delete_wallet', {
        p_wallet_id: targetWalletId,
      });
      if (error) throw error;
      return data as DeleteWalletResult;
    },
    onSuccess: async (result, targetWalletId) => {
      if (userId) qc.invalidateQueries({ queryKey: walletKeys.list(userId) });
      if (result === 'deleted' && walletId === targetWalletId) {
        await refresh();
      }
    },
  });
}

export function useConfirmWalletDeletion() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const { walletId, refresh } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (targetWalletId: string): Promise<void> => {
      const { error } = await supabase.rpc('confirm_wallet_deletion', {
        p_wallet_id: targetWalletId,
      });
      if (error) throw error;
    },
    onSuccess: async (_result, targetWalletId) => {
      if (userId) qc.invalidateQueries({ queryKey: walletKeys.list(userId) });
      if (walletId === targetWalletId) {
        await refresh();
      }
    },
  });
}

export function useCancelWalletDeletion() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (targetWalletId: string): Promise<void> => {
      const { error } = await supabase.rpc('cancel_wallet_deletion', {
        p_wallet_id: targetWalletId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: walletKeys.list(userId) });
    },
  });
}
