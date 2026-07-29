# Prompt — Phase B · Step 2: data read layer (types, queries, link threading)

> Paste this to the coding agent. Goal: make the app compile again after the type regen, thread `category_item_id` through the transaction read path, and expose `category_items` as read data via a hook. No UI changes, no writes/mutations, no fixtures removed yet.

## 0. Migration cleanup

In `supabase/migrations/20260729075322_remote_schema.sql`, delete the stray first line `drop extension if exists "pg_net";` (a `db pull` artifact unrelated to this change). Leave the rest of the file as-is.

## 1. Domain type — `data/finance-types.ts`

Add the link to the transaction domain type: on `TransactionBase`, add `categoryItemId: string | null`. (`CategoryItem` already exists from Phase A.)

## 2. Schemas — `data/schemas.ts`

- Widen `RecurrenceSchema` to include `'yearly'`: `z.enum(['none','daily','weekly','monthly','yearly'])` (keeps runtime parsing in sync with the DB check and the `Recurrence` type).
- Add a narrow boundary schema for item rows, e.g. `CategoryItemRowSchema` validating `recurrence` via `RecurrenceSchema` (mirror the existing "guard the enums" approach; don't wholesale-validate every column).

## 3. Queries — `hooks/use-finance-queries.ts`

- **Fix the transaction selects:** add `category_item_id` to **both** transaction `select('…')` column lists (the paged `fetchTransactionRows` list and the single-transaction fetch around line ~127). This resolves the current `TransactionRow` type errors.
- **`adaptTransaction`:** add `categoryItemId: row.category_item_id ?? null` to the `base` object so both one-off and recurring transactions carry it.
- **New: `useCategoryItems()`** —
  - Add `financeKeys.categoryItems: (walletId) => ['finance', walletId, 'categoryItems'] as const`.
  - `fetchCategoryItems(walletId)`: `supabase.from('category_items').select('id, category_id, name, default_amount_cents, recurrence, next_due_on, archived_at, wallet_id').eq('wallet_id', walletId)`.
  - `adaptCategoryItem(row): CategoryItem` → `{ id, categoryId: row.category_id, name: row.name, defaultAmount: row.default_amount_cents == null ? undefined : row.default_amount_cents / 100, recurrence: RecurrenceSchema.catch('none').parse(row.recurrence), nextDueOn: row.next_due_on ?? undefined, archivedAt: row.archived_at ?? undefined }`. (Bounded fields `recurrenceEndOn`/`recurrenceTotalCount` stay undefined — no such columns.)
  - Export `useCategoryItems(): UseQueryResult<CategoryItem[]>` following the existing `useCategories` pattern (same enabled/`walletId` gating).

Do **not** change mutations, the transaction form, or any screen yet — those still read fixtures. This step only adds the read path and fixes types.

## Acceptance

- `supabase/migrations/20260729075322_remote_schema.sql` no longer contains the `drop extension … pg_net` line.
- `hooks/use-finance-queries.ts` compiles: both transaction selects include `category_item_id`; `adaptTransaction` sets `categoryItemId`; `useCategoryItems` + `financeKeys.categoryItems` + `adaptCategoryItem` exist.
- `RecurrenceSchema` includes `'yearly'`.
- Repo typecheck passes (the 2 prior errors are gone); ESLint clean; no console errors. No UI/behavior change.
