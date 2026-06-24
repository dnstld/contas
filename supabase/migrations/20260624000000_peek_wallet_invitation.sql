-- =====================================================================
-- peek_wallet_invitation
-- ---------------------------------------------------------------------
-- Read-only counterpart to `redeem_wallet_invitation`. Lets a signed-in
-- user preview *what* they're about to join (wallet name + inviter name)
-- before committing, without consuming the single-use invitation.
--
-- SECURITY DEFINER is required because the caller is not yet a member of
-- the wallet, so RLS on `wallets` / `wallet_invitations` / `profiles`
-- would otherwise hide every row. The function only ever returns the
-- wallet name and inviter display name for a code the caller already
-- holds, so it leaks nothing a valid invite link wouldn't already imply.
-- =====================================================================

create or replace function public.peek_wallet_invitation(p_code text)
returns table (wallet_name text, inviter_name text, expired boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_invitation public.wallet_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invitation
  from public.wallet_invitations
  where code = p_code;

  if not found then
    raise exception 'invitation not found';
  end if;

  return query
  select w.name,
         nullif(p.display_name, ''),
         (v_invitation.expires_at <= now())
  from public.wallets w
  left join public.profiles p on p.id = v_invitation.created_by
  where w.id = v_invitation.wallet_id;
end;
$$;

grant execute on function public.peek_wallet_invitation(text) to authenticated;
