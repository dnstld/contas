# Component 11 — Data Model (Supabase Postgres + RLS)

The Supabase Postgres database holds all persistent financial data behind Row-Level Security policies scoped by **wallet membership**. The model supports shared wallets (e.g. couple / family finance) from day one — every record either belongs to a wallet or to a user's profile.

Migration source of truth: `supabase/migrations/*.sql`. The baseline is `20260515220050_initial_schema.sql`; the schema has since evolved through additive migrations (wallet currency + realtime, wallet management + delete handshake, per-type category uniqueness, server-side wallet resolution, per-wallet show-revenue, dropping the default category seeds, email-based invitations, the free-tier limits source, wallet-member emails, and the pre-launch security hardening — the most recent being `20260630143819_backend_security_hardening.sql`). Local development uses `supabase start` + `supabase db reset`; deployment to remote uses `supabase db push` after `supabase link --project-ref <ref>`.

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
  4. wallet_invitations  — email-based invites that grant membership when accepted
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
Then it must insert into wallet_members (wallet_id = NEW.id, user_id = NEW.created_by)
  with `on conflict do nothing`
And it must NOT seed any categories — new wallets ship empty so first-run UX can prompt the user
  to create their own (the earlier "Bar / Café" / "Extra" seeds were removed by the
  20260607000000_drop_default_category_seeds migration; wallets created before that keep their seeds)
And the trigger function runs SECURITY DEFINER with search_path = public
  (so it can write to wallet_members regardless of the caller's RLS scope)
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

### resolve_default_wallet RPC

```
Given that a signed-in user may belong to more than one wallet
  (e.g. an auto-bootstrapped personal wallet AND a wallet they later joined via accept_wallet_invitation)
When the client calls public.resolve_default_wallet(p_preferred uuid default null)
Then it must require auth.uid() to be non-null (raise "not authenticated" otherwise)
And selection follows these rules (server-side, so every client agrees on the same default):
  1. If p_preferred is provided AND the caller is still a member of it → return p_preferred
     (honours the user's manual selection / the persisted cache)
  2. Otherwise return the wallet with the most members; tiebreaker: the caller's most recent joined_at
     (for a couples app, a shared 2-member wallet always wins over a leftover empty personal wallet)
  3. Return NULL when the caller has no memberships — the client then calls get_or_create_default_wallet
And the function runs SECURITY DEFINER with search_path = public
And the client (WalletProvider) passes the persisted wallet id (KV store key "wallet:selected-id:<uid>")
  as p_preferred, adopts the RPC's answer, and re-persists it under the same per-user key
  (see the [Authentication spec](authentication.md) → "Wallet provisioning after sign-in")
```

### Email-based wallet invitations (RPCs)

```
Given that invitations are email-based (the legacy share-a-code flow and redeem_wallet_invitation
  were removed by the 20260626000000_email_invitations migration, which dropped the `code` column
  and added invited_email / status / responded_at to wallet_invitations)
When the invitation RPCs run, each requires auth.uid() to be non-null and runs SECURITY DEFINER, search_path = public:

  public.invite_to_wallet(p_wallet_id uuid, p_email text) returns uuid
    - caller must be a member of the wallet; validates email shape; rejects inviting self
      or an email that already belongs to a member
    - re-inviting the same email refreshes the existing row (delete + re-insert as pending)
    - enforces the free-tier pending-invite cap (see "create_wallet RPC" / free_tier_limits)
    - inserts a pending wallet_invitations row (invited_email, created_by = auth.uid()); returns its id

  public.list_pending_invitations() returns table(id, wallet_id, wallet_name, inviter_name, created_at)
    - returns non-expired pending invitations addressed to the caller's auth.email() for wallets they
      are not already a member of (drives the in-app "you've been invited" banner)

  public.accept_wallet_invitation(p_invitation_id uuid) returns uuid
    - SELECT … FOR UPDATE; the invite's invited_email must equal the caller's auth.email()
    - if expired: delete the row and raise "invitation expired"
    - otherwise insert (wallet_id, auth.uid()) into wallet_members (on conflict do nothing),
      delete the invitation (accepting consumes it), and return the wallet_id

  public.decline_wallet_invitation(p_invitation_id uuid) returns void
    - the invite's invited_email must equal the caller's auth.email()
    - soft decline: set status = 'declined', responded_at = now() (the row is kept so the inviter
      sees the outcome and can re-invite or dismiss)
```

### create_wallet RPC

```
Given that the client calls public.create_wallet(p_name text, p_currency text default 'BRL')
When the function runs
Then it must require auth.uid() to be non-null (raise "not authenticated" otherwise)
And it must validate p_name length: 1–60 chars after trim (raise on violation)
And it must validate p_currency length: exactly 3 chars (raise on violation)
And it must count the caller's current wallet_members rows
And if the count is >= the free-tier cap, raise "free_tier_limit" with hint "upgrade to create more wallets"
  (the cap is read from public.free_tier_limits() → 'max_wallets_per_user' = 3, not a literal)
And otherwise insert into wallets (name = trim(p_name), currency = upper(p_currency), created_by = auth.uid())
And the wallets_after_insert trigger fires automatically (adds caller as member; no category seeds)
And the function returns the new wallet UUID
And the function runs SECURITY DEFINER with search_path = public
```

### free_tier_limits function

```
Given that free-tier caps must live in one place (the DB and the client used to drift — DB said 2, app said 3)
When public.free_tier_limits() is called
Then it must return a jsonb object with:
  - 'max_wallets_per_user'           = 3
  - 'max_pending_invites_per_wallet' = 3
And the enforcement RPCs (create_wallet, invite_to_wallet) read their caps from this function
And the client is granted EXECUTE (as authenticated) and reads the same function to drive its lock UI,
  so bumping a cap is a one-line DB change with no app release
  (the app keeps the constants only as a pre-fetch / offline fallback)
And the function is SECURITY INVOKER, immutable, parallel safe, search_path = public
```

### list_wallet_members function

```
Given that profiles carries only display_name + avatar_url (no email column, by design)
When the client needs each co-member's email for the account cards
Then it must call public.list_wallet_members(p_wallet_id uuid), which joins
  wallet_members → profiles → auth.users and returns (user_id, joined_at, display_name, avatar_url, email)
And the function is gated on is_wallet_member(p_wallet_id) so only members of the wallet can read it
And it runs SECURITY DEFINER, LANGUAGE sql, search_path = public, granted to authenticated
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

### wallet_invitations shape (email-based)

```
Given that invitations are created through the invite_to_wallet RPC
When a wallet_invitations row is written
Then the row carries:
  - invited_email  text        — the invitee's email (matched later against auth.email())
  - status         text        — CHECK (status in ('pending', 'declined')), default 'pending'
  - responded_at   timestamptz — set when the invitee declines
  - created_by     uuid        — the inviting member
  - expires_at     timestamptz — default now() + interval '7 days'
And there is NO `code` column anymore (dropped by the email-invitations migration, which also
  removed its UNIQUE constraint)
And a partial UNIQUE index enforces one invite per (wallet_id, lower(invited_email))
  where invited_email is not null
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
  - wallets                  : 3 (select, insert, update) — the DELETE policy was dropped by the
    security-hardening migration so a lone member can't DELETE a wallet via REST and skip the
    two-member handshake; deletions go only through the SECURITY DEFINER RPCs
  - wallet_members           : 2 (select, delete) — no INSERT policy by design
  - wallet_invitations       : 3 (select, insert, delete) — no UPDATE policy (declines happen in-RPC)
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
Then a member may SELECT and UPDATE wallets they belong to (is_wallet_member(id))
And there is NO direct DELETE policy — a wallet is deleted only through the request_or_delete_wallet /
  confirm_wallet_deletion RPCs (SECURITY DEFINER), which enforce the single- vs two-member rules
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
  (membership is granted only by the wallets_after_insert trigger or by accept_wallet_invitation,
   both of which run SECURITY DEFINER and bypass RLS)
```

### Wallet_invitations policies

```
Given that the wallet_invitations table has RLS enabled
When invitations are accessed
Then a member of the invitation's wallet may SELECT and DELETE invitations
And a member may INSERT an invitation provided created_by = auth.uid()
  (the invite_to_wallet RPC is the normal path; the INSERT policy is a belt-and-suspenders guard)
And invitations are NEVER updatable via REST — declines flip status only through the
  decline_wallet_invitation RPC (SECURITY DEFINER); invitee-facing reads use list_pending_invitations
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
   but "Freelance" can exist as both expense and income — the same name is allowed across the two types)
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

