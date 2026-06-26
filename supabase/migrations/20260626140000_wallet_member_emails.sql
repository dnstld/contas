-- =====================================================================
-- Wallet members with their account email
-- ---------------------------------------------------------------------
-- `profiles` only carries display_name + avatar_url, so the account
-- cards had no email to show for co-members. This SECURITY DEFINER
-- function joins `wallet_members` → `profiles` → `auth.users` to expose
-- each member's email, gated so only members of the wallet can read it
-- (same trust boundary as the email-based invite flow).
-- =====================================================================
create or replace function public.list_wallet_members(p_wallet_id uuid)
returns table (
  user_id uuid,
  joined_at timestamptz,
  display_name text,
  avatar_url text,
  email text
)
language sql security definer set search_path = public as $$
  select m.user_id, m.joined_at, p.display_name, p.avatar_url, u.email::text
  from public.wallet_members m
  left join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.wallet_id = p_wallet_id
    and public.is_wallet_member(p_wallet_id)
  order by m.joined_at asc;
$$;

grant execute on function public.list_wallet_members(uuid) to authenticated;
