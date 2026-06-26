-- =====================================================================
-- Email-based wallet invitations
-- ---------------------------------------------------------------------
-- Replaces the share-a-code flow. A wallet member invites someone by
-- email; the invitee sees an in-app banner (sourced from
-- `list_pending_invitations`) the next time they open the app and can
-- accept (join) or decline. Matching is by the invitee's verified auth
-- email (`auth.email()`), so no account needs to exist at invite time —
-- the banner simply appears once that person signs in with that email.
--
-- All invitee-facing reads/writes go through SECURITY DEFINER functions
-- that check `auth.email()`, so we don't widen the member-only RLS on
-- `wallet_invitations`.
--
-- NOTE: this replaces the earlier `20260624000000_email_invitations.sql`,
-- which collided with the already-applied `20260624000000_peek_wallet_
-- invitation.sql` version and was therefore silently skipped. Written
-- idempotently so it is safe whether or not parts already ran on a dev DB.
-- =====================================================================

-- The code-based redeem flow is gone; drop its functions if present.
drop function if exists public.redeem_wallet_invitation(text);
drop function if exists public.peek_wallet_invitation(text);

-- Carry the invitee's email; track the invite's lifecycle.
alter table public.wallet_invitations
  add column if not exists invited_email text;

alter table public.wallet_invitations
  add column if not exists status text not null default 'pending';

alter table public.wallet_invitations
  add column if not exists responded_at timestamptz;

-- Constrain status to the values we use (pending invites awaiting a
-- response, declined invites kept so the inviter sees the outcome).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'wallet_invitations_status_check'
  ) then
    alter table public.wallet_invitations
      add constraint wallet_invitations_status_check
      check (status in ('pending', 'declined'));
  end if;
end $$;

-- The legacy share-code column is no longer used (drops its unique key too).
alter table public.wallet_invitations
  drop column if exists code;

-- One invite per (wallet, email).
create unique index if not exists wallet_invitations_wallet_email_idx
  on public.wallet_invitations (wallet_id, lower(invited_email))
  where invited_email is not null;

-- Surface invitation changes to wallet members in realtime (the inviter's
-- pending card flips to "joined"/"declined" live). `wallet_members` lets
-- the inviter see the partner appear the moment they accept.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'wallet_members'
  ) then
    alter publication supabase_realtime add table public.wallet_members;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'wallet_invitations'
  ) then
    alter publication supabase_realtime add table public.wallet_invitations;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- invite_to_wallet — member invites someone by email
-- ---------------------------------------------------------------------
create or replace function public.invite_to_wallet(p_wallet_id uuid, p_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
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

  insert into public.wallet_invitations (wallet_id, invited_email, created_by)
  values (p_wallet_id, v_email, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- list_pending_invitations — invites addressed to the caller's email
-- ---------------------------------------------------------------------
create or replace function public.list_pending_invitations()
returns table (
  id uuid,
  wallet_id uuid,
  wallet_name text,
  inviter_name text,
  created_at timestamptz
)
language sql security definer set search_path = public as $$
  select i.id, i.wallet_id, w.name, nullif(p.display_name, ''), i.created_at
  from public.wallet_invitations i
  join public.wallets w on w.id = i.wallet_id
  left join public.profiles p on p.id = i.created_by
  where i.invited_email is not null
    and i.status = 'pending'
    and lower(i.invited_email) = lower(coalesce(auth.email(), ''))
    and i.expires_at > now()
    and not exists (
      select 1 from public.wallet_members m
      where m.wallet_id = i.wallet_id and m.user_id = auth.uid()
    )
  order by i.created_at desc;
$$;

-- ---------------------------------------------------------------------
-- accept_wallet_invitation — join the wallet
-- ---------------------------------------------------------------------
create or replace function public.accept_wallet_invitation(p_invitation_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_inv public.wallet_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_inv
  from public.wallet_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'invitation not found';
  end if;
  if v_inv.invited_email is null
     or lower(v_inv.invited_email) <> lower(coalesce(auth.email(), '')) then
    raise exception 'invitation not for this user';
  end if;
  if v_inv.expires_at <= now() then
    delete from public.wallet_invitations where id = v_inv.id;
    raise exception 'invitation expired';
  end if;

  insert into public.wallet_members (wallet_id, user_id)
  values (v_inv.wallet_id, auth.uid())
  on conflict do nothing;

  -- Accepting consumes the invite (the new member now shows in the list).
  delete from public.wallet_invitations where id = v_inv.id;

  return v_inv.wallet_id;
end;
$$;

-- ---------------------------------------------------------------------
-- decline_wallet_invitation — mark declined (kept so the inviter sees it)
-- ---------------------------------------------------------------------
create or replace function public.decline_wallet_invitation(p_invitation_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_inv public.wallet_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_inv
  from public.wallet_invitations
  where id = p_invitation_id;

  if not found then
    return;
  end if;
  if v_inv.invited_email is null
     or lower(v_inv.invited_email) <> lower(coalesce(auth.email(), '')) then
    raise exception 'invitation not for this user';
  end if;

  -- Soft decline: keep the row so the inviter can see the outcome and
  -- choose to re-invite or dismiss it.
  update public.wallet_invitations
     set status = 'declined', responded_at = now()
   where id = v_inv.id;
end;
$$;

grant execute on function public.invite_to_wallet(uuid, text) to authenticated;
grant execute on function public.list_pending_invitations() to authenticated;
grant execute on function public.accept_wallet_invitation(uuid) to authenticated;
grant execute on function public.decline_wallet_invitation(uuid) to authenticated;
