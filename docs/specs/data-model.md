# Component 11 — Data Model (Supabase Postgres + RLS)

The Supabase Postgres database holds all persistent financial data behind Row-Level Security policies scoped by **wallet membership**. The model supports shared wallets (e.g. couple / family finance) from day one — every record either belongs to a wallet or to a user's profile.

Migration source of truth: `supabase/migrations/*.sql` (the most recent: `20260515220050_initial_schema.sql`). Local development uses `supabase start` + `supabase db reset`; deployment to remote uses `supabase db push` after `supabase link --project-ref <ref>`.

All amounts are stored as **integer cents** (`bigint`) — no floating-point money. The UI is responsible for the cents↔major-unit conversion at render time.

## Scenarios

### Tables

```
Given that the migration has been applied
When the public schema is inspected
Then exactly these seven tables must exist:
  1. profiles            — 1:1 mirror of auth.users with display info
  2. wallets             — a financial space owned by one or more users
  3. wallet_members      — many-to-many membership: which users belong to which wallets
  4. wallet_invitations  — single-use codes that grant membership when redeemed
  5. categories          — per-wallet category list (expense or income)
  6. transactions        — the ledger; each row belongs to a wallet and a category
  7. wallet_delete_requests — pending wallet-deletion requests requiring partner confirmation
And every table must have created_at and updated_at columns where mutation is expected
  (profiles, wallets, categories, transactions); wallet_members and wallet_invitations are append/delete only
And the trigger function public.tg_set_updated_at must maintain updated_at on UPDATE for those tables
```

### Profiles — auto-creation on auth signup

```
Given that a new user signs up via supabase.auth (e.g. Google ID token exchange)
When the auth.users row is inserted
Then the trigger on_auth_user_created (after insert on auth.users) fires
And it inserts into public.profiles with:
  - id           = new.id  (same UUID as auth.users.id; primary key)
  - display_name = nullif(coalesce(raw_user_meta_data->>'full_name',
                                   raw_user_meta_data->>'name'), '')
  - avatar_url   = nullif(coalesce(raw_user_meta_data->>'avatar_url',
                                   raw_user_meta_data->>'picture'), '')
And the insert uses `on conflict (id) do nothing` so a re-run is idempotent
And the trigger function runs SECURITY DEFINER with search_path = public
```

### Wallets — currency column

```
Given that the wallets table is inspected
When its columns are listed
Then it must include a currency column:
  - currency text NOT NULL DEFAULT 'BRL'
  - CHECK (char_length(currency) = 3)
And the supported values today are "BRL", "USD", and "EUR" (see the Localization spec)
And every member of a wallet sees amounts formatted using that wallet's currency
And there is no per-user / per-device currency preference; currency is wallet-scoped
And changing wallets.currency reformats display only — no exchange rate or amount conversion occurs
  (amount_cents columns are unchanged)
```

### Wallets — bootstrap on insert

```
Given that a row is inserted into public.wallets
When the after-insert trigger wallets_after_insert fires
Then it must:
  1. Insert into wallet_members (wallet_id = NEW.id, user_id = NEW.created_by)
     with `on conflict do nothing`
  2. Insert two seed categories into categories:
     - name "Bar / Café", type "expense"
     - name "Extra",      type "income"
And the trigger function runs SECURITY DEFINER with search_path = public
  (so it can write to wallet_members and categories regardless of the caller's RLS scope)
```

### get_or_create_default_wallet RPC

