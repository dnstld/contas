-- =====================================================================
-- Allow the same category name across types (e.g. "Freelance" as both
-- expense and income). The previous unique index (wallet_id, lower(name))
-- blocked the 'Extra' income seed from being inserted into wallets that
-- already had an 'Extra' expense category, leaving them with zero income
-- categories.
-- =====================================================================

-- 1. Relax the uniqueness constraint to include `type`.
drop index if exists public.categories_wallet_name_idx;

create unique index categories_wallet_name_type_idx
  on public.categories (wallet_id, lower(name), type);

-- 2. Re-run the income seed backfill, now scoped to type so it can land
--    next to a pre-existing same-named expense category. Idempotent.
insert into public.categories (wallet_id, name, type)
select w.id, 'Extra', 'income'
from public.wallets w
where not exists (
  select 1 from public.categories c
  where c.wallet_id = w.id
    and lower(c.name) = lower('Extra')
    and c.type = 'income'
);
