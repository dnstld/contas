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

/**
 * The canonical BCP-47 locale used to format an amount in a given currency.
 *
 * Monetary formatting follows the *currency*, not the UI language: a BRL amount
 * always renders in Brazilian style (`R$ 1.234,56`) whether the app is in
 * English, Portuguese, or German. This keeps every amount looking native to its
 * money and avoids locale-driven surprises (e.g. a trailing symbol in German).
 * Only non-monetary text (dates, month names, counts) follows the UI language.
 */
const CURRENCY_LOCALE: Record<SupportedCurrency, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
};

export function currencyLocale(currency: string | null | undefined): string {
  return CURRENCY_LOCALE[normalizeCurrency(currency)];
}

/**
 * Maps an ISO 3166-1 alpha-2 region code (e.g. from `expo-localization`) to a
 * sensible default currency for the create-wallet form. This is only a smart
 * default — the user can still pick any supported currency. Unknown regions
 * fall back to `DEFAULT_CURRENCY`.
 */
const REGION_TO_CURRENCY: Record<string, SupportedCurrency> = {
  BR: 'BRL',
  US: 'USD',
  // Euro-area regions default to EUR.
  DE: 'EUR',
  AT: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  BE: 'EUR',
};

export function defaultCurrencyForRegion(region: string | null | undefined): SupportedCurrency {
  if (!region) return DEFAULT_CURRENCY;
  return REGION_TO_CURRENCY[region.toUpperCase()] ?? DEFAULT_CURRENCY;
}
