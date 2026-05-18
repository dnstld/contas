import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  TransactionFormValues,
  TransactionType,
} from '@/components/transactions/transaction-form';
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

export function useCreateCategory() {
  const { walletId } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: {
      name: string;
      type: TransactionType;
      monthlyBudgetCents?: number;
    }) => {
      if (!walletId) throw new Error('no wallet');
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: values.name,
          type: values.type,
          wallet_id: walletId,
          ...(values.monthlyBudgetCents != null && {
            monthly_budget_cents: values.monthlyBudgetCents,
          }),
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (walletId) {
        qc.invalidateQueries({ queryKey: financeKeys.categories(walletId) });
      }
    },
  });
}

export class CategoryHasTransactionsError extends Error {
  readonly code = 'has_transactions' as const;
  readonly transactionCount: number;

  constructor(transactionCount: number) {
    super(`Category has ${transactionCount} transactions`);
    this.name = 'CategoryHasTransactionsError';
    this.transactionCount = transactionCount;
  }
}

export function isCategoryHasTransactionsError(e: unknown): e is CategoryHasTransactionsError {
  return e instanceof CategoryHasTransactionsError;
}

export function useUpdateCategory() {
  const { walletId } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: { id: string; name: string; monthlyBudgetCents?: number }) => {
      const { data, error } = await supabase
        .from('categories')
        .update({
          name: values.name,
          monthly_budget_cents: values.monthlyBudgetCents ?? null,
        })
        .eq('id', values.id)
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (walletId) {
        qc.invalidateQueries({ queryKey: financeKeys.categories(walletId) });
      }
    },
  });
}

export function useDeleteCategory() {
  const { walletId } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id);
      if (countError) throw countError;
      if (count && count > 0) {
        throw new CategoryHasTransactionsError(count);
      }
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      if (walletId) {
        qc.invalidateQueries({ queryKey: financeKeys.categories(walletId) });
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
