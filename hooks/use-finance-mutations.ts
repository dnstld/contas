import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  TransactionFormValues,
  TransactionType,
} from '@/components/transactions/transaction-form';
import { transactionDate, type Category, type Transaction } from '@/data/finance-types';
import { useAuth } from '@/hooks/use-auth';
import { useDemoMode } from '@/hooks/use-demo-mode';
import { adaptTransaction, financeKeys } from '@/hooks/use-finance-queries';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';

export class DemoModeReadOnlyError extends Error {
  readonly code = 'demo_mode_read_only' as const;

  constructor() {
    super('Demo mode is read-only');
    this.name = 'DemoModeReadOnlyError';
  }
}

export function isDemoModeReadOnlyError(e: unknown): e is DemoModeReadOnlyError {
  return e instanceof DemoModeReadOnlyError;
}

function ensureCategoryId(values: TransactionFormValues): string {
  if (!values.categoryId) throw new Error('categoryId is required');
  return values.categoryId;
}

// Keep the cached transaction list ordered like `fetchTransactionRows`
// (`occurred_at` descending). `transactionDate` returns the ISO `occurred_at`,
// so a lexical string compare matches the server ordering.
function sortTransactionsByDateDesc(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) => transactionDate(b).localeCompare(transactionDate(a)));
}

export function useCreateTransaction() {
  const { walletId } = useWallet();
  const { enabled: demoMode } = useDemoMode();
  const { session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    // The create screen renders errors inline via `TransactionForm.errorMessage`;
    // suppress the global toast to avoid double-surfacing the same failure.
    meta: { silent: true },
    mutationFn: async (values: TransactionFormValues) => {
      if (demoMode) throw new DemoModeReadOnlyError();
      if (!walletId) throw new Error('no wallet');
      if (!session) throw new Error('no session');
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
          created_by: session.user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!walletId) return;
      // Patch the inserted row into the cached list so it shows instantly, before
      // the realtime echo / invalidate refetch reconciles. Requires the categories
      // cache to denormalize `categoryName`/`type`; if it's missing, skip the patch
      // and let the invalidate below produce the correct list.
      const categories = qc.getQueryData<Category[]>(financeKeys.categories(walletId));
      if (categories) {
        const categoryById = new Map(categories.map((c) => [c.id, c]));
        const created = adaptTransaction(data, categoryById);
        qc.setQueryData<Transaction[]>(financeKeys.transactions(walletId), (old) =>
          sortTransactionsByDateDesc([...(old ?? []), created]),
        );
      }
      qc.invalidateQueries({ queryKey: financeKeys.transactions(walletId) });
    },
  });
}

export type UpdateTransactionInput = {
  id: string;
  values: TransactionFormValues;
};

export function useUpdateTransaction() {
  const { walletId } = useWallet();
  const { enabled: demoMode } = useDemoMode();
  const qc = useQueryClient();

  return useMutation({
    meta: { silent: true },
    mutationFn: async ({ id, values }: UpdateTransactionInput) => {
      if (demoMode) throw new DemoModeReadOnlyError();
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
    onSuccess: (data, { id }) => {
      if (!walletId) return;
      // Patch the updated row into the cached list (re-sorting, since `occurred_at`
      // may have changed) for instant feedback; the invalidates reconcile.
      const categories = qc.getQueryData<Category[]>(financeKeys.categories(walletId));
      if (categories) {
        const categoryById = new Map(categories.map((c) => [c.id, c]));
        const updated = adaptTransaction(data, categoryById);
        qc.setQueryData<Transaction[]>(financeKeys.transactions(walletId), (old) =>
          old ? sortTransactionsByDateDesc(old.map((t) => (t.id === id ? updated : t))) : old,
        );
      }
      qc.invalidateQueries({ queryKey: financeKeys.transactions(walletId) });
      // The detail query key carries a `demo|live` suffix and `setQueryData` is
      // exact-match, so we can't patch it directly here — invalidate (prefix-match)
      // refetches the single row, which is fast.
      qc.invalidateQueries({ queryKey: financeKeys.transaction(walletId, id) });
    },
  });
}

export function useCreateCategory() {
  const { walletId } = useWallet();
  const { enabled: demoMode } = useDemoMode();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: {
      name: string;
      type: TransactionType;
      monthlyBudgetCents?: number;
    }) => {
      if (demoMode) throw new DemoModeReadOnlyError();
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
    onSuccess: (data, variables) => {
      if (!walletId) return;
      // Append to the categories cache immediately so the new card shows without
      // waiting on a refetch (queries use `staleTime: Infinity`).
      const created: Category = {
        id: data.id,
        name: variables.name,
        type: variables.type,
        monthlyBudget:
          variables.monthlyBudgetCents != null ? variables.monthlyBudgetCents / 100 : undefined,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<Category[]>(financeKeys.categories(walletId), (old) =>
        old ? [...old, created] : [created],
      );
      // Reconcile with the server (canonical id, createdAt, ordering).
      qc.invalidateQueries({ queryKey: financeKeys.all(walletId) });
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
  const { enabled: demoMode } = useDemoMode();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: { id: string; name: string; monthlyBudgetCents?: number }) => {
      if (demoMode) throw new DemoModeReadOnlyError();
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
    onSuccess: (_data, variables) => {
      if (!walletId) return;
      // Update the categories cache directly so the renamed value is reflected
      // immediately (queries use `staleTime: Infinity`).
      qc.setQueryData<Category[]>(financeKeys.categories(walletId), (old) =>
        old?.map((c) =>
          c.id === variables.id
            ? {
                ...c,
                name: variables.name,
                monthlyBudget:
                  variables.monthlyBudgetCents != null
                    ? variables.monthlyBudgetCents / 100
                    : undefined,
              }
            : c,
        ),
      );
      // Reconcile with the server and refresh transactions (which denormalize
      // `categoryName`).
      qc.invalidateQueries({ queryKey: financeKeys.all(walletId) });
    },
  });
}

export function useDeleteCategory() {
  const { walletId } = useWallet();
  const { enabled: demoMode } = useDemoMode();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (demoMode) throw new DemoModeReadOnlyError();
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
    onSuccess: (id) => {
      if (!walletId) return;
      // Drop from the categories cache immediately so the card disappears
      // without waiting on a refetch (queries use `staleTime: Infinity`).
      qc.setQueryData<Category[]>(financeKeys.categories(walletId), (old) =>
        old?.filter((c) => c.id !== id),
      );
      qc.invalidateQueries({ queryKey: financeKeys.all(walletId) });
    },
  });
}

export function useDeleteTransaction() {
  const { walletId } = useWallet();
  const { enabled: demoMode } = useDemoMode();
  const qc = useQueryClient();

  return useMutation({
    meta: { silent: true },
    mutationFn: async (id: string) => {
      if (demoMode) throw new DemoModeReadOnlyError();
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      if (walletId) {
        // Drop the row from the cached list immediately; the invalidate reconciles.
        qc.setQueryData<Transaction[]>(financeKeys.transactions(walletId), (old) =>
          old?.filter((t) => t.id !== id),
        );
        qc.invalidateQueries({ queryKey: financeKeys.transactions(walletId) });
        qc.removeQueries({ queryKey: financeKeys.transaction(walletId, id) });
      }
    },
  });
}
