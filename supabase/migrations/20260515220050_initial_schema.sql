-- =====================================================================
-- Contas — initial schema
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles: 1:1 with auth.users, only display info
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
-- Supabase populates raw_user_meta_data with varying keys depending on the
-- provider, so we coalesce both common shapes (Google: 'name' / 'picture';
-- Supabase-normalized: 'full_name' / 'avatar_url').
create or replace function public.tg_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name'
      ),
      ''
    ),
    nullif(
      coalesce(
        new.raw_user_meta_data ->> 'avatar_url',
        new.raw_user_meta_data ->> 'picture'
      ),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_profile_for_new_user();

-- ---------------------------------------------------------------------
-- wallets
-- ---------------------------------------------------------------------
create table public.wallets (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 60),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- wallet_members
-- ---------------------------------------------------------------------
create table public.wallet_members (
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (wallet_id, user_id)
);

create index wallet_members_user_idx on public.wallet_members (user_id);

-- ---------------------------------------------------------------------
-- Membership predicate used by every RLS policy
-- ---------------------------------------------------------------------
create or replace function public.is_wallet_member(wid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wallet_members
    where wallet_id = wid and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- After-insert wallet bootstrap: add creator as member + seed category
-- ---------------------------------------------------------------------
create or replace function public.tg_wallet_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallet_members (wallet_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;

  insert into public.categories (wallet_id, name, type)
  values (new.id, 'Bar / Café', 'expense');

  return new;
end;
$$;

create trigger wallets_after_insert
  after insert on public.wallets
  for each row execute function public.tg_wallet_after_insert();

-- ---------------------------------------------------------------------
-- wallet_invitations (shareable code, single use)
-- ---------------------------------------------------------------------
create table public.wallet_invitations (
  id         uuid primary key default gen_random_uuid(),
  wallet_id  uuid not null references public.wallets(id) on delete cascade,
  code       text not null unique default encode(extensions.gen_random_bytes(8), 'hex'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index wallet_invitations_wallet_idx on public.wallet_invitations (wallet_id);

-- ---------------------------------------------------------------------
-- categories (per-wallet)
-- ---------------------------------------------------------------------
create table public.categories (
  id                   uuid primary key default gen_random_uuid(),
  wallet_id            uuid not null references public.wallets(id) on delete cascade,
  name                 text not null check (char_length(name) between 1 and 40),
  type                 text not null check (type in ('expense', 'income')),
  monthly_budget_cents bigint check (monthly_budget_cents is null or monthly_budget_cents >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index categories_wallet_name_idx on public.categories (wallet_id, lower(name));
create index categories_wallet_type_idx on public.categories (wallet_id, type);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  wallet_id    uuid not null references public.wallets(id) on delete cascade,
  category_id  uuid not null references public.categories(id) on delete restrict,
  created_by   uuid references public.profiles(id) on delete set null,
  amount_cents bigint not null check (amount_cents > 0),
  description  text not null default '' check (char_length(description) <= 100),
  status       text not null default 'completed' check (status in ('completed', 'scheduled')),
  occurred_at  timestamptz not null,
  recurrence   text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index transactions_wallet_occurred_idx on public.transactions (wallet_id, occurred_at desc);
create index transactions_wallet_category_occurred_idx on public.transactions (wallet_id, category_id, occurred_at);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.tg_set_updated_at();

-- =====================================================================
-- RPCs
-- =====================================================================

-- Returns an existing wallet for the caller, or creates one (which fires
-- the bootstrap trigger to add membership + the seed category).
create or replace function public.get_or_create_default_wallet(p_name text default 'Personal')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_wallet_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select wallet_id into v_wallet_id
  from public.wallet_members
  where user_id = auth.uid()
  order by joined_at asc
  limit 1;

  if v_wallet_id is not null then
    return v_wallet_id;
  end if;

  insert into public.wallets (name, created_by)
  values (p_name, auth.uid())
  returning id into v_wallet_id;

  return v_wallet_id;
end;
$$;

-- Single-use redemption. Adds the caller as a member and deletes the row.
create or replace function public.redeem_wallet_invitation(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_invitation public.wallet_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invitation
  from public.wallet_invitations
  where code = p_code
  for update;

  if not found then
    raise exception 'invitation not found';
  end if;

  if v_invitation.expires_at <= now() then
    delete from public.wallet_invitations where id = v_invitation.id;
    raise exception 'invitation expired';
  end if;

  insert into public.wallet_members (wallet_id, user_id)
  values (v_invitation.wallet_id, auth.uid())
  on conflict do nothing;

  delete from public.wallet_invitations where id = v_invitation.id;

  return v_invitation.wallet_id;
end;
$$;

-- =====================================================================
-- Row-Level Security
-- =====================================================================

alter table public.profiles            enable row level security;
alter table public.wallets             enable row level security;
alter table public.wallet_members      enable row level security;
alter table public.wallet_invitations  enable row level security;
alter table public.categories          enable row level security;
alter table public.transactions        enable row level security;

-- profiles -------------------------------------------------------------
create policy profiles_select_self_or_comember on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from public.wallet_members m1
      join public.wallet_members m2 on m1.wallet_id = m2.wallet_id
      where m1.user_id = auth.uid() and m2.user_id = public.profiles.id
    )
  );

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- wallets --------------------------------------------------------------
create policy wallets_select_member on public.wallets
  for select using (public.is_wallet_member(id));

create policy wallets_insert_self on public.wallets
  for insert with check (created_by = auth.uid());

create policy wallets_update_member on public.wallets
  for update using (public.is_wallet_member(id)) with check (public.is_wallet_member(id));

create policy wallets_delete_member on public.wallets
  for delete using (public.is_wallet_member(id));

-- wallet_members (no direct INSERT — bootstrap trigger / redemption RPC)
create policy wallet_members_select_self_or_member on public.wallet_members
  for select using (
    user_id = auth.uid() or public.is_wallet_member(wallet_id)
  );

create policy wallet_members_delete_self_or_member on public.wallet_members
  for delete using (
    user_id = auth.uid() or public.is_wallet_member(wallet_id)
  );

-- wallet_invitations ---------------------------------------------------
create policy wallet_invitations_select_member on public.wallet_invitations
  for select using (public.is_wallet_member(wallet_id));

create policy wallet_invitations_insert_member on public.wallet_invitations
  for insert with check (
    public.is_wallet_member(wallet_id) and created_by = auth.uid()
  );

create policy wallet_invitations_delete_member on public.wallet_invitations
  for delete using (public.is_wallet_member(wallet_id));

-- categories -----------------------------------------------------------
create policy categories_select_member on public.categories
  for select using (public.is_wallet_member(wallet_id));

create policy categories_insert_member on public.categories
  for insert with check (public.is_wallet_member(wallet_id));

create policy categories_update_member on public.categories
  for update using (public.is_wallet_member(wallet_id)) with check (public.is_wallet_member(wallet_id));

create policy categories_delete_member on public.categories
  for delete using (public.is_wallet_member(wallet_id));

-- transactions ---------------------------------------------------------
create policy transactions_select_member on public.transactions
  for select using (public.is_wallet_member(wallet_id));

create policy transactions_insert_member on public.transactions
  for insert with check (public.is_wallet_member(wallet_id));

create policy transactions_update_member on public.transactions
  for update using (public.is_wallet_member(wallet_id)) with check (public.is_wallet_member(wallet_id));

create policy transactions_delete_member on public.transactions
  for delete using (public.is_wallet_member(wallet_id));
