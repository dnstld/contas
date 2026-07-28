# Category Items & Upcoming Expenses — Implementation Plan

_Contas · React Native (Expo Router) + Supabase · drafted 2026-07-28_

## 1. Goal

Replace today's implicit "descriptions derived from transaction history" with an explicit, user-curated model:

- A new **Categories** tab where the user manages categories **and** their **items** (the named descriptions like "Netflix", "Apple").
- Only curated items are suggested in the transaction form. A description typed by hand still saves, but is **never** auto-added to the suggestion list.
- Items can carry an **expected amount** and a **recurrence** (daily / weekly / monthly). Recurring items drive an **Upcoming expenses** (and upcoming income) forecast for the next 30 days, with one-tap "Log" to record the real transaction.

### Decisions locked (from our discussion)

| Topic | Decision |
|---|---|
| Free-text policy | Allow free text; unlisted typed descriptions save but are never suggested |
| Menu placement | New dedicated bottom tab |
| Transaction ↔ item link | Store a pointer (`category_item_id` FK) **and** the text |
| Upcoming model | Forecast + tap to log (nothing unconfirmed hits totals) |
| Item fields | Optional expected amount; recurrence also allowed on income categories |
| Migration | Backfill the top-used descriptions per category and link matching history |
| Delete behavior | Block deletion while any transaction links to the item (reassign first) |
| Recurrence input | Frequency + anchor "next due" date |
| Upcoming window | Rolling next 30 days |
| Lifecycle | Three states — **active**, **archived** (hidden going forward, history kept, reversible), **deleted** (unused only). Applies to items **and** categories |
| Suggestion decay | Recency-based auto-hide **plus** manual archive |
| Bounded recurrence | Optional: **open-ended** (default), **until a date**, or **for N payments** (installments / _parcelas_). Auto-archives on completion. Soft cap `RECURRENCE_MAX_MONTHS` = 60 |
| Recurrence frequencies | `none · daily · weekly · monthly · yearly` — **`yearly` added** to the shared enum (covers annual subscriptions, insurance, renewals) |
| Rename behavior | Transactions keep the **description text captured at save time**; the item link drives grouping/analytics/upcoming. Renaming an item does not rewrite historical rows (audit-accurate) |

### Naming note

Throughout this plan the entity is called a **category item** (DB `category_items`, UI label "item"). This is a proposal — if you prefer "label", "preset", or "recurring item", it's a find-replace before we start.

---

## 2. Current state (what we're changing)

- `categories` is a real per-wallet table (`name`, `type`, `monthly_budget_cents`) with full CRUD via the `category-form` modal and `category-select` modal.
- **Descriptions are not stored** — they're computed on the fly by `rankDescriptionsByUsage` (`data/finance-aggregations.ts:126`) from transaction history, ranked most-used then most-recent, capped at `MOST_USED_DESCRIPTIONS_LIMIT` (5). Rendered as `QuickPickChips` under the "What for" field in `components/transactions/transaction-form.tsx`.
- `transactions` already has dormant `recurrence` (`none|daily|weekly|monthly`) and `status` (`completed|scheduled`) columns, but inserts hard-code `recurrence:'none'` / `status:'completed'` and no "Upcoming" UI exists. **We build upcoming on the new item entity, not on these columns.**
- 3 tabs today: `(status)` (balance), `transactions`, `account`. Tab bar is `NativeTabs` in `app/(tabs)/_layout.tsx`.
- RLS pattern: every table is wallet-scoped and gated by `is_wallet_member(wallet_id)`. Categories carry a denormalized `wallet_id` for exactly this reason.

---

## 3. Data model

### 3.1 New table `category_items`

