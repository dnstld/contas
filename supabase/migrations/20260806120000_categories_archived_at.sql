-- =====================================================================
-- Add soft-archive support to categories, mirroring category_items.
-- A non-null `archived_at` hides the category from active surfaces
-- (category picker, dashboard cards, upcoming) while preserving its
-- history and letting it be reopened. Reversible, non-destructive.
-- =====================================================================

alter table "public"."categories"
  add column if not exists "archived_at" timestamp with time zone;

-- Speeds up the common "active categories for a wallet" scan.
create index if not exists categories_active_idx
  on public.categories using btree (wallet_id)
  where (archived_at is null);
