-- =====================================================================
-- Add category_items to the realtime publication so item create / edit /
-- archive / delete propagate to other wallet members and other devices,
-- matching how categories and transactions already sync. Idempotent.
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'category_items'
  ) then
    alter publication supabase_realtime add table public.category_items;
  end if;
end $$;
