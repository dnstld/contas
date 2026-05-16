-- =====================================================================
-- Seed default categories: add an 'Extra' (income) seed alongside the
-- existing 'Bar / Café' (expense), and backfill any wallets that are
-- missing one of them. Idempotent so it is safe to re-run.
-- =====================================================================

-- 1. Update the after-insert bootstrap so new wallets get both seeds.
create or replace function public.tg_wallet_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallet_members (wallet_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;

  insert into public.categories (wallet_id, name, type) values
    (new.id, 'Bar / Café', 'expense'),
    (new.id, 'Extra',      'income');

  return new;
end;
$$;

-- 2. Backfill: insert the seeds into every wallet that doesn't already
--    have a category with the same (case-insensitive) name. The unique
--    index `categories_wallet_name_idx` on (wallet_id, lower(name))
--    backs the ON CONFLICT clause.
insert into public.categories (wallet_id, name, type)
select w.id, 'Bar / Café', 'expense'
from public.wallets w
where not exists (
  select 1 from public.categories c
  where c.wallet_id = w.id and lower(c.name) = lower('Bar / Café')
);

insert into public.categories (wallet_id, name, type)
select w.id, 'Extra', 'income'
from public.wallets w
where not exists (
  select 1 from public.categories c
  where c.wallet_id = w.id and lower(c.name) = lower('Extra')
);
