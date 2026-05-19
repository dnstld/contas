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

export const RecurrenceSchema = z.enum(['none', 'daily', 'weekly', 'monthly']);
export type RecurrenceParsed = z.infer<typeof RecurrenceSchema>;

export const DeleteWalletResultSchema = z.enum(['deleted', 'pending']);
export type DeleteWalletResultParsed = z.infer<typeof DeleteWalletResultSchema>;
