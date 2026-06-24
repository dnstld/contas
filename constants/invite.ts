import { env } from '@/utils/env';

/**
 * Builds the link that gets shared in an invite.
 *
 * When `EXPO_PUBLIC_INVITE_LINK_BASE` points at the deployed EAS Hosting
 * redirect page, we share a clickable `https://…/i?code=…` URL. The page
 * bounces the recipient into the app via the `contas://` scheme (or to the
 * store if the app isn't installed). Until that's configured we fall back to
 * the raw deep link so the flow still works locally — it just won't be
 * tappable inside chat apps.
 */
export function inviteLinkUrl(code: string): string {
  const base = env.inviteLinkBase;
  if (base) return `${base.replace(/\/$/, '')}/i?code=${encodeURIComponent(code)}`;
  return `contas://redeem-code?code=${encodeURIComponent(code)}`;
}
