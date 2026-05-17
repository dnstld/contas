-- =====================================================================
-- Wallet management: wallet_delete_requests table + create/delete RPCs
-- =====================================================================

-- wallet_delete_requests -----------------------------------------------
-- Holds a pending deletion request when a multi-member wallet is being
-- deleted. The non-requesting member must call confirm_wallet_deletion
-- to finalise the hard delete.
create table public.wallet_delete_requests (
  id           uuid primary key default gen_random_uuid(),
  wallet_id    uuid not null references public.wallets(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (wallet_id) -- only one active request per wallet
);

create index wallet_delete_requests_wallet_idx on public.wallet_delete_requests (wallet_id);

alter table public.wallet_delete_requests enable row level security;

create policy wdr_select_member on public.wallet_delete_requests
  for select using (public.is_wallet_member(wallet_id));

create policy wdr_insert_member on public.wallet_delete_requests
  for insert with check (
    public.is_wallet_member(wallet_id)
    and requested_by = auth.uid()
  );

create policy wdr_delete_member on public.wallet_delete_requests
  for delete using (public.is_wallet_member(wallet_id));

-- Push realtime events so the other member sees the pending state instantly
alter publication supabase_realtime add table public.wallet_delete_requests;


-- RPC: create_wallet ---------------------------------------------------
-- Creates a new wallet for the caller. Free tier: max 2 wallets per user.
-- Returns the new wallet UUID. The tg_wallet_after_insert trigger fires
-- automatically (adds creator as member + seeds default categories).
create or replace function public.create_wallet(
  p_name     text,
  p_currency text default 'BRL'
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_count     int;
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

  if v_count >= 2 then
    raise exception 'free_tier_limit' using hint = 'upgrade to create more wallets';
  end if;

  insert into public.wallets (name, currency, created_by)
  values (trim(p_name), upper(p_currency), v_uid)
  returning id into v_wallet_id;

  return v_wallet_id;
end;
$$;


-- RPC: request_or_delete_wallet ----------------------------------------
-- If the wallet has only 1 member → hard-deletes immediately, returns 'deleted'.
-- If it has 2+ members → creates a pending delete request, returns 'pending'.
-- Idempotent: re-calling as the same requester returns 'pending' again.
create or replace function public.request_or_delete_wallet(p_wallet_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid               uuid := auth.uid();
  v_member_cnt        int;
  v_existing_requester uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_wallet_member(p_wallet_id) then
    raise exception 'not a member of this wallet';
  end if;

  select requested_by into v_existing_requester
  from public.wallet_delete_requests
  where wallet_id = p_wallet_id;

  if found then
    if v_existing_requester = v_uid then
      return 'pending'; -- idempotent re-request by same user
    else
      raise exception 'delete_already_requested'
        using hint = 'another member already requested deletion — use confirm_wallet_deletion';
    end if;
  end if;

  select count(*) into v_member_cnt
  from public.wallet_members
  where wallet_id = p_wallet_id;

  if v_member_cnt <= 1 then
    delete from public.wallets where id = p_wallet_id;
    return 'deleted';
  else
    insert into public.wallet_delete_requests (wallet_id, requested_by)
    values (p_wallet_id, v_uid);
    return 'pending';
  end if;
end;
$$;


-- RPC: confirm_wallet_deletion -----------------------------------------
-- Called by the NON-requesting member to hard-delete the wallet.
-- Verifies a pending request exists and that the caller didn't create it.
create or replace function public.confirm_wallet_deletion(p_wallet_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_requester uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_wallet_member(p_wallet_id) then
    raise exception 'not a member of this wallet';
  end if;

  select requested_by into v_requester
  from public.wallet_delete_requests
  where wallet_id = p_wallet_id;

  if not found then
    raise exception 'no_pending_delete_request';
  end if;

  if v_requester = v_uid then
    raise exception 'cannot_confirm_own_request'
      using hint = 'only the other member can confirm this deletion';
  end if;

  delete from public.wallets where id = p_wallet_id;
end;
$$;


-- RPC: cancel_wallet_deletion ------------------------------------------
-- Either member can cancel the pending delete request.
-- Does NOT delete the wallet.
create or replace function public.cancel_wallet_deletion(p_wallet_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_wallet_member(p_wallet_id) then
    raise exception 'not a member of this wallet';
  end if;

  delete from public.wallet_delete_requests where wallet_id = p_wallet_id;

  if not found then
    raise exception 'no_pending_delete_request';
  end if;
end;
$$;
