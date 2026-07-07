-- Make a transaction's "occurred" value a pure calendar date.
--
-- It was `timestamptz` (an absolute instant). Because the app buckets a
-- transaction into a day/month/year using the viewer's *local* time, the same
-- transaction could appear on different calendar days for wallet members in
-- different timezones — e.g. an entry made late at night in one zone could land
-- on the next day for a member further east. A calendar date has no time and no
-- timezone, so "6 July" is 6 July for everyone, everywhere.
--
-- Existing rows store an instant; we collapse each to the day it fell on in
-- Europe/Berlin (the wallet owner's timezone), which matches what was shown.
-- `occurred_at AT TIME ZONE 'Europe/Berlin'` yields the Berlin wall-clock
-- timestamp; `::date` then takes that calendar day.
--
-- The column keeps the name `occurred_at` to avoid churn across the app/types;
-- it is now a DATE, not a timestamp.
alter table public.transactions
  alter column occurred_at type date
  using (occurred_at at time zone 'Europe/Berlin')::date;

-- Rebuild the wallet feed index to include created_at, giving a stable,
-- deterministic order within a single day (newest entry first) now that
-- occurred_at no longer carries a time-of-day to break ties.
drop index if exists public.transactions_wallet_occurred_idx;
create index transactions_wallet_occurred_idx
  on public.transactions (wallet_id, occurred_at desc, created_at desc);
