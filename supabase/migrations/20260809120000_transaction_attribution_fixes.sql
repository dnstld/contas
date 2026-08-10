-- =====================================================================
-- Transaction attribution fixes
-- ---------------------------------------------------------------------
-- Two related corrections to the "on behalf of" feature:
--
--   1) A transaction must never name itself as its own beneficiary. When
--      `on_behalf_of = created_by` the row is really a plain transaction,
--      but the UI rendered it as "<name> · added by <name>". We normalize
--      the redundant value to NULL on every write and backfill existing
--      rows. (This state could be reached via the edit form, where the
--      editor could pick the original creator as the beneficiary.)
--
--   2) Track WHO last edited a transaction (`updated_by`) so the row can
--      read "<name> · edited by <other>" when someone other than the
--      creator changes it. Mirrors the existing `updated_at` mechanism.
-- Additive only; no earlier migration is edited.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1a. Normalize the beneficiary on write. Extends the existing validation
--     trigger function: collapse a self-referential beneficiary to NULL
--     BEFORE the membership check (a NULL beneficiary skips it).
-- ---------------------------------------------------------------------
create or replace function public.tg_transactions_validate_on_behalf_of()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- A beneficiary equal to the creator is not an on-behalf transaction.
  if new.on_behalf_of is not null and new.on_behalf_of = new.created_by then
    new.on_behalf_of := null;
  end if;

  if new.on_behalf_of is not null
     and not public.is_wallet_member(new.wallet_id, new.on_behalf_of) then
    raise exception 'on_behalf_of must be a member of the wallet';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1b. Backfill: clear the redundant self-reference on existing rows.
-- ---------------------------------------------------------------------
update public.transactions
  set on_behalf_of = null
  where on_behalf_of is not null
    and on_behalf_of = created_by;

-- ---------------------------------------------------------------------
-- 2a. `updated_by` — the member who last modified the row.
--     NULL for rows that have never been edited (legacy + freshly created).
-- ---------------------------------------------------------------------
alter table public.transactions
  add column updated_by uuid references public.profiles(id) on delete set null;

-- ---------------------------------------------------------------------
-- 2b. Stamp `updated_by` with the caller on UPDATE only. Runs as a
--     separate before-update trigger so INSERTs leave it NULL. Guards
--     against a null auth context (e.g. service-role/migration writes),
--     leaving the existing value untouched in that case.
-- ---------------------------------------------------------------------
create or replace function public.tg_transactions_set_updated_by()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger transactions_set_updated_by
  before update on public.transactions
  for each row execute function public.tg_transactions_set_updated_by();
