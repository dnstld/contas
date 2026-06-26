/**
 * Domain limits that should not be inlined as magic numbers.
 */

// Free-tier caps (max wallets per user, max pending invites per wallet) are
// NOT here — they live solely in the DB `free_tier_limits()` RPC and are read
// in the app via `useFreeTierLimits()`. Keeping a copy here would let them
// drift out of sync.

export const TRANSACTION_DESCRIPTION_MAX_LENGTH = 100;

export const CATEGORY_NAME_MAX_LENGTH = 50;

export const DISPLAY_NAME_MAX_LENGTH = 80;
