-- =====================================================================
-- One-time backfill: seed category_items from existing transaction
-- descriptions, and link matching history.
-- =====================================================================
-- Run in the Supabase SQL editor (production). Idempotent — safe to re-run.
-- Tunables:
--   MIN_USES = 2   (skip one-off descriptions used only once)
--   TOP_N    = 5   (items created per category, most-used first)
--   name length capped at 40 (category_items.name limit)
--
-- STEP 0 — PREVIEW FIRST (no writes). Review what would be created:
-- ---------------------------------------------------------------------
select c.name as category, ti.display_name as item, ti.uses
from (
  select
    t.category_id,
    (array_agg(btrim(t.description) order by t.created_at desc))[1] as display_name,
    count(*) as uses,
    row_number() over (
      partition by t.category_id
      order by count(*) desc, max(t.created_at) desc
    ) as rn
  from public.transactions t
  where btrim(t.description) <> ''
    and char_length(btrim(t.description)) <= 40
  group by t.category_id, lower(btrim(t.description))
) ti
join public.categories c on c.id = ti.category_id
where ti.uses >= 2      -- MIN_USES
  and ti.rn  <= 5       -- TOP_N
order by c.name, ti.uses desc;


-- =====================================================================
-- STEP 1 — BACKFILL (writes). Run once you're happy with the preview.
-- Wrapped in a transaction so it's all-or-nothing.
-- =====================================================================
begin;

-- 1a. Create the top-N most-used descriptions per category as items
--     (most recent original casing wins; case-insensitive de-dupe).
with ranked as (
  select
    t.category_id,
    (array_agg(btrim(t.description) order by t.created_at desc))[1] as display_name,
    count(*) as uses,
    max(t.created_at) as last_used
  from public.transactions t
  where btrim(t.description) <> ''
    and char_length(btrim(t.description)) <= 40
  group by t.category_id, lower(btrim(t.description))
),
top_items as (
  select
    category_id,
    display_name,
    row_number() over (
      partition by category_id
      order by uses desc, last_used desc
    ) as rn
  from ranked
  where uses >= 2                       -- MIN_USES
)
insert into public.category_items (wallet_id, category_id, name)
select c.wallet_id, ti.category_id, ti.display_name
from top_items ti
join public.categories c on c.id = ti.category_id
where ti.rn <= 5                        -- TOP_N
on conflict (category_id, lower(name)) do nothing;   -- idempotent

-- 1b. Link every historical transaction whose description matches an item
--     name (case-insensitive) in the same category. Only fills unset links.
update public.transactions t
set category_item_id = ci.id
from public.category_items ci
where ci.category_id = t.category_id
  and lower(ci.name) = lower(btrim(t.description))
  and t.category_item_id is null;

commit;


-- =====================================================================
-- STEP 2 — VERIFY (optional). Items created + transactions linked:
-- ---------------------------------------------------------------------
-- select count(*) as items_total from public.category_items;
-- select count(*) as linked_tx  from public.transactions where category_item_id is not null;