```sql
create table public.category_items (
  id                  uuid primary key default gen_random_uuid(),
  wallet_id           uuid not null references public.wallets(id)    on delete cascade,
  category_id         uuid not null references public.categories(id) on delete cascade,
  name                text not null check (char_length(name) between 1 and 40),
  default_amount_cents bigint check (default_amount_cents is null or default_amount_cents >= 0),
  recurrence          text not null default 'none'
                        check (recurrence in ('none','daily','weekly','monthly','yearly')),
  -- Anchor for the recurrence: the next date the charge is expected.
  -- Required when recurrence <> 'none', must be null when 'none'.
  next_due_on         date,
  -- Bounded recurrence (optional). Both null = open-ended (subscriptions, salary).
  --   recurrence_end_on    : last date an occurrence should be generated.
  --   recurrence_total_count: total occurrences when the user thinks in "N payments"
  --                           (installments / parcelas); enables "3 of 12" display.
  -- When the user enters a count, we compute end_on = anchor + (N-1)*period at save.
  recurrence_end_on    date,
  recurrence_total_count int check (recurrence_total_count is null or recurrence_total_count >= 1),
  -- Lifecycle: null = active; set = archived (hidden from suggestions/upcoming,
  -- history preserved, reversible). Distinct from a hard delete.
  archived_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint category_items_recurrence_anchor_ck check (
    (recurrence = 'none' and next_due_on is null) or
    (recurrence <> 'none' and next_due_on is not null)
  ),
  -- Bounds only make sense on a recurring item.
  constraint category_items_recurrence_bounds_ck check (
    recurrence <> 'none' or (recurrence_end_on is null and recurrence_total_count is null)
  )
);

create unique index category_items_cat_name_idx
  on public.category_items (category_id, lower(name));
create index category_items_wallet_idx on public.category_items (wallet_id);
create index category_items_due_idx
  on public.category_items (wallet_id, next_due_on)
  where recurrence <> 'none' and archived_at is null;

create trigger category_items_set_updated_at
  before update on public.category_items
  for each row execute function public.tg_set_updated_at();
```

Notes:
- `wallet_id` is denormalized (same as `categories`) so RLS can use `is_wallet_member(wallet_id)` without a join.
- Item **type** (expense/income) is inherited from its parent category — no separate column.
- A trigger enforces `wallet_id` matches the parent category's wallet and blocks re-parenting to another wallet (mirror the spirit of existing hardening migration).
- **Three lifecycle states** (see §3.5): `archived_at is null` = active; `archived_at` set = archived (the common "I cancelled Netflix" path); hard delete stays available but is **blocked while in use** via the FK below.

### 3.2 Alter `transactions`

```sql
alter table public.transactions
  add column category_item_id uuid
    references public.category_items(id) on delete restrict;

create index transactions_item_idx
  on public.transactions (category_item_id)
  where category_item_id is not null;
```

- `on delete restrict` **is** the "block if in use" mechanism: Postgres refuses to delete an item that any transaction points at. The app catches the FK error and tells the user to reassign first.
- A DB trigger (or app-level guard) validates that `category_item_id`'s `category_id` equals the transaction's `category_id` and the same `wallet_id`, so an item can't be attached under the wrong category.
- **`yearly` is a shared-enum change:** the same migration must drop/recreate the existing `transactions_recurrence_check` to add `'yearly'`, and the app's `RecurrenceSchema` (`data/schemas.ts`) + `Recurrence` type (`data/finance-types.ts`) gain `'yearly'`. No existing transaction rows use it, so the widening is backward-compatible.

### 3.3 RLS (mirror `categories`)

```sql
alter table public.category_items enable row level security;

create policy category_items_select_member on public.category_items
  for select using (public.is_wallet_member(wallet_id));
create policy category_items_insert_member on public.category_items
  for insert with check (public.is_wallet_member(wallet_id));
create policy category_items_update_member on public.category_items
  for update using (public.is_wallet_member(wallet_id))
             with check (public.is_wallet_member(wallet_id));
create policy category_items_delete_member on public.category_items
  for delete using (public.is_wallet_member(wallet_id));
```

### 3.4 Category lifecycle (archive)

Same churn happens at the category level ("I don't have that category in 2026"), so mirror the flag on `categories`:

```sql
alter table public.categories add column archived_at timestamptz;
```

Archived categories are hidden from the picker and current-period views but retained for historical periods. This is an explicit version of the instinct already in `isCategoryVisibleInYear` (`data/finance-aggregations.ts`), which scopes category visibility by year. Archiving a category does **not** cascade-archive its items automatically, but the item list can offer "archive all items too" as a convenience. A category with active items should warn before archiving.

### 3.5 The three lifecycle states (applies to items and categories)

| State | Suggested / forecast? | In reports & history? | Reversible? | When |
|---|---|---|---|---|
| **Active** | yes | yes | — | in use |
| **Archived** | no (hidden going forward) | yes (past periods unchanged) | yes (un-archive) | "I cancelled it / don't use it anymore" |
| **Deleted** | n/a | removed | no | mistake / never used — **blocked while any transaction links to it** |

