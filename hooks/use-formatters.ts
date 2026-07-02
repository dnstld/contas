import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useWallet } from '@/hooks/use-wallet';
import * as fmt from '@/utils/format';

/**
 * Binds the pure formatters in `@/utils/format` to the active locale + wallet
 * currency. Components use this; leaf atoms take `locale`/`currency` as props
 * and call `@/utils/format` directly (atomic layering).
 */
export function useFormatters() {
  const { i18n } = useTranslation();
  const { currency: userCurrency } = useWallet();
  const locale = i18n.language || 'en';

  return useMemo(
    () => ({
      locale,
      defaultCurrency: userCurrency,
      formatCurrency: (value: number, currency?: string, options?: fmt.CurrencyFormatOptions) =>
        fmt.formatCurrency(value, currency ?? userCurrency, locale, options),
      formatDecimal: (value: number, options?: Intl.NumberFormatOptions) =>
        fmt.formatDecimal(value, locale, options),
      // `formatNumber` and `formatDecimal` were identical; kept as an alias for callers.
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        fmt.formatDecimal(value, locale, options),
      formatPercent: (
        value: number,
        options?: { signDisplay?: Intl.NumberFormatOptions['signDisplay'] },
      ) => fmt.formatPercent(value, locale, options),
      currencySymbol: (currency?: string) => fmt.currencySymbol(currency ?? userCurrency, locale),
      monthName: (monthIndex0: number, style: 'long' | 'short' = 'long') =>
        fmt.monthName(monthIndex0, locale, style),
      formatDate: (date: Date, options: Intl.DateTimeFormatOptions) =>
        fmt.formatDate(date, locale, options),
    }),
    [locale, userCurrency],
  );
}
