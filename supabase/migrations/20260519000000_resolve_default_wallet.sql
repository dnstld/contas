-- Server-side replacement for the wallet auto-selection heuristic that
-- previously lived in hooks/use-wallet.tsx. Centralizing in Postgres
-- guarantees every client (iOS, Android, future web) agrees on the same
-- default wallet for a user, even when client versions diverge.
--
-- Selection rules (matching the prior TS implementation):
--   1. If `p_preferred` is provided and the caller is still a member of
--      that wallet, return it (honors the user's manual selection).
--   2. Otherwise, return the wallet with the most members. Tiebreaker:
--      the caller's most recent `joined_at`.
--   3. Returns NULL when the caller has no memberships — clients should
--      then call `get_or_create_default_wallet()` to bootstrap.

create or replace function public.resolve_default_wallet(p_preferred uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_wallet_id uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_preferred is not null and exists (
    select 1 from public.wallet_members
    where wallet_id = p_preferred and user_id = v_user
  ) then
    return p_preferred;
  end if;

  select my.wallet_id
    into v_wallet_id
  from public.wallet_members my
  where my.user_id = v_user
  order by
    (
      select count(*) from public.wallet_members all_m
      where all_m.wallet_id = my.wallet_id
    ) desc,
    my.joined_at desc
  limit 1;

  return v_wallet_id;
end;
$$;

grant execute on function public.resolve_default_wallet(uuid) to authenticated;