For a recurring item, a **Stop / Cancel** action = set `archived_at` (and it drops out of Upcoming immediately). Un-archiving a recurring item prompts for a fresh `next_due_on`.

**Auto-archive on completion.** A bounded item (§6.2) archives itself the moment it's done — when `next_due_on` would pass `recurrence_end_on`, or the count of logged occurrences reaches `recurrence_total_count`. So a "12x" installment or a fixed-term contract cleans itself up with no user action, and the final Upcoming row can read "last payment".

### 3.6 Optional: free-tier cap

If we want to bound list size, add `max_items_per_category` to the `free_tier_limits()` jsonb (one line, no app release — same pattern as wallets/invites) and enforce in an insert RPC or trigger. **Recommendation:** ship without a cap; add later only if needed.

---

## 4. Migration: backfill top-used descriptions

One-off data migration, run after the schema migration, per wallet + category:

1. For each `(wallet_id, category_id)`, gather distinct `lower(trim(description))` from `transactions` where description is non-empty **and** `char_length <= 40` (item name cap), with a usage count.
2. Take the top **5** by count (ties: most recent `created_at`) — mirrors today's `MOST_USED_DESCRIPTIONS_LIMIT` and skips one-off noise.
3. Insert those as `category_items` (recurrence `none`, no amount), using the most-recent original casing as the display name.
4. `update transactions t set category_item_id = i.id from category_items i where i.category_id = t.category_id and lower(t.description) = lower(i.name)` — links **all** matching history (not just the top-5 rows), so per-item analytics is populated from day one.

Edge cases documented in the migration:
- Descriptions longer than 40 chars can't become items → left as unlinked free text.
- Case/whitespace folding matches the current suggestion logic ("Uber" == "uber ").
- Idempotent: guard with `on conflict (category_id, lower(name)) do nothing`.

Deliverables: `supabase/migrations/<ts>_category_items.sql` (schema + RLS + trigger) and `<ts>_backfill_category_items.sql` (data). Then regenerate `types/database.types.ts` (`supabase gen types typescript`).

---

## 5. App layer (TypeScript)

### 5.1 Types — `data/finance-types.ts`

```ts
export type CategoryItem = {
  id: string;
  categoryId: string;
  name: string;
  defaultAmount?: number;          // major units, like Category.monthlyBudget
  recurrence: Recurrence;          // reuse existing enum
  nextDueOn?: string;              // 'YYYY-MM-DD' (day-only, like transaction dates)
  recurrenceEndOn?: string;        // 'YYYY-MM-DD'; undefined = open-ended
  recurrenceTotalCount?: number;   // set for installment/count-based items ("k of N")
};
```

Add `categoryItemId: string | null` to `TransactionBase`. Extend `Finance` with `categoryItems: CategoryItem[]`.

### 5.2 Schemas — `data/schemas.ts`

Add a `CategoryItemRowSchema` (reusing `RecurrenceSchema`) validating the Supabase row at the boundary, consistent with the existing narrow-guard approach.

### 5.3 Queries — `hooks/use-finance-queries.ts`

- Add `financeKeys.categoryItems(walletId)`.
- Add `fetchCategoryItems(walletId)` + `useCategoryItems()`; fold the result into `useFinance()` so the form and management screens share one cache.
- Add `category_item_id` to the two transaction `select(...)` column lists (lines ~84 and ~127).
- `adaptTransaction`: map `category_item_id → categoryItemId`.

### 5.4 Mutations

