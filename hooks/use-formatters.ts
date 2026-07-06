import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { currencyLocale } from '@/data/currency';
import { formattingLocale } from '@/i18n';
import { useWallet } from '@/hooks/use-wallet';
import * as fmt from '@/utils/format';

/**
 * Binds the pure formatters in `@/utils/format` to the wallet currency and UI
 * language. Monetary values (formatCurrency/formatAmount/currencySymbol/
 * currencyAffix) follow the *currency's* locale via `currencyLocale`, so an
 * amount always looks native to its money regardless of UI language. Everything
 * non-monetary (decimals, percents, month names, dates) follows the UI language.
 * Components use this; leaf atoms take `currency` as a prop and call
 * `@/utils/format` directly (atomic layering).
 */
export function useFormatters() {
  const { i18n } = useTranslation();
  const { currency: userCurrency } = useWallet();
  const locale = formattingLocale(i18n.language);

  return useMemo(
    () => ({
      locale,
      defaultCurrency: userCurrency,
      formatCurrency: (value: number, currency?: string, options?: fmt.CurrencyFormatOptions) =>
        fmt.formatCurrency(
          value,
          currency ?? userCurrency,
          currencyLocale(currency ?? userCurrency),
          options,
        ),
      // The amount number (no symbol) in the currency's locale — for the
      // formatted value shown inside editable money fields.
      formatAmount: (value: number, currency?: string) =>
        fmt.formatDecimal(value, currencyLocale(currency ?? userCurrency)),
      formatDecimal: (value: number, options?: Intl.NumberFormatOptions) =>
        fmt.formatDecimal(value, locale, options),
      // `formatNumber` and `formatDecimal` were identical; kept as an alias for callers.
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        fmt.formatDecimal(value, locale, options),
      formatPercent: (
        value: number,
        options?: { signDisplay?: Intl.NumberFormatOptions['signDisplay'] },
      ) => fmt.formatPercent(value, locale, options),
      currencySymbol: (currency?: string) =>
        fmt.currencySymbol(currency ?? userCurrency, currencyLocale(currency ?? userCurrency)),
      currencyAffix: (currency?: string) =>
        fmt.currencyAffix(currency ?? userCurrency, currencyLocale(currency ?? userCurrency)),
      monthName: (monthIndex0: number, style: 'long' | 'short' = 'long') =>
        fmt.monthName(monthIndex0, locale, style),
      formatDate: (date: Date, options: Intl.DateTimeFormatOptions) =>
        fmt.formatDate(date, locale, options),
    }),
    [locale, userCurrency],
  );
}
