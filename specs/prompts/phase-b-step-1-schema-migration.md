# Prompt — Phase B · Step 1: schema migration (`category_items` + link + `yearly`)

> Paste this to the coding agent. This is the **first real backend change**. Create a Supabase migration (applied via the Supabase CLI), then regenerate the DB types. **No app/UI changes in this step** — schema + types only. Follow the conventions already in `supabase/migrations/` (especially `20260515220050_initial_schema.sql`).

## Existing helpers to reuse (already in the DB)

- `public.tg_set_updated_at()` — generic `updated_at` trigger.
- `public.is_wallet_member(wid uuid)` — RLS membership predicate.
- The `categories` table pattern: per-wallet, denormalized `wallet_id`, unique index on `lower(name)`.

## 1. Create the migration file

Run `supabase migration new category_items` to get a timestamped file in `supabase/migrations/`. Put all of the following in it.

### 1a. Table `category_items`

```sql
create table public.category_items (
  id                   uuid primary key default gen_random_uuid(),
  wallet_id            uuid not null references public.wallets(id)    on delete cascade,
  category_id          uuid not null references public.categories(id) on delete cascade,
  name                 text not null check (char_length(name) between 1 and 40),
  default_amount_cents bigint check (default_amount_cents is null or default_amount_cents >= 0),
  recurrence           text not null default 'none'
                         check (recurrence in ('none','daily','weekly','monthly','yearly')),
  -- Anchor: next expected date. Required when recurring, null when 'none'.
  next_due_on          date,
  -- Lifecycle: null = active; set = archived (hidden going forward, history kept).
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint category_items_recurrence_anchor_ck check (
    (recurrence = 'none' and next_due_on is null) or
    (recurrence <> 'none' and next_due_on is not null)
  )
);

create unique index category_items_cat_name_idx on public.category_items (category_id, lower(name));
create index category_items_wallet_idx on public.category_items (wallet_id);
create index category_items_due_idx
  on public.category_items (wallet_id, next_due_on)
  where recurrence <> 'none' and archived_at is null;

create trigger category_items_set_updated_at
  before update on public.category_items
  for each row execute function public.tg_set_updated_at();
```

> **Do not** add bounded-recurrence columns (`recurrence_end_on`, `recurrence_total_count`) — deferred by decision. Recurring items are open-ended until archived.

### 1b. Integrity trigger — item's `wallet_id` must match its category's wallet

```sql
create or replace function public.tg_category_items_wallet_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cat_wallet uuid;
begin
  select wallet_id into v_cat_wallet from public.categories where id = new.category_id;
  if v_cat_wallet is null or v_cat_wallet <> new.wallet_id then
    raise exception 'category_items.wallet_id (%) must match its category''s wallet (%)', new.wallet_id, v_cat_wallet;
  end if;
  return new;
end;
$$;

create trigger category_items_wallet_guard
  before insert or update of wallet_id, category_id on public.category_items
  for each row execute function public.tg_category_items_wallet_guard();
```

### 1c. RLS (mirror `categories`)

```sql
alter table public.category_items enable row level security;

create policy category_items_select_member on public.category_items
  for select using (public.is_wallet_member(wallet_id));
create policy category_items_insert_member on public.category_items
  for insert with check (public.is_wallet_member(wallet_id));
create policy category_items_update_member on public.category_items
  for update using (public.is_wallet_member(wallet_id)) with check (public.is_wallet_member(wallet_id));
create policy category_items_delete_member on public.category_items
  for delete using (public.is_wallet_member(wallet_id));
```

### 1d. Link column on `transactions` (block delete while in use)

```sql
alter table public.transactions
  add column category_item_id uuid references public.category_items(id) on delete restrict;

create index transactions_item_idx on public.transactions (category_item_id)
  where category_item_id is not null;
```

Add a trigger so a linked item must belong to the same category **and** wallet as the transaction:

```sql
create or replace function public.tg_transactions_item_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_item_cat uuid; v_item_wallet uuid;
begin
  if new.category_item_id is null then return new; end if;
  select category_id, wallet_id into v_item_cat, v_item_wallet
    from public.category_items where id = new.category_item_id;
  if v_item_cat is null or v_item_cat <> new.category_id or v_item_wallet <> new.wallet_id then
    raise exception 'transactions.category_item_id must reference an item in the same category and wallet';
  end if;
  return new;
end;
$$;

create trigger transactions_item_guard
  before insert or update of category_item_id, category_id, wallet_id on public.transactions
  for each row execute function public.tg_transactions_item_guard();
```

### 1e. Widen the shared `recurrence` enum to include `yearly` on `transactions`

The `transactions.recurrence` check currently allows `none|daily|weekly|monthly`. Drop and recreate it to add `yearly` (confirm the exact constraint name first — likely `transactions_recurrence_check` — via `\d public.transactions`):

```sql
alter table public.transactions drop constraint if exists transactions_recurrence_check;
alter table public.transactions
  add constraint transactions_recurrence_check
  check (recurrence in ('none','daily','weekly','monthly','yearly'));
```

No existing rows use `yearly`, so this only widens the allowed set (backward-compatible).

## 2. Apply + regenerate types

- Apply locally with the Supabase CLI (e.g. `supabase db reset` on a local stack, or `supabase migration up` / `supabase db push` per this repo's workflow).
- Regenerate `types/database.types.ts` (e.g. `supabase gen types typescript --local > types/database.types.ts`, or the project's existing gen command). Confirm `category_items` and `transactions.category_item_id` appear in the generated types.

## Acceptance

- Migration applies cleanly from scratch (`supabase db reset` succeeds) and is idempotent-safe in ordering.
- `category_items` exists with the columns/indexes/trigger above; RLS enabled with the four member policies.
- `transactions.category_item_id` exists (nullable, `on delete restrict`) with its guard trigger; the `recurrence` check now includes `yearly`.
- `types/database.types.ts` regenerated; `pnpm tsc` (or repo typecheck) passes with the new types (no app code consumes them yet — that's the next step).
- **No app/UI/fixtures changes in this step.**
