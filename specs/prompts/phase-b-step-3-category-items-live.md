# Prompt — Phase B · Step 3: category items management live (real data + CRUD)

> Paste this to the coding agent. Wire the **management** screens (Categories tab, items modal, item form) to real Supabase data and add item write mutations. Mirror the existing category patterns in `hooks/use-finance-mutations.ts` (optimistic cache updates, `meta: { silent: true }`, toasts, `categoryFormBridge`). Do **not** touch the Upcoming card/modal or the transaction form yet — they keep using fixtures for now, so **keep `data/__fixtures__/category-items.ts`**.

## 1. Item mutations — new `hooks/use-category-item-mutations.ts`

Mirror `use-finance-mutations.ts` (react-query, `useWallet().walletId`, optimistic updates on `financeKeys.categoryItems(walletId)`, invalidate on settle):

- **`useCreateCategoryItem`** — input `{ categoryId, name, defaultAmountCents?, recurrence, nextDueOn? }`. Insert into `category_items`: `wallet_id` (from `useWallet`), `category_id`, `name`, `default_amount_cents` (or null), `recurrence`, `next_due_on` (`null` when `recurrence === 'none'`, else the `YYYY-MM-DD` string). Return the created row (adapt to `CategoryItem`).
- **`useUpdateCategoryItem`** — input `{ id, name, defaultAmountCents?, recurrence, nextDueOn? }`. Update the same fields by `id`.
- **`useArchiveCategoryItem`** — input `{ id, archived: boolean }`. Sets `archived_at = archived ? new Date().toISOString() : null`.
- **`useDeleteCategoryItem`** — deletes by `id`. Deleting an item that transactions link to fails with a Postgres FK-restrict error (code `23503`); export an `isCategoryItemInUseError(err)` helper (mirror `isCategoryHasTransactionsError`) so the UI can show a friendly "in use" message instead of a raw error.

Keep amounts in cents at the DB boundary; the domain `CategoryItem.defaultAmount` stays major-units.

## 2. Item form modal — `app/(modals)/category-item-form.tsx`

Replace the fixture/placeholder logic with real data + mutations:

- **Edit hydration:** resolve the edited item from `useCategoryItems()` by `editId` (not `MOCK_CATEGORY_ITEMS`).
- **Save:** create (no `editId`) or update — wire to the mutations; on success `toast.success(...)`, emit on the `categoryFormBridge` (a bridge id passed in via route params like `category-form` does) so the opener refreshes/closes, then `router.back()`.
- **Archive** (edit only): `useArchiveCategoryItem({ id, archived: true })` → toast + bridge emit + back. (Un-archive path can reuse the same mutation with `archived: false` when opened on an archived item — label it "Desarquivar" in that case.)
- **Delete** (edit only): `useDeleteCategoryItem`; on `isCategoryItemInUseError`, show an inline warning (reuse the `ModalActions` `warning` slot) like `t('categoryItemForm.inUseWarning', { count })` — don't crash. Otherwise toast + bridge emit + back.
- Add the needed route param `bridgeId` to `categoryItemFormHref` (mirror `categoryFormHref`) and pass it from the openers (items modal + upcoming rows).
- Wire the save `disabled`/`loading` states to the mutation `isPending`.

## 3. Categories tab — `app/(tabs)/categories/index.tsx`

- Replace `MOCK_CATEGORIES` with `useCategories()` and the item counts with `useCategoryItems()` (count non-archived per `categoryId`). Loading state: reuse an existing skeleton or a simple spinner; empty state stays.
- Wire the **Add category** button (currently `// TODO(step 5)`) to open the existing `category-form` modal via `categoryFormHref({ bridgeId })`, subscribing to the bridge to refresh.

## 4. Items modal — `app/(modals)/category-items.tsx`

- Replace `MOCK_CATEGORY_ITEMS` with `useCategoryItems()` filtered by the route `id`; Ativos/Arquivados split by `archivedAt`.
- The **Add item** and row taps already route to `category-item-form`; pass a `bridgeId` and subscribe so the list reflects create/edit/archive/delete without a manual refresh.

## Constraints & acceptance

- Categories tab, items modal, and item form all read **real** wallet data via `useCategories`/`useCategoryItems`; creating/editing/archiving/deleting an item persists to Supabase and the lists update (optimistically, then reconciled).
- Deleting an in-use item shows the friendly "in use" warning (FK-restrict caught), not a crash.
- Archive moves an item to the Arquivados tab (and out of active counts); un-archive restores it.
- The Upcoming card/modal and the transaction form are **unchanged** and still compile against fixtures; `data/__fixtures__/category-items.ts` remains.
- New i18n keys added to all three locales (`categoryItemForm.inUseWarning`, archive/unarchive labels, any toasts). Repo typecheck passes; ESLint clean; no console errors.
