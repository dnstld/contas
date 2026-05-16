-- =====================================================================
-- Wallet currency + realtime publication
-- =====================================================================
-- Currency lives on the wallet (not the device). Each wallet has a single
-- currency; all members see amounts formatted in that currency.

alter table public.wallets
  add column currency text not null default 'BRL'
  check (char_length(currency) = 3);

-- Publish transactions + categories on the realtime channel so the client
-- can subscribe to postgres_changes per wallet for collaborative updates.
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.categories;
