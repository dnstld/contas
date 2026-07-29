import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CategoryItem, Recurrence } from '@/data/finance-types';
import { RecurrenceSchema } from '@/data/schemas';
import { financeKeys } from '@/hooks/use-finance-queries';
import { useWallet } from '@/hooks/use-wallet';
import { supabase } from '@/utils/supabase';
import type { Tables } from '@/types/database.types';

type CategoryItemRow = Tables<'category_items'>;

// The `category_items` select in `use-finance-queries` omits the timestamp
// columns, so the adapter only needs the columns a write returns.
function adaptCategoryItem(row: Omit<CategoryItemRow, 'created_at' | 'updated_at'>): CategoryItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    defaultAmount: row.default_amount_cents == null ? undefined : row.default_amount_cents / 100,
    recurrence: RecurrenceSchema.catch('none').parse(row.recurrence),
    nextDueOn: row.next_due_on ?? undefined,
    archivedAt: row.archived_at ?? undefined,
  };
}

// `fetchCategoryItems` imposes no particular order, so a patch just replaces
// the matching row in place or appends a new one; the invalidate on settle
// reconciles ordering with the server.
function upsertItem(list: CategoryItem[] | undefined, item: CategoryItem): CategoryItem[] {
  const base = list ?? [];
  const idx = base.findIndex((it) => it.id === item.id);
  if (idx === -1) return [...base, item];
  const next = [...base];
  next[idx] = item;
  return next;
}

/**
 * Deleting a `category_item` that any transaction still links to fails with a
 * Postgres FK-restrict violation (code `23503`, `on delete restrict`). We
 * surface it as this typed error — mirroring `CategoryHasTransactionsError` —
 * so the item form can show a friendly "in use" message instead of a raw
 * database error.
 */
export class CategoryItemInUseError extends Error {
  readonly code = 'in_use' as const;
  readonly transactionCount: number;

  constructor(transactionCount: number) {
    super(`Category item is used by ${transactionCount} transactions`);
    this.name = 'CategoryItemInUseError';
    this.transactionCount = transactionCount;
  }
}

export function isCategoryItemInUseError(e: unknown): e is CategoryItemInUseError {
  return e instanceof CategoryItemInUseError;
}

export type CreateCategoryItemInput = {
  categoryId: string;
  name: string;
  defaultAmountCents?: number;
  recurrence: Recurrence;
  nextDueOn?: string;
};

export function useCreateCategoryItem() {
  const { walletId } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryItemInput) => {
      if (!walletId) throw new Error('no wallet');
      const nextDueOn = input.recurrence === 'none' ? null : (input.nextDueOn ?? null);
      const { data, error } = await supabase
        .from('category_items')
        .insert({
          wallet_id: walletId,
          category_id: input.categoryId,
          name: input.name,
          default_amount_cents: input.defaultAmountCents ?? null,
          recurrence: input.recurrence,
          next_due_on: nextDueOn,
        })
        .select(
          'id, category_id, name, default_amount_cents, recurrence, next_due_on, archived_at, wallet_id',
        )
        .single();
      if (error) throw error;
      return adaptCategoryItem(data);
    },
    onSuccess: (created) => {
      if (!walletId) return;
      // Patch the created item into the cache immediately (queries use
      // `staleTime: Infinity`); the invalidate reconciles id/ordering.
      qc.setQueryData<CategoryItem[]>(financeKeys.categoryItems(walletId), (old) =>
        upsertItem(old, created),
      );
      qc.invalidateQueries({ queryKey: financeKeys.categoryItems(walletId) });
    },
  });
}

export type UpdateCategoryItemInput = {
  id: string;
  name: string;
  defaultAmountCents?: number;
  recurrence: Recurrence;
  nextDueOn?: string;
};

export function useUpdateCategoryItem() {
  const { walletId } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCategoryItemInput) => {
      const nextDueOn = input.recurrence === 'none' ? null : (input.nextDueOn ?? null);
      const { data, error } = await supabase
        .from('category_items')
        .update({
          name: input.name,
          default_amount_cents: input.defaultAmountCents ?? null,
          recurrence: input.recurrence,
          next_due_on: nextDueOn,
        })
        .eq('id', input.id)
        .select(
          'id, category_id, name, default_amount_cents, recurrence, next_due_on, archived_at, wallet_id',
        )
        .single();
      if (error) throw error;
      return adaptCategoryItem(data);
    },
    onSuccess: (updated) => {
      if (!walletId) return;
      qc.setQueryData<CategoryItem[]>(financeKeys.categoryItems(walletId), (old) =>
        upsertItem(old, updated),
      );
      qc.invalidateQueries({ queryKey: financeKeys.categoryItems(walletId) });
    },
  });
}

export type ArchiveCategoryItemInput = {
  id: string;
  archived: boolean;
};

export function useArchiveCategoryItem() {
  const { walletId } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, archived }: ArchiveCategoryItemInput) => {
      const archivedAt = archived ? new Date().toISOString() : null;
      const { data, error } = await supabase
        .from('category_items')
        .update({ archived_at: archivedAt })
        .eq('id', id)
        .select(
          'id, category_id, name, default_amount_cents, recurrence, next_due_on, archived_at, wallet_id',
        )
        .single();
      if (error) throw error;
      return adaptCategoryItem(data);
    },
    onSuccess: (updated) => {
      if (!walletId) return;
      qc.setQueryData<CategoryItem[]>(financeKeys.categoryItems(walletId), (old) =>
        upsertItem(old, updated),
      );
      qc.invalidateQueries({ queryKey: financeKeys.categoryItems(walletId) });
    },
  });
}

export function useDeleteCategoryItem() {
  const { walletId } = useWallet();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('category_items').delete().eq('id', id);
      if (error) {
        // FK-restrict: some transaction still points at this item. Count them
        // so the UI can tell the user how many need reassigning first.
        if (error.code === '23503') {
          const { count } = await supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('category_item_id', id);
          throw new CategoryItemInUseError(count ?? 0);
        }
        throw error;
      }
      return id;
    },
    onSuccess: (id) => {
      if (!walletId) return;
      // Drop from the cache immediately; the invalidate reconciles.
      qc.setQueryData<CategoryItem[]>(financeKeys.categoryItems(walletId), (old) =>
        old?.filter((it) => it.id !== id),
      );
      qc.invalidateQueries({ queryKey: financeKeys.categoryItems(walletId) });
    },
  });
}
