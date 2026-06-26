-- =====================================================================
-- Single source of truth for free-tier caps
-- ---------------------------------------------------------------------
-- The caps used to live as literals inside create_wallet / invite_to_wallet
-- and again as constants in the app, which drifted (DB said 2, app said 3).
-- This puts the numbers in one place: `free_tier_limits()`. The enforcement
-- RPCs read from it, and the client reads the same function (granted to
-- authenticated) to drive its lock UI — so bumping a cap is a one-line
-- change here, no app release. The app keeps the constants only as a
-- pre-fetch/offline fallback.
--
-- To change a cap later, edit only the jsonb literal below.
-- =====================================================================

create or replace function public.free_tier_limits()
returns jsonb
language sql immutable parallel safe set search_path = public as $$
  select jsonb_build_object(
    'max_wallets_per_user', 3,
    'max_pending_invites_per_wallet', 3
  );
$$;

grant execute on function public.free_tier_limits() to authenticated;

-- RPC: create_wallet — cap by free_tier_limits() instead of a literal.
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
  v_wallet_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if char_length(trim(p_name)) < 1 or char_length(trim(p_name)) > 60 then
    raise exception 'wallet name must be between 1 and 60 characters';
  end if;

  if char_length(p_currency) != 3 then
    raise exception 'currency must be a 3-character ISO code';
  end if;

  select count(*) into v_count
  from public.wallet_members
  where user_id = v_uid;

  if v_count >= v_max then
    raise exception 'free_tier_limit' using hint = 'upgrade to create more wallets';
  end if;

  insert into public.wallets (name, currency, created_by)
  values (trim(p_name), upper(p_currency), v_uid)
  returning id into v_wallet_id;

  return v_wallet_id;
end;
$$;

-- RPC: invite_to_wallet — cap pending invites by free_tier_limits().
create or replace function public.invite_to_wallet(p_wallet_id uuid, p_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_email   text := lower(trim(p_email));
  v_pending int;
  v_max     int := (public.free_tier_limits() ->> 'max_pending_invites_per_wallet')::int;
  v_id      uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_wallet_member(p_wallet_id) then
    raise exception 'not a member';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email';
  end if;
  if v_email = lower(coalesce(auth.email(), '')) then
    raise exception 'cannot invite self';
  end if;

  -- Reject if that email already belongs to a member of this wallet.
  if exists (
    select 1
    from auth.users u
    join public.wallet_members m on m.user_id = u.id
    where m.wallet_id = p_wallet_id and lower(u.email) = v_email
  ) then
    raise exception 'already a member';
  end if;

  -- Re-inviting the same email refreshes the existing invite (clears a
  -- prior pending/declined row and starts a fresh pending one).
  delete from public.wallet_invitations
   where wallet_id = p_wallet_id and lower(invited_email) = v_email;

  -- Free tier: cap outstanding (pending, non-expired) invitations.
  select count(*) into v_pending
  from public.wallet_invitations
  where wallet_id = p_wallet_id
    and status = 'pending'
    and expires_at > now();

  if v_pending >= v_max then
    raise exception 'free_tier_limit' using hint = 'upgrade to invite more people';
  end if;

  insert into public.wallet_invitations (wallet_id, invited_email, created_by)
  values (p_wallet_id, v_email, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_wallet(text, text) to authenticated;
grant execute on function public.invite_to_wallet(uuid, text) to authenticated;
