-- =====================================================================
-- Lock wallet currency + validate against the supported set
-- ---------------------------------------------------------------------
-- Currency is chosen once, at wallet creation, and is immutable thereafter.
-- Amounts are stored as integer cents with no FX conversion, so changing a
-- wallet's currency would silently reinterpret every stored amount (10000
-- cents rendering as R$100 → $100 → €100). Two guards enforce this at the DB,
-- independent of the client:
--
--   1. create_wallet() now rejects any currency outside the supported set
--      (previously it only checked the 3-char length), matching the app's
--      SUPPORTED_CURRENCIES in data/currency.ts.
--   2. A BEFORE UPDATE trigger on wallets rejects any change to `currency`.
--
-- Keep the supported set in sync with data/currency.ts if it ever grows.
-- =====================================================================

-- RPC: create_wallet — validate currency against the supported set.
create or replace function public.create_wallet(
  p_name     text,
  p_currency text default 'BRL'
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_count     int;
  v_max       int := (public.free_tier_limits() ->> 'max_wallets_per_user')::int;
  v_currency  text := upper(trim(coalesce(p_currency, '')));
  v_wallet_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if char_length(trim(p_name)) < 1 or char_length(trim(p_name)) > 60 then
    raise exception 'wallet name must be between 1 and 60 characters';
  end if;

  if v_currency not in ('BRL', 'USD', 'EUR') then
    raise exception 'unsupported currency: %', v_currency
      using hint = 'currency must be one of BRL, USD, EUR';
  end if;

  select count(*) into v_count
  from public.wallet_members
  where user_id = v_uid;

  if v_count >= v_max then
    raise exception 'free_tier_limit' using hint = 'upgrade to create more wallets';
  end if;

  insert into public.wallets (name, currency, created_by)
  values (trim(p_name), v_currency, v_uid)
  returning id into v_wallet_id;

  return v_wallet_id;
end;
$$;

grant execute on function public.create_wallet(text, text) to authenticated;

-- Trigger: a wallet's currency is immutable after creation.
create or replace function public.reject_wallet_currency_change()
returns trigger
language plpgsql set search_path = public as $$
begin
  if new.currency is distinct from old.currency then
    raise exception 'wallet currency is immutable once the wallet is created';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_wallets_currency_immutable on public.wallets;
create trigger trg_wallets_currency_immutable
  before update on public.wallets
  for each row
  execute function public.reject_wallet_currency_change();