```
Given that the client calls public.get_or_create_default_wallet(p_name text default 'Personal')
When the function runs
Then it must require auth.uid() to be non-null (raise "not authenticated" otherwise)
And it must first self-heal the caller's profile row to defend against pre-trigger users:
  INSERT INTO public.profiles (id, display_name, avatar_url)
  SELECT u.id,
         nullif(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), ''),
         nullif(coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'), '')
  FROM auth.users u WHERE u.id = auth.uid()
  ON CONFLICT (id) DO NOTHING
  (mirrors tg_profile_for_new_user; idempotent — no-op for users the trigger already handled)
And it must return the oldest wallet_id (by joined_at ASC) the caller is a member of, if any
And if the caller has no wallets, it must:
  1. Insert into wallets (name = p_name, created_by = auth.uid())
  2. Rely on the wallets_after_insert trigger to add the caller as a member and seed the category
  3. Return the new wallet id
And the function runs SECURITY DEFINER with search_path = public
```

### Wallet preference resolution (client-side)

```
Given that a signed-in user may belong to more than one wallet
  (e.g. an auto-bootstrapped personal wallet from get_or_create_default_wallet
   AND a wallet they later joined via redeem_wallet_invitation)
When the wallet context resolves the "active" wallet for the session
Then the client must NOT rely solely on get_or_create_default_wallet's oldest-by-joined_at result
  (which would lock a user to their original personal wallet and hide the shared one)
And the client must instead read all wallet_members rows visible to the user
  (RLS already lets a member see every co-member of every wallet they belong to)
And the client must group those rows by wallet_id, then pick the wallet with the most members
  (ties broken by most-recent joined_at for the current user)
And for a couples app where any wallet has at most two members, this guarantees that a shared
  wallet always wins over a leftover empty personal wallet
And the chosen wallet_id must be persisted to local storage (KV store, key "wallet:selected-id:<uid>")
  so the same wallet resumes on next launch
And on every sign-in the cached wallet_id must be re-validated against current memberships;
  if the user is no longer a member of the cached wallet (e.g. they left it), the resolver falls back
  to the preference logic above, and as a last resort to get_or_create_default_wallet
```

### redeem_wallet_invitation RPC

```
Given that the client calls public.redeem_wallet_invitation(p_code text)
When the function runs
Then it must require auth.uid() to be non-null (raise "not authenticated" otherwise)
And it must SELECT … FOR UPDATE on the matching wallet_invitations row to prevent races
And if the code does not match any row, raise "invitation not found"
And if the row's expires_at is in the past, delete the row and raise "invitation expired"
And if the row is valid:
  1. Insert (wallet_id, auth.uid()) into wallet_members with `on conflict do nothing`
  2. Delete the wallet_invitations row (single-use)
  3. Return the wallet_id
And the function runs SECURITY DEFINER with search_path = public
```

### create_wallet RPC

```
Given that the client calls public.create_wallet(p_name text, p_currency text default 'BRL')
When the function runs
Then it must require auth.uid() to be non-null (raise "not authenticated" otherwise)
And it must validate p_name length: 1–60 chars after trim (raise on violation)
And it must validate p_currency length: exactly 3 chars (raise on violation)
And it must count the caller's current wallet_members rows
And if the count is >= 2, raise "free_tier_limit" with hint "upgrade to create more wallets"
  (free-tier cap: a user may belong to at most 2 wallets simultaneously)
And if the count is < 2, insert into wallets (name = trim(p_name), currency = upper(p_currency), created_by = auth.uid())
And the wallets_after_insert trigger fires automatically (adds caller as member, seeds default categories)
And the function returns the new wallet UUID
And the function runs SECURITY DEFINER with search_path = public
```

### request_or_delete_wallet RPC

```
Given that the client calls public.request_or_delete_wallet(p_wallet_id uuid)
When the function runs
Then it must require auth.uid() to be non-null (raise "not authenticated" otherwise)
And it must verify the caller is a member of p_wallet_id (raise "not a member of this wallet" otherwise)
And it must check whether a wallet_delete_requests row already exists for p_wallet_id:
  - If found and requested_by = auth.uid(): return 'pending' (idempotent re-request)
  - If found and requested_by ≠ auth.uid(): raise "delete_already_requested"
And if no request exists, count the current members of p_wallet_id:
  - count ≤ 1 → hard-delete the wallet and return the text 'deleted'
  - count ≥ 2 → insert a wallet_delete_requests row (wallet_id, requested_by = auth.uid()) and return 'pending'
And the function runs SECURITY DEFINER with search_path = public
```

