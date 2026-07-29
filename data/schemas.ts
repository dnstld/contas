import { z } from 'zod';

/**
 * Narrow runtime schemas for values that flow in from Supabase. We don't
 * wholesale-validate every row — that would duplicate the auto-generated
 * `Database` types. We do guard the enums and RPC return values where a
 * mismatch between client and server would silently produce wrong behavior.
 */

export const TransactionTypeSchema = z.enum(['expense', 'income']);
export type TransactionTypeParsed = z.infer<typeof TransactionTypeSchema>;

export const TransactionStatusSchema = z.enum(['completed', 'scheduled']);
export type TransactionStatusParsed = z.infer<typeof TransactionStatusSchema>;

export const RecurrenceSchema = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']);
export type RecurrenceParsed = z.infer<typeof RecurrenceSchema>;

/**
 * Boundary guard for `category_items` rows. Like the transaction schemas, we
 * only validate the enum that would silently misbehave on a client/DB drift —
 * the rest of the row is trusted from the generated `Database` types.
 */
export const CategoryItemRowSchema = z.object({
  recurrence: RecurrenceSchema,
});
export type CategoryItemRowParsed = z.infer<typeof CategoryItemRowSchema>;

export const DeleteWalletResultSchema = z.enum(['deleted', 'pending']);
export type DeleteWalletResultParsed = z.infer<typeof DeleteWalletResultSchema>;

/**
 * Outgoing-invitation status. The `wallet_invitations.status` column is `text`
 * (generated type `string`) but constrained at the DB to exactly these values
 * (`wallet_invitations_status_check`), so this enum is the complete set.
 */
export const InvitationStatusSchema = z.enum(['pending', 'declined']);
export type InvitationStatusParsed = z.infer<typeof InvitationStatusSchema>;

/**
 * Shape of the `free_tier_limits()` RPC payload (typed `Json` in the generated
 * types). Validated at the boundary so a server/client drift surfaces instead
 * of silently producing `NaN` limits.
 */
export const FreeTierLimitsRowSchema = z.object({
  max_wallets_per_user: z.number(),
  max_pending_invites_per_wallet: z.number(),
});
export type FreeTierLimitsRowParsed = z.infer<typeof FreeTierLimitsRowSchema>;
