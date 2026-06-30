-- =====================================================================
-- Backend security hardening (pre-launch Topic 7)
-- ---------------------------------------------------------------------
-- Additive, corrective migration. No earlier migration files are edited.
-- Covers:
--   F4 — clear `function_search_path_mutable` advisor on tg_set_updated_at
--   F5 — resolve `auth_rls_initplan` perf advisor on 7 policies by wrapping
--        direct auth.uid()/auth.email() in (select ...)
--   F1 — revoke EXECUTE from public/anon on every callable SECURITY DEFINER
--        RPC; grant only to authenticated (defense-in-depth — the bodies
--        already guard auth.uid() + authorization)
--   F2 — drop wallets_delete_member so a single member can no longer
--        hard-delete a wallet via REST, bypassing the 2-member delete
--        handshake (deletions go only through the SECURITY DEFINER RPCs)
-- (F3 — member-kick restriction — intentionally NOT applied.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- F4: mutable search_path on the generic updated_at trigger function
-- ---------------------------------------------------------------------
alter function public.tg_set_updated_at() set search_path = public;

-- ---------------------------------------------------------------------
-- F5: auth_rls_initplan — wrap direct auth.*() calls in (select ...) so
-- they are evaluated once per statement instead of once per row.
-- Only the auth.* call is wrapped; predicate logic is otherwise unchanged.
-- ---------------------------------------------------------------------

-- profiles: self OR shares a wallet with the caller
alter policy profiles_select_self_or_comember on public.profiles
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.wallet_members m1
      join public.wallet_members m2 on m1.wallet_id = m2.wallet_id
      where m1.user_id = (select auth.uid()) and m2.user_id = public.profiles.id
    )
  );

alter policy profiles_update_self on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- wallets: insert only as self
alter policy wallets_insert_self on public.wallets
  with check (created_by = (select auth.uid()));

-- wallet_members: self-or-member (predicate unchanged — F3 not applied)
alter policy wallet_members_select_self_or_member on public.wallet_members
  using (user_id = (select auth.uid()) or public.is_wallet_member(wallet_id));

alter policy wallet_members_delete_self_or_member on public.wallet_members
  using (user_id = (select auth.uid()) or public.is_wallet_member(wallet_id));

-- wallet_invitations: inserter must be a member and the creator
alter policy wallet_invitations_insert_member on public.wallet_invitations
  with check (
    public.is_wallet_member(wallet_id) and created_by = (select auth.uid())
  );

-- wallet_delete_requests: requester must be a member and the requester
alter policy wdr_insert_member on public.wallet_delete_requests
  with check (
    public.is_wallet_member(wallet_id) and requested_by = (select auth.uid())
  );

-- ---------------------------------------------------------------------
-- F1: lock down EXECUTE on callable SECURITY DEFINER RPCs.
-- Default Postgres grants EXECUTE to PUBLIC; there were no prior revokes,
-- so anon could call every RPC. Revoke from public + anon, grant to
-- authenticated. (Trigger functions are not user-callable — left alone.)
-- ---------------------------------------------------------------------

-- User-facing RPCs ----------------------------------------------------
revoke execute on function public.get_or_create_default_wallet(text) from public, anon;
grant  execute on function public.get_or_create_default_wallet(text) to authenticated;

revoke execute on function public.resolve_default_wallet(uuid) from public, anon;
grant  execute on function public.resolve_default_wallet(uuid) to authenticated;

revoke execute on function public.create_wallet(text, text) from public, anon;
grant  execute on function public.create_wallet(text, text) to authenticated;

revoke execute on function public.request_or_delete_wallet(uuid) from public, anon;
grant  execute on function public.request_or_delete_wallet(uuid) to authenticated;

revoke execute on function public.confirm_wallet_deletion(uuid) from public, anon;
grant  execute on function public.confirm_wallet_deletion(uuid) to authenticated;

revoke execute on function public.cancel_wallet_deletion(uuid) from public, anon;
grant  execute on function public.cancel_wallet_deletion(uuid) to authenticated;

revoke execute on function public.invite_to_wallet(uuid, text) from public, anon;
grant  execute on function public.invite_to_wallet(uuid, text) to authenticated;

revoke execute on function public.list_pending_invitations() from public, anon;
grant  execute on function public.list_pending_invitations() to authenticated;

revoke execute on function public.accept_wallet_invitation(uuid) from public, anon;
grant  execute on function public.accept_wallet_invitation(uuid) to authenticated;

revoke execute on function public.decline_wallet_invitation(uuid) from public, anon;
grant  execute on function public.decline_wallet_invitation(uuid) to authenticated;

revoke execute on function public.list_wallet_members(uuid) from public, anon;
grant  execute on function public.list_wallet_members(uuid) to authenticated;

-- is_wallet_member: RLS helper. Revoke the catch-all PUBLIC grant, but
-- keep it executable by BOTH authenticated and anon, because RLS policies
-- that call it are evaluated under each role — revoking from anon would
-- turn an empty result into a "permission denied for function" error.
revoke execute on function public.is_wallet_member(uuid) from public;
grant  execute on function public.is_wallet_member(uuid) to authenticated, anon;

-- free_tier_limits: SECURITY INVOKER, returns only constants. Drop PUBLIC;
-- the client reads it as authenticated to drive its lock UI.
revoke execute on function public.free_tier_limits() from public, anon;
grant  execute on function public.free_tier_limits() to authenticated;

-- ---------------------------------------------------------------------
-- F2: remove direct REST DELETE on wallets. A single member could
-- otherwise `DELETE /wallets?id=eq...` and skip the two-member
-- request_or_delete_wallet / confirm_wallet_deletion handshake. The
-- deletion RPCs are SECURITY DEFINER and bypass RLS, so this is safe.
-- ---------------------------------------------------------------------
drop policy if exists wallets_delete_member on public.wallets;
