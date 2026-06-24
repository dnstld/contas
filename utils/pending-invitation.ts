/**
 * Holds an invite code that arrived via deep link while the user was signed
 * out. The auth gate redirects unauthenticated deep links to the sign-in
 * screen, which would otherwise drop the `?code=` param — so we stash it
 * (in memory for warm navigation, plus kv-store to survive a cold start) and
 * replay it once a session exists.
 */

import { getKVStore } from '@/utils/kv-store';
import { captureError } from '@/utils/monitoring';

const KEY = 'invitation:pending-code';

let pending: string | null = null;

export async function setPendingInvitation(code: string): Promise<void> {
  pending = code;
  try {
    const storage = await getKVStore();
    await storage?.setItem(KEY, code);
  } catch (err) {
    captureError(err, { tags: { context: 'invitation' } });
  }
}

/** Returns the stashed code (if any) and clears it from both stores. */
export async function takePendingInvitation(): Promise<string | null> {
  let code = pending;
  pending = null;
  try {
    const storage = await getKVStore();
    if (!code && storage) code = await storage.getItem(KEY);
    await storage?.setItem(KEY, '');
  } catch (err) {
    captureError(err, { tags: { context: 'invitation' } });
  }
  return code && code.length > 0 ? code : null;
}
