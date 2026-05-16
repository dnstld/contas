import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TransactionFormValues } from '@/components/transactions/transaction-form';
import { financeKeys } from '@/hooks/use-finance-queries';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';

function ensureCategoryId(values: TransactionFormValues): string {
  if (!values.categoryId) throw new Error('categoryId is required');
  return values.categoryId;
}

export function useCreateTransaction() {
  const { walletId } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      if (!walletId) throw new Error('no wallet');
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          wallet_id: walletId,
          category_id: ensureCategoryId(values),
          amount_cents: values.amountCents,
          description: values.description,
          occurred_at: values.date.toISOString(),
          status: 'completed',
          recurrence: 'none',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (walletId) {
        qc.invalidateQueries({ queryKey: financeKeys.transactions(walletId) });
      }
    },
  });
}

export type UpdateTransactionInput = {
  id: string;
  values: TransactionFormValues;
};

export function useUpdateTransaction() {
  const { walletId } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: UpdateTransactionInput) => {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          category_id: ensureCategoryId(values),
          amount_cents: values.amountCents,
          description: values.description,
          occurred_at: values.date.toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (walletId) {
        qc.invalidateQueries({ queryKey: financeKeys.transactions(walletId) });
      }
    },
  });
}

export function useDeleteTransaction() {
  const { walletId } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      if (walletId) {
        qc.invalidateQueries({ queryKey: financeKeys.transactions(walletId) });
      }
    },
  });
}