### confirm_wallet_deletion RPC

```
Given that the client calls public.confirm_wallet_deletion(p_wallet_id uuid)
When the function runs
Then it must require auth.uid() to be non-null (raise "not authenticated" otherwise)
And it must verify the caller is a member of p_wallet_id (raise "not a member of this wallet" otherwise)
And it must look up the wallet_delete_requests row for p_wallet_id:
  - If not found: raise "no_pending_delete_request"
  - If requested_by = auth.uid(): raise "cannot_confirm_own_request"
    (only the non-requesting member may confirm)
And if the request is valid and was made by a different member, hard-delete the wallet
And the ON DELETE CASCADE on wallet_delete_requests.wallet_id removes the request row automatically
And the function runs SECURITY DEFINER with search_path = public
```

### cancel_wallet_deletion RPC

```
Given that the client calls public.cancel_wallet_deletion(p_wallet_id uuid)
When the function runs
Then it must require auth.uid() to be non-null (raise "not authenticated" otherwise)
And it must verify the caller is a member of p_wallet_id (raise "not a member of this wallet" otherwise)
And it must DELETE FROM wallet_delete_requests WHERE wallet_id = p_wallet_id
And if no row was deleted (not found), raise "no_pending_delete_request"
And either member may cancel — there is no ownership restriction on cancellation
And the wallet itself is NOT deleted
And the function runs SECURITY DEFINER with search_path = public
```

### Invitation generation

```
Given that an authenticated wallet member wants to invite another user
When they INSERT into public.wallet_invitations with wallet_id and created_by = auth.uid()
Then the row's `code` column defaults to encode(extensions.gen_random_bytes(8), 'hex')
  (16 hex chars, ~64 bits of entropy)
And the row's `expires_at` defaults to now() + interval '7 days'
And the `code` column has a UNIQUE constraint enforced at the database level
```

### is_wallet_member helper

```
Given that any RLS policy needs to test wallet membership
When the policy expression evaluates
Then it must use the SQL function public.is_wallet_member(wid uuid)
And this function must:
  - be declared SECURITY DEFINER, LANGUAGE sql, STABLE, search_path = public
  - return EXISTS (SELECT 1 FROM wallet_members WHERE wallet_id = wid AND user_id = auth.uid())
And being SECURITY DEFINER lets the function read wallet_members without triggering recursive RLS
And the function is purely read-side; it must never mutate
```

### wallet_delete_requests — pending deletion handshake

```
Given that a wallet member initiates deletion of a shared wallet
When another member must confirm before the wallet is hard-deleted
Then a row must be inserted into public.wallet_delete_requests with:
  - id           (uuid, generated)
  - wallet_id    (uuid, FK → wallets.id, ON DELETE CASCADE)
  - requested_by (uuid, FK → profiles.id, ON DELETE CASCADE)
  - created_at   (timestamptz, default now())
And the table must enforce a UNIQUE constraint on wallet_id
  (only one active deletion request per wallet at a time)
And when the wallet itself is deleted (hard delete), the request row is removed automatically via ON DELETE CASCADE
And when only one member is in the wallet, request_or_delete_wallet deletes immediately without inserting a request row
```

### Row Level Security — coverage

```
Given that the migration has been applied
When pg_policies is inspected for schema = 'public'
Then RLS must be enabled on every table in the schema
And the policy counts must be:
  - profiles                 : 2 (select, update)
  - wallets                  : 4 (select, insert, update, delete)
  - wallet_members           : 2 (select, delete) — no INSERT policy by design
  - wallet_invitations       : 3 (select, insert, delete)
  - wallet_delete_requests   : 3 (select, insert, delete) — no UPDATE policy by design
  - categories               : 4 (select, insert, update, delete)
  - transactions             : 4 (select, insert, update, delete)
```

