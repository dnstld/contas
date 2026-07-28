# Implementation Plan — Create transactions on behalf of another member

## Goal

Let a user record a transaction that belongs to **another wallet member** while
preserving who actually entered it. The person who tapped "save" stays the
actor; a new, explicit attribution field names the member the transaction is
_for_.

## Design decision (no workaround)

`transactions.created_by` already means **the actor** — it drives the avatar and
"You / <name>" label in the list via `useTransactionCreators` → `TransactionRow`.
We do **not** overwrite it. Instead we add one nullable column,
`on_behalf_of`, that references the beneficiary.

- `on_behalf_of IS NULL` → the transaction is for the creator (every existing
  row; fully backward compatible).
- `on_behalf_of = <member id>` → created by `created_by`, on behalf of that member.

This reuses the entire creator-resolution and row-rendering pipeline already in
place; the only genuinely new UI is one optional picker in the form and one
secondary label in the row.

---

## Layer-by-layer changes

### 1. Database — new additive migration

Create `supabase/migrations/<timestamp>_transaction_on_behalf_of.sql`
(follow the existing additive convention — never edit prior migrations):

```sql
-- Beneficiary of a transaction. NULL = the transaction is for its creator.
alter table public.transactions
  add column on_behalf_of uuid references public.profiles(id) on delete set null;

-- Optional: supports future per-member reporting without a table scan.
create index transactions_wallet_on_behalf_idx
  on public.transactions (wallet_id, on_behalf_of);

-- Two-arg membership helper (reuses the existing predicate shape). The original
-- is_wallet_member(uuid) keeps using auth.uid(); this overload takes any user.
create or replace function public.is_wallet_member(wid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wallet_members
    where wallet_id = wid and user_id = uid
  );
$$;
revoke execute on function public.is_wallet_member(uuid, uuid) from public;
grant  execute on function public.is_wallet_member(uuid, uuid) to authenticated, anon;

-- Enforce: the beneficiary must belong to the same wallet. RLS already forces
-- the *caller* to be a member; this guards the *beneficiary* on insert/update.
create or replace function public.tg_transactions_validate_on_behalf_of()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.on_behalf_of is not null
     and not public.is_wallet_member(new.wallet_id, new.on_behalf_of) then
    raise exception 'on_behalf_of must be a member of the wallet';
  end if;
  return new;
end;
$$;

create trigger transactions_validate_on_behalf_of
  before insert or update on public.transactions
  for each row execute function public.tg_transactions_validate_on_behalf_of();
```

Notes:
- Existing `transactions_insert_member` / `transactions_update_member` RLS
  policies are unchanged — they already require the caller to be a member.
- No backfill needed; `NULL` is the correct legacy value.
- After applying, **regenerate** `types/database.types.ts` so
  `Tables<'transactions'>` gains `on_behalf_of` (do not hand-edit).

### 2. Domain type — `data/finance-types.ts`

Add one field to `TransactionBase` (sits alongside `createdByUserId`):

```ts
onBehalfOfUserId: string | null;
```

### 3. Query adapter — `hooks/use-finance-queries.ts`

- Add `on_behalf_of` to **both** `.select('...')` column lists
  (`fetchTransactionRows` and the single-row query in `useTransaction`).
- In `adaptTransaction`, map it into the `base` object:
  `onBehalfOfUserId: row.on_behalf_of ?? null`.

That is the only read-path change; `useTransactions` / `useTransaction` flow
through `adaptTransaction`.

### 4. Form values + picker — `components/transactions/transaction-form.tsx`

- Extend `TransactionFormValues` with `onBehalfOfUserId: string | null`.
- Add state seeded from `initialValues?.onBehalfOfUserId ?? null`.
- Pull members with the existing `useWalletMembers()` hook.
- Render a new **"For whom"** field **only when the wallet has more than one
  member** (solo wallets never see it). Reuse the existing `QuickPickChips`
  molecule — the same surface already used for categories/descriptions:
  - First chip = "Myself" → sets `onBehalfOfUserId = null` (selected by default).
  - One chip per other member (label = first name) → sets their `userId`.
- Include `onBehalfOfUserId` in the `onSubmit({...})` payload.

Because `edit.tsx` renders the same `TransactionForm`, editing gets the picker
for free.

