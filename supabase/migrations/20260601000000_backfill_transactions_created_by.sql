-- Backfill transactions.created_by for legacy rows that pre-date the column
-- being populated. Two passes:
--   1) Use the wallet's creator (wallets.created_by) when available.
--   2) Fall back to the earliest wallet member by joined_at — covers wallets
--      whose creator left and whose wallets.created_by was nulled out.

UPDATE public.transactions AS t
SET created_by = w.created_by
FROM public.wallets AS w
WHERE t.wallet_id = w.id
  AND t.created_by IS NULL
  AND w.created_by IS NOT NULL;

UPDATE public.transactions AS t
SET created_by = sub.user_id
FROM (
  SELECT DISTINCT ON (wallet_id) wallet_id, user_id
  FROM public.wallet_members
  ORDER BY wallet_id, joined_at ASC
) AS sub
WHERE t.wallet_id = sub.wallet_id
  AND t.created_by IS NULL;
