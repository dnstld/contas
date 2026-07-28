-- =====================================================================
-- Transactions on behalf of another member
-- ---------------------------------------------------------------------
-- Adds an explicit beneficiary to a transaction while preserving the
-- actor. `created_by` continues to mean "who entered it"; the new
-- `on_behalf_of` names the member the transaction is FOR.
--   NULL          -> the transaction is for its creator (all legacy rows)
--   <member id>    -> created by `created_by`, on behalf of that member
-- Additive only; no earlier migration is edited.
-- =====================================================================

alter table public.transactions
  add column on_behalf_of uuid references public.profiles(id) on delete set null;

-- Supports future per-member reporting without a wallet-wide scan.
create index transactions_wallet_on_behalf_idx
  on public.transactions (wallet_id, on_behalf_of);

-- ---------------------------------------------------------------------
-- Two-arg membership predicate. The original is_wallet_member(uuid)
-- checks auth.uid(); this overload checks any user, reused by the
-- validation trigger below (and available to future callers).
-- ---------------------------------------------------------------------
create or replace function public.is_wallet_member(wid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wallet_members
    where wallet_id = wid and user_id = uid
  );
$$;

revoke execute on function public.is_wallet_member(uuid, uuid) from public;
grant  execute on function public.is_wallet_member(uuid, uuid) to authenticated, anon;

-- ---------------------------------------------------------------------
-- Enforce that the beneficiary belongs to the same wallet. RLS already
-- forces the CALLER to be a member (transactions_insert/update_member);
-- this guards the BENEFICIARY on insert and update.
-- ---------------------------------------------------------------------
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