- `hooks/use-finance-mutations.ts`: include `category_item_id: values.categoryItemId ?? null` in create + update inserts.
- New `hooks/use-category-item-mutations.ts`: `useCreateCategoryItem`, `useUpdateCategoryItem`, `useArchiveCategoryItem` (toggles `archived_at`), `useDeleteCategoryItem`, and `useReassignItemTransactions(fromItemId, toItemId | null)` with optimistic cache updates (mirror category mutations). Delete surfaces the FK-restrict error as a friendly "This item is used by N transactions — reassign or archive it instead." Add `useArchiveCategory` alongside the existing category mutations.
- `useLogUpcomingItem(itemId)`: creates a transaction (amount = `defaultAmount`, category = item's category, `description` = item name, `category_item_id` = item id, date = the due date), then advances the item's `next_due_on` by its frequency. If advancing passes `recurrence_end_on` or the logged-occurrence count reaches `recurrence_total_count`, it **auto-archives** the item instead of advancing. Ideally one RPC so the insert + advance/complete are atomic.

### 5.5 Suggestions — `data/finance-aggregations.ts` + `transaction-form.tsx`

- Replace `rankDescriptionsByUsage(transactions, categoryId)` with `rankItemsForCategory(categoryItems, transactions, categoryId)` → returns the category's items ordered by linked-transaction usage (desc) then alphabetical, capped at the limit. (Keep `rankDescriptionsByUsage` only if the backfill reuses it; otherwise delete.) Excludes archived items, and applies **recency decay**: an item with no linked transaction in the last `SUGGESTION_ACTIVE_MONTHS` (default 12) drops out of suggestions automatically even if never manually archived. (Constant, tunable; a recurring item with a future `next_due_on` is exempt so active subscriptions never decay.)
- Picking an item chip sets **both** `description = item.name` and `categoryItemId = item.id`, and pre-fills the amount from `defaultAmount` when the amount field is still empty.
- Typing free text sets `categoryItemId = null` and creates **no** item.
- Nice-to-have: if typed text exactly matches an existing item name (case-insensitive), auto-link it (`categoryItemId = that id`).
- `TransactionFormValues` gains `categoryItemId: string | null`.

---

## 6. UI: the Categories tab

### 6.1 Navigation

- Add a 4th `NativeTabs.Trigger name="categories"` in `app/(tabs)/_layout.tsx` (label `tabs.categories`, an SF symbol like `folder.fill` / drawable equivalent).
- New route group `app/(tabs)/categories/` with `_layout.tsx` + `index.tsx`.

### 6.2 Screens

- **Categories list** (`categories/index.tsx`): reuse `SectionList` grouped by expense/income; each row shows category name + item count, opens the category's items. "Add category" reuses the existing `category-form` modal.
- **Category items screen**: list of items for one category — name, expected amount, and a recurrence badge (e.g. "Monthly · 5th"). Add / edit / delete items. Delete blocked-in-use shows the friendly error from 5.4.
- **Item form modal** (`app/(modals)/category-item-form.tsx`): fields — name; parent category (fixed when opened from a category, selectable when opened standalone); optional expected amount; recurrence segmented control (`none | daily | weekly | monthly` — plus `yearly` if §8b.8 is adopted). When recurrence ≠ none, reveal:
  - a **"Next due"** date picker (the anchor), and
  - a **"Repeat"** control with three options: **Forever** (default), **Until a date**, or **For N payments** (installments / _parcelas_). "Until a date" shows a date picker; "For N payments" shows a number stepper and a live "ends ~Jun 2027" hint. Both are bounded by `RECURRENCE_MAX_MONTHS` (60) — a soft guardrail on the picker, not a hard wall in data. On save, a count is converted to `recurrence_end_on = anchor + (N-1)·period` and `recurrence_total_count = N`; a date sets `recurrence_end_on` and leaves count null.

  Reuse the `categoryFormBridge` / `makeBridgeId` pattern so that launching "＋ Add item" from the transaction form returns and auto-selects the new item.

### 6.3 Routes — `constants/routes.ts`

Add `categoryItemsHref(categoryId)` and `categoryItemFormHref({ categoryId?, editId?, bridgeId, prefillName? })`, typed `Href`, following the existing `categoryFormHref` shape.

---

## 7. Upcoming expenses (forecast)

### 7.1 Forecast builder — `data/finance-aggregations.ts`

`buildUpcoming(categoryItems, now, windowDays = 30)`:

- Consider only **non-archived** items with recurrence ≠ none. Roll `nextDueOn` forward to today if it's in the past, then emit occurrences with due date in `[today, today + 30d]`.
- **Respect bounds:** never emit an occurrence after `recurrenceEndOn`, nor beyond `recurrenceTotalCount` (using the count of already-logged linked transactions as "paid so far"). Tag the terminal occurrence so the UI can show "last payment", and for count-based items expose "**k of N**" on each row.
- **Monthly** repeats on the anchor's day-of-month, clamped to the last day for short months (e.g. day 31 → Feb 28/29).
- **Weekly** repeats on the anchor's weekday; **daily** every day.
- To avoid a 30-row wall from daily items, expand monthly/weekly occurrences fully but collapse daily items to a single "daily" summary row. (Adjustable — flagged as a display detail.)
- Split results into **Upcoming expenses** and **Upcoming income** by the item's category type. Sort by due date ascending.

Pure and unit-testable; no dates via `new Date('YYYY-MM-DD')` — reuse `parseDayStart` / `toDayString` from `finance-types.ts` to stay timezone-safe.

### 7.2 Placement

Recommend a collapsible **"Upcoming · next 30 days"** section on the `(status)` balance tab (the financial overview), with amounts and a **Log** button per row wired to `useLogUpcomingItem`. Income items appear under an "Upcoming income" subsection, gated by the same `showRevenue` wallet setting the app already respects. _(Placement is a minor choice — easily moved into the Categories tab instead; call it if you'd prefer that.)_

---

## 8. i18n

Add keys to `i18n/locales/{pt-BR,en,de}.json` (pt-BR is the primary locale): `tabs.categories`; the items list + item-form strings; recurrence labels; the "Next due" picker; the **"Repeat" control (Forever / Until date / For N payments — pt-BR: _Sempre / Até a data / Por N parcelas_)** and the "k of N" / "last payment" labels; the Upcoming section headers; and the delete-in-use error. Remove/repurpose the now-unused starter-`suggestions` description keys if they become dead.

---

## 8b. Other lifecycle & UX cases worth folding in

Beyond archive/decay, these follow naturally from the curated + recurring model. Tagged **[v1]** (recommended for the first release, low cost / high value) or **[later]** (nice, can defer).

1. **Reassign transactions before delete [v1].** Because delete is blocked-in-use, the user needs an escape hatch: from an item, "Move its N transactions to → [another item / no item]", then delete. Without this, "block if in use" is a dead end. (`useReassignItemTransactions`, §5.4.)

2. **Already-logged reconciliation [v1].** In the forecast+log model, a user might log Netflix manually. If a transaction linked to the item already exists inside the current cycle, hide/mark that occurrence as "Logged" so Upcoming can't double-count. Guards against duplicate entries.

3. **Overdue vs. silent roll-forward [v1].** If a due date passes unlogged, don't silently advance and lose it — show the occurrence as **Overdue** with Log / Skip actions. Silent roll-forward would hide missed bills.

4. **Skip a single occurrence [v1].** "Paused this month" — a **Skip** action advances `next_due_on` by one cycle without creating a transaction. Distinct from Stop/archive (which ends it entirely).

5. **Expected-amount drift [v1].** When logging a recurring item at an amount different from `default_amount_cents` (e.g. Netflix $15.99 → $17.99), offer "Update expected amount to $17.99?" so forecasts stay accurate. One-tap, dismissible.

6. **Move item to another category [later].** Mis-filed items happen; editing `category_id` + re-checking the per-category name uniqueness. Relinked transactions keep their history.

7. **Merge duplicate items [later].** Post-backfill you may get near-dupes ("Netflix" / "netflix "). A merge action re-points one item's transactions to another and deletes the emptied one. Good cleanup tool right after migration.

8. **`yearly` recurrence [v1 — LOCKED IN].** Annual subscriptions/bills (domain renewal, insurance, yearly Apple/Amazon plans) are common, so `yearly` is added to the shared `Recurrence` enum (DB check on both `category_items` and `transactions`, plus `RecurrenceSchema`, the `Recurrence` type, and i18n labels). `buildUpcoming` treats it like monthly but at a 12-month step, with the same month-end day clamping; within a rolling 30-day window a yearly item yields at most one occurrence.

9. **Budget-aware upcoming [later].** Categories already have `monthly_budget_cents`. Upcoming rows could show "will use $X of your $Y Subscriptions budget", turning the forecast into a planning aid.

10. **Due-soon reminders [later].** Recurring items are a natural fit for a local push reminder ("Netflix due in 2 days"). No notification infra exists yet, so this is a separate, later effort — noted for the roadmap.

11. **Management-screen ergonomics [v1].** Sort active items first, collapse archived under a "Show archived" toggle, and give archived rows a clear badge + one-tap un-archive. Keeps the list clean without hiding history.



## 9. Rename behavior — LOCKED IN (option A)

**Renaming an item does not rewrite the description on old transactions.** Each transaction stores the description **text** captured at save time plus the item link. Display uses that saved text (audit-accurate — a row shows what was recorded then); the item link drives grouping, analytics, and upcoming. Renaming "Netflix" → "Netflix Family" leaves historical rows reading "Netflix" while still counting them under the item. (Rejected alternative: denormalizing the item's current name at read time, which would relabel history and lose the original text.)

---

## 10. Tests & verification

- **Unit (vitest, `data/__tests__/`)**: `buildUpcoming` (month-end clamping, 30-day window boundaries, daily collapse, past-anchor roll-forward, overdue detection, expense/income split, archived excluded, **bounds respected — stops at end_on / total_count, tags last payment, k-of-N**); `rankItemsForCategory` (archived excluded, recency-decay boundary, future-due recurring exempt); the next-due advance/skip helper and **count→end_on conversion**; auto-archive-on-completion; already-logged reconciliation; update the finance-aggregations snapshot.
- **Migration**: verify backfill picks the right top-5 and that `category_item_id` links all matching history; confirm idempotency and the 40-char skip.
- **RLS**: a non-member cannot read/write another wallet's items (mirror existing security tests).
- **Manual/E2E**: create category → add item with amount + monthly recurrence → see it in the transaction form quick-pick → log an upcoming occurrence → confirm the ledger entry and the advanced next-due; attempt to delete an in-use item and see the block.
- **Types**: `tsc` clean after regenerating `database.types.ts`.

---

## 11. Build workflow & delivery order

### 11.0 Working agreement (UI-first, prompt-driven)

This build runs **UI-first**: every screen is built as a static, production-fidelity mockup and approved *before* any data/logic is wired. Concretely:

- **Fidelity:** screens reuse the real design system (`SectionList`, `ListCardRow`/`SectionListRow`, `Chip`, `SegmentedControl`, `CurrencyInput`, `DatePicker`, `PressableButton`, `EmptyState`, `Badge`, `ModalFormScaffold`, `Stack.Screen` headers) and are **wired into navigation** (the new Categories tab is real) so Denis can click through on device. Only data and logic are stubbed.
- **Mock data:** a single typed fixtures module `data/__fixtures__/category-items.ts` exports sample `Category` / `CategoryItem` / upcoming rows using the plan's types (add the new types to `data/finance-types.ts` as type-only, no queries). Every Phase-A screen imports from here; later phases swap fixtures for real hooks.
- **Prompt-driven:** Claude does **not** edit code. Claude writes one prompt per step; Denis's agent applies it; Claude then reviews the changed files in the repo, adjusts anything it disagrees with, and commits before issuing the next prompt.

### 11.A Phase A — UI first (static, no logic)

One screen per step, each reviewed before the next:

1. **Categories tab** — new 4th tab + `categories/index.tsx`: list of categories grouped by expense/income, each row showing name + item count, tapping opens the items screen. Add-category affordance. Empty state.
2. **Category → items screen** — items list for one category: name, expected amount, recurrence badge ("Monthly · 5th", "12x · 3 of 12"), archived section behind a "Show archived" toggle. Add/edit affordances. Empty state.
3. **Item form modal** — `category-item-form.tsx` via `ModalFormScaffold`: name, expected amount, recurrence `SegmentedControl` (`none · daily · weekly · monthly · yearly`), and — when recurring — "Next due" `DatePicker` + the "Repeat" control (Forever / Until date / For N payments). Save/Delete/Archive buttons (visual only).
4. **Upcoming section** — the "Upcoming · next 30 days" surface (on the balance tab or its own screen), rows with amount, due date, "k of N"/overdue badges, and a Log button. Expense + income groupings.

### 11.B Phase B — logic & backend (after UI sign-off)

5. **DB**: schema migration + RLS + trigger + `transactions.category_item_id` (+ `yearly` enum widening); regenerate types.
6. **Backfill migration** + verification.
7. **Data/query/mutation layer**: schemas, `useCategoryItems`, transaction insert/update carry the link, `rankItemsForCategory`, the item CRUD/archive/reassign mutations.
8. **Wire the Phase-A screens** to real data + the transaction-form switch to curated items (parity with today, now curated).
9. **Recurrence engine**: `buildUpcoming` + `useLogUpcomingItem` with auto-archive-on-completion, "k of N", overdue/skip/already-logged, expected-amount drift prompt.
10. **Polish**: recency decay, merge duplicates, move-category, budget-aware upcoming, free-tier cap (optional), tests, empty states.

Locked pre-build decisions (see decisions table): `yearly` added to the shared enum; rename keeps saved text (§9).
