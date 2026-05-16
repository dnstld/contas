-- =====================================================================
-- Make get_or_create_default_wallet self-heal a missing profile row.
--
-- The on_auth_user_created trigger only fires for users created AFTER the
-- initial schema landed, so any auth.users row created before then has no
-- public.profiles row and the wallets.created_by FK fails. Rather than
-- requiring an operator backfill, the RPC now upserts the caller's profile
-- from auth.users.raw_user_meta_data before creating the wallet.
-- =====================================================================

create or replace function public.get_or_create_default_wallet(p_name text default 'Personal')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_wallet_id uuid;
  v_uid       uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Ensure a profiles row exists for the caller. Mirrors tg_profile_for_new_user
  -- so pre-trigger users (and any future edge case) are healed transparently.
  insert into public.profiles (id, display_name, avatar_url)
  select
    u.id,
    nullif(
      coalesce(
        u.raw_user_meta_data ->> 'full_name',
        u.raw_user_meta_data ->> 'name'
      ),
      ''
    ),
    nullif(
      coalesce(
        u.raw_user_meta_data ->> 'avatar_url',
        u.raw_user_meta_data ->> 'picture'
      ),
      ''
    )
  from auth.users u
  where u.id = v_uid
  on conflict (id) do nothing;

  select wallet_id into v_wallet_id
  from public.wallet_members
  where user_id = v_uid
  order by joined_at asc
  limit 1;

  if v_wallet_id is not null then
    return v_wallet_id;
  end if;

  insert into public.wallets (name, created_by)
  values (p_name, v_uid)
  returning id into v_wallet_id;

  return v_wallet_id;
end;
$$;
