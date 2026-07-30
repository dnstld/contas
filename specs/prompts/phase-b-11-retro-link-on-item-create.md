# Prompt — Retroactively link matching transactions when an item is created

> Paste this to the coding agent. Change `useCreateCategoryItem` in `hooks/use-category-item-mutations.ts` so that creating an item also links existing transactions in that category whose description matches the item name. Applies to both entry points (Save-in-transaction and the Categories tab item form), since both use this mutation. Keep the mutation's return value (the created `CategoryItem`) unchanged so callers don't break.

## Change — `useCreateCategoryItem` mutationFn

After inserting the item and adapting it, link matching transactions **before returning** (so the return type stays `CategoryItem`):

```ts
// ...after the insert returns `created` (adapted CategoryItem)...

// Retroactively link past transactions in this category whose description
// matches the new item's name (trimmed, case-insensitive) and aren't linked yet.
const norm = input.name.trim().toLowerCase();
const { data: candidates, error: fetchErr } = await supabase
  .from('transactions')
  .select('id, description')
  .eq('wallet_id', walletId)
  .eq('category_id', input.categoryId)
  .is('category_item_id', null);
if (fetchErr) throw fetchErr;

const matchIds = (candidates ?? [])
  .filter((t) => (t.description ?? '').trim().toLowerCase() === norm)
  .map((t) => t.id);

if (matchIds.length > 0) {
  const { error: linkErr } = await supabase
    .from('transactions')
    .update({ category_item_id: created.id })
    .in('id', matchIds);
  if (linkErr) throw linkErr;
}

return created;
```

(Normalizing in JS with `trim().toLowerCase()` matches the backfill's `lower(btrim(...))`. The `transactions_item_guard` trigger passes because we only touch transactions already in this item's category/wallet.)

## Change — onSuccess

Keep the existing `category_items` cache upsert + invalidate, and **also invalidate the transactions query** so the newly-linked rows (and item-usage ranking) reflect the links:

```ts
qc.invalidateQueries({ queryKey: financeKeys.transactions(walletId) });
```

(`financeKeys` is already imported.)

## Scope

- Only `useCreateCategoryItem` changes. Do **not** add retroactive matching to `useUpdateCategoryItem` (rename keeps existing links per the plan) or elsewhere.
- Caller signatures are unchanged: `saveTypedAsItem`'s `onSuccess: (item) => setCategoryItemId(item.id)` and the item form still receive the created `CategoryItem`.

## Acceptance

- Creating an item — from the transaction form's "Save" chip or the Categories tab — links every existing transaction in that category whose trimmed description equals the item name (case-insensitive) and had no link; already-linked transactions are untouched.
- The transactions list/cache refreshes so item usage (suggestion ranking) reflects the newly linked history.
- No user-visible change to descriptions or amounts; guard triggers still pass.
- Repo typecheck passes; ESLint clean; no console errors.