### Profiles policies

```
Given that the profiles table has RLS enabled
When a row is read or updated
Then `profiles_select_self_or_comember` must allow SELECT when:
  - profiles.id = auth.uid()  OR
  - the caller and the row's profile share at least one wallet (via two-hop join through wallet_members)
And `profiles_update_self` must allow UPDATE only when profiles.id = auth.uid()
  (both USING and WITH CHECK)
And no INSERT or DELETE policy exists — those are owned by Supabase Auth (the trigger on auth.users)
```

### Wallets policies

```
Given that the wallets table has RLS enabled
When wallets are accessed
Then a member may SELECT, UPDATE, and DELETE wallets they belong to (is_wallet_member(id))
And any authenticated user may INSERT a wallet, but only with created_by = auth.uid()
And after insert, the wallets_after_insert trigger immediately adds them to wallet_members
  (so subsequent operations on that wallet pass the member check)
```

### Wallet_members policies

```
Given that the wallet_members table has RLS enabled
When membership is read
Then a row is visible if user_id = auth.uid() OR the caller is a member of the same wallet
And a row may be deleted by either the row's user (leave the wallet) OR by another member
And there is NO direct INSERT policy
  (membership is granted only by the wallets_after_insert trigger or by redeem_wallet_invitation,
   both of which run SECURITY DEFINER and bypass RLS)
```

### Wallet_invitations policies

```
Given that the wallet_invitations table has RLS enabled
When invitations are accessed
Then a member of the invitation's wallet may SELECT and DELETE invitations
And a member may INSERT an invitation provided created_by = auth.uid()
And invitations are NEVER updatable via REST — to extend or rotate, delete and recreate
```

### wallet_delete_requests policies

```
Given that the wallet_delete_requests table has RLS enabled
When deletion requests are accessed
Then any wallet member may SELECT requests for their wallet (is_wallet_member(wallet_id))
And a wallet member may INSERT a request only when requested_by = auth.uid()
  (the RPC request_or_delete_wallet enforces this; the INSERT policy is a belt-and-suspenders guard)
And any wallet member may DELETE the request (either the requester or the partner may cancel)
And there is NO UPDATE policy — a request cannot be modified; it is either active or deleted
And the four RPCs (request_or_delete_wallet, confirm_wallet_deletion, cancel_wallet_deletion)
  run SECURITY DEFINER, so they bypass RLS for their internal DML
```

### Categories policies

```
Given that the categories table has RLS enabled
When categories are accessed
Then full CRUD (select / insert / update / delete) is allowed for any member of categories.wallet_id
And no other access is permitted
And uniqueness within a wallet is enforced by a unique index on (wallet_id, lower(name), type)
  (case-insensitive within a type: "Mercado" and "mercado" cannot coexist as expense in the same wallet,
   but "Freelance" can exist as both expense and income — the seeds 'Bar / Café' (expense) and
   'Extra' (income) coexist with any user-created same-named category of the opposite type)
```

### Transactions policies

```
Given that the transactions table has RLS enabled
When transactions are accessed
Then full CRUD is allowed for any member of transactions.wallet_id
And transactions reference categories with `on delete restrict`
  (categories with transactions cannot be deleted; the user must reassign or delete the transactions first)
And transactions reference profiles via created_by with `on delete set null`
  (deleting a profile preserves transaction history but anonymizes the author)
```

### Domain enums via CHECK constraints

```
Given that text columns model enums
When schema constraints are inspected
Then the following CHECK constraints must enforce the allowed values:
  - categories.type        ∈ {'expense', 'income'}
  - transactions.status    ∈ {'completed', 'scheduled'}
  - transactions.recurrence ∈ {'none', 'daily', 'weekly', 'monthly'}
And these values must remain in sync with the TS unions in the application code
  (replacing data/finance-mock.ts: Recurrence, TransactionStatus, TransactionType)
```

