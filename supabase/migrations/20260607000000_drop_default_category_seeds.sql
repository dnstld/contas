-- =====================================================================
-- Stop seeding new wallets with the "Bar / Café" and "Extra" categories.
-- The app now teaches category creation through onboarding UI; the DB
-- should ship empty wallets so first-run UX can prompt the user.
--
-- Existing wallets are left untouched: their seeded categories may
-- already carry transactions or have been renamed.
-- =====================================================================

create or replace function public.tg_wallet_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallet_members (wallet_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;

  return new;
end;
$$;