### 5. Mutations — `hooks/use-finance-mutations.ts`

- `useCreateTransaction`: add `on_behalf_of: values.onBehalfOfUserId` to the
  `.insert({...})`.
- `useUpdateTransaction`: add `on_behalf_of: values.onBehalfOfUserId` to the
  `.update({...})` so attribution is editable.

The optimistic-cache patch already runs the row through `adaptTransaction`, so
the new field is picked up with no extra work.

### 6. Edit modal — `app/(modals)/edit.tsx`

Add `onBehalfOfUserId: transaction.onBehalfOfUserId` to the `initialValues`
passed into `TransactionForm`.

### 7. List display — reuse `useTransactionCreators` + extend `TransactionRow`

Chosen presentation: **beneficiary avatar as primary, "added by You" as the
secondary attribution line.**

```
[Maria avatar]  Groceries
                Maria · added by You            -R$ 50,00
```

- `components/ui/molecules/transaction-row.tsx`: add an optional
  `beneficiary?: TransactionRowCreator | null` prop (same shape the actor
  already uses). When it is present and not the actor:
  - `leading` Avatar uses the **beneficiary's** avatar/name.
  - `text1` becomes an on-behalf label:
    `t('transactions.onBehalf', { beneficiary, actor })`
    → e.g. `"Maria · added by You"` (actor = `You` when `creator.isMe`, else
    first name).
  - When `beneficiary` is `null`, the row renders exactly as today — zero
    behavior change for existing transactions.
- `app/(tabs)/transactions/index.tsx`: the `resolveCreator` resolver from
  `useTransactionCreators` already returns `null` for a `null` id and caches per
  user. Pass a second resolved value straight through:
  ```tsx
  <TransactionRow
    ...
    creator={resolveCreator(item.createdByUserId)}
    beneficiary={resolveCreator(item.onBehalfOfUserId)}
  />
  ```
  No new hook, no new query — `on_behalf_of` members are wallet members, so
  they are already in the `useWalletMembers` cache the resolver reads.

### 8. Optional polish — duplicate warning card

`components/transactions/duplicate-warning-modal.tsx` already resolves a member
from `createdByUserId`. If desired, mirror the row and show the beneficiary
there too. Low priority; can ship in a follow-up.

### 9. i18n — `i18n/locales/{en,pt-BR,de}.json`

Add, next to the existing `transactions.createdByYou`:

| key | en | pt-BR | de |
| --- | --- | --- | --- |
| `create.forWhomLabel` | For whom | Para quem | Für wen |
| `create.forWhomMyself` | Myself | Eu mesmo | Ich selbst |
| `transactions.onBehalf` | {{beneficiary}} · added by {{actor}} | {{beneficiary}} · lançado por {{actor}} | {{beneficiary}} · erfasst von {{actor}} |
| `transactions.addedByYou` | You | Você | Du |

(Reuse `transactions.createdByYou` if you prefer a single "You" string.)

---

## Testing

Reuse the existing `data/__tests__` + `vitest` setup:

- Unit-test the pure attribution label logic extracted in `TransactionRow`
  (actor-only vs. on-behalf) — mirrors the existing `resolveCreatorLabel`.
- Extend an `adaptTransaction` test to assert `onBehalfOfUserId` maps from
  `on_behalf_of`.
- Form: default `onBehalfOfUserId` is `null`; picker hidden for single-member
  wallets.
- DB (manual / integration): `supabase db reset`, then confirm the trigger
  rejects a non-member beneficiary and accepts a member.

## Verification checklist

1. `supabase db reset` applies the migration cleanly and the trigger rejects a
   non-member `on_behalf_of`.
2. Regenerate `types/database.types.ts`; confirm `on_behalf_of` appears.
3. `tsc --noEmit` passes with the new `TransactionFormValues` field threaded end
   to end.
4. `vitest` green.
5. `eslint` clean (watch the `react-hooks` rules already tuned in
   `use-transaction-creators`).
6. Manual: create a transaction for another member → list row shows their avatar
   + "added by You"; the other member sees it as "added by <you>".

## Out of scope (enabled, not built here)

Per-member spending breakdowns in the status/aggregation screens. The new
`on_behalf_of` column + index make this a later reporting feature; current wallet
totals are intentionally unaffected (the money still lives in the shared wallet).
