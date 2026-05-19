export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: SupportedCurrency = 'BRL';

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Coerce an arbitrary string (typically from Supabase) into a known currency. */
export function normalizeCurrency(value: string | null | undefined): SupportedCurrency {
  return value && isSupportedCurrency(value) ? value : DEFAULT_CURRENCY;
}