### Indexes

```
Given that the migration has been applied
When the database's indexes are inspected
Then at minimum these performance-relevant indexes must exist:
  - wallet_members_user_idx                       on wallet_members (user_id)
  - wallet_invitations_wallet_idx                 on wallet_invitations (wallet_id)
  - wallet_delete_requests_wallet_idx             on wallet_delete_requests (wallet_id)
  - categories_wallet_name_type_idx (UNIQUE)      on categories (wallet_id, lower(name), type)
  - categories_wallet_type_idx                    on categories (wallet_id, type)
  - transactions_wallet_occurred_idx              on transactions (wallet_id, occurred_at desc)
  - transactions_wallet_category_occurred_idx     on transactions (wallet_id, category_id, occurred_at)
And the primary key columns (id) on every table provide their own indexes implicitly
```

### Realtime publication

```
Given that the client subscribes to per-wallet finance changes via Supabase Realtime
When the publication `supabase_realtime` is inspected
Then it must include `public.transactions`, `public.categories`, and `public.wallet_delete_requests`
And for transactions and categories, the client subscribes with the filter `wallet_id=eq.<active wallet id>`
And on any postgres_changes event for transactions/categories, the corresponding TanStack Query cache key is invalidated
  (finance:<wallet>:transactions or finance:<wallet>:categories)
And for wallet_delete_requests, the client subscribes without a filter (RLS limits visibility to the user's wallets)
And on any postgres_changes event for wallet_delete_requests or wallet_members, the wallets list cache key is invalidated
  (wallets:<userId>:list — drives reactive UI updates in the Danger Zone and WalletsModal)
And the supabase_realtime publication is extended by the wallet_management migration
```

### Money is integer cents

```
Given that monetary amounts are stored
When schema columns are inspected
Then amounts must use bigint, with the column name suffixed _cents:
  - categories.monthly_budget_cents (nullable; CHECK ≥ 0)
  - transactions.amount_cents       (NOT NULL; CHECK > 0)
And the application is responsible for:
  - converting major units → cents before INSERT/UPDATE (e.g. 12.34 → 1234)
  - dividing by 100 (or by the Intl currency's minorUnit) before formatting for display
And the database must never see a numeric / float / double amount column
```

### Extensions

```
Given that the migration runs
When the database state is inspected
Then the pgcrypto extension must be present (provides gen_random_bytes for invitation codes)
And it must be installed in the `extensions` schema (Supabase's default)
And any reference to gen_random_bytes from migrations must be schema-qualified
  as `extensions.gen_random_bytes(...)`, because the default search_path during
  remote migration execution does NOT include the extensions schema
  (omitting the schema works on local Supabase but fails on hosted)
And `gen_random_uuid()` is provided by core Postgres ≥ 13 and does not require schema qualification
```

### Migration workflow

```
Given that a schema change is needed
When the change is authored
Then it must live in a new migration file under supabase/migrations/
And the file name must follow the CLI's timestamp convention (use `supabase migration new <slug>`)
And before pushing, the change must be verified locally via `supabase db reset`
And deployment to the remote project is `supabase db push` (after `supabase link --project-ref <ref>`)
And remote schema must NEVER be edited via the Studio SQL/Table editor
  (doing so bypasses the supabase_migrations.schema_migrations tracking table and breaks db push)
```

### Local vs remote behaviour caveats

```
Given that local Supabase and hosted Supabase differ in their default search_path
When migrations are authored
Then every reference to an object outside `pg_catalog` and `public` must be schema-qualified
  (notably: `extensions.gen_random_bytes`, `auth.uid()`, `auth.users`)
And any "works locally but fails on push" error usually indicates a missing schema prefix
And the smoke-test for any new migration must include a `supabase db push` to a non-production
  Supabase environment before targeting the production project
```