### RPC execute grants (security hardening)

```
Given that Postgres grants EXECUTE to PUBLIC by default (so anon could call every RPC)
When the 20260630143819_backend_security_hardening migration runs
Then EXECUTE must be revoked from public + anon and granted only to authenticated on every callable
  SECURITY DEFINER RPC (get_or_create_default_wallet, resolve_default_wallet, create_wallet,
  request_or_delete_wallet, confirm_wallet_deletion, cancel_wallet_deletion, invite_to_wallet,
  list_pending_invitations, accept_wallet_invitation, decline_wallet_invitation, list_wallet_members)
  and on free_tier_limits — defense-in-depth on top of the in-body auth.uid()/authorization checks
And is_wallet_member must remain executable by BOTH authenticated and anon (RLS policies call it under
  each role; revoking anon would turn an empty result into "permission denied for function")
And the migration also wraps direct auth.uid()/auth.email() calls in RLS policies as (select …) so they
  evaluate once per statement (auth_rls_initplan advisor), and sets search_path = public on tg_set_updated_at
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
  (data/finance-types.ts: Recurrence, TransactionStatus, TransactionType)
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
Then it must include `public.transactions`, `public.categories`, `public.wallet_delete_requests`,
  `public.wallet_members`, and `public.wallet_invitations`
And for transactions and categories, the client subscribes with the filter `wallet_id=eq.<active wallet id>`
And on any postgres_changes event for transactions/categories, the corresponding TanStack Query cache key is invalidated
  (finance:<wallet>:transactions or finance:<wallet>:categories)
And for wallet_delete_requests, the client subscribes without a filter (RLS limits visibility to the user's wallets)
And on any postgres_changes event for wallet_delete_requests or wallet_members, the wallets list cache key is invalidated
  (wallets:<userId>:list — drives reactive UI updates in the Danger Zone and the Balance screen's WalletSelect control)
And wallet_members + wallet_invitations were added to the publication by the email-invitations migration
  (so the inviter's pending card flips to "joined"/"declined" live), and wallet_delete_requests by the
  wallet_management migration
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
