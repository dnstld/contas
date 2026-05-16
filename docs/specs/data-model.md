# Component 11 — Data Model (Supabase Postgres + RLS)

The Supabase Postgres database holds all persistent financial data behind Row-Level Security policies scoped by **wallet membership**. The model supports shared wallets (e.g. couple / family finance) from day one — every record either belongs to a wallet or to a user's profile.

Migration source of truth: `supabase/migrations/*.sql` (the most recent: `20260515220050_initial_schema.sql`). Local development uses `supabase start` + `supabase db reset`; deployment to remote uses `supabase db push` after `supabase link --project-ref <ref>`.

All amounts are stored as **integer cents** (`bigint`) — no floating-point money. The UI is responsible for the cents↔major-unit conversion at render time.

## Scenarios

### Tables

```
Given that the migration has been applied
When the public schema is inspected
Then exactly these six tables must exist:
  1. profiles            — 1:1 mirror of auth.users with display info
  2. wallets             — a financial space owned by one or more users
  3. wallet_members      — many-to-many membership: which users belong to which wallets
  4. wallet_invitations  — single-use codes that grant membership when redeemed
  5. categories          — per-wallet category list (expense or income)
  6. transactions        — the ledger; each row belongs to a wallet and a category
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

### Wallets — bootstrap on insert

```
Given that a row is inserted into public.wallets
When the after-insert trigger wallets_after_insert fires
Then it must:
  1. Insert into wallet_members (wallet_id = NEW.id, user_id = NEW.created_by)
     with `on conflict do nothing`
  2. Insert one seed category into categories: name "Bar / Café", type "expense"
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

### Row Level Security — coverage

```
Given that the migration has been applied
When pg_policies is inspected for schema = 'public'
Then RLS must be enabled on every table in the schema
And the policy counts must be:
  - profiles            : 2 (select, update)
  - wallets             : 4 (select, insert, update, delete)
  - wallet_members      : 2 (select, delete) — no INSERT policy by design
  - wallet_invitations  : 3 (select, insert, delete)
  - categories          : 4 (select, insert, update, delete)
  - transactions        : 4 (select, insert, update, delete)
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

### Categories policies

```
Given that the categories table has RLS enabled
When categories are accessed
Then full CRUD (select / insert / update / delete) is allowed for any member of categories.wallet_id
And no other access is permitted
And uniqueness within a wallet is enforced by a unique index on (wallet_id, lower(name))
  (case-insensitive: "Mercado" and "mercado" cannot coexist in the same wallet)
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
  - categories_wallet_name_idx (UNIQUE)           on categories (wallet_id, lower(name))
  - categories_wallet_type_idx                    on categories (wallet_id, type)
  - transactions_wallet_occurred_idx              on transactions (wallet_id, occurred_at desc)
  - transactions_wallet_category_occurred_idx     on transactions (wallet_id, category_id, occurred_at)
And the primary key columns (id) on every table provide their own indexes implicitly
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
