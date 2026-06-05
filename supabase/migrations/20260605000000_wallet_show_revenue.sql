-- =====================================================================
-- Per-wallet "show revenue" preference
-- =====================================================================
-- Tri-state nullable boolean:
--   NULL  = user has not made a choice; toggle is off + disabled until
--           the wallet has its first income transaction. Auto-enabled to
--           TRUE on the first income transaction (client-side, in
--           useCreateTransaction).
--   TRUE  = revenue is shown in the Overview.
--   FALSE = user explicitly hid revenue; respect forever (auto-enable
--           never fires again because the column is no longer NULL).

alter table public.wallets
  add column show_revenue boolean;

-- Backfill: any wallet that already has an income transaction gets the
-- same auto-enable treatment retroactively. New wallets stay NULL.
update public.wallets w
   set show_revenue = true
 where exists (
   select 1
     from public.transactions t
     join public.categories c on c.id = t.category_id
    where t.wallet_id = w.id
      and c.type = 'income'
 );
