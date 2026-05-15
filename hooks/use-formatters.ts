import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrency } from '@/hooks/use-currency';

export function useFormatters() {
  const { i18n } = useTranslation();
  const { currency: userCurrency } = useCurrency();
  const locale = i18n.language || 'en';

  return useMemo(
    () => ({
      locale,
      defaultCurrency: userCurrency,
      formatCurrency: (value: number, currency?: string) =>
        new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency ?? userCurrency,
          maximumFractionDigits: 2,
        }).format(value),
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          ...options,
        }).format(value),
      monthName: (monthIndex0: number, style: 'long' | 'short' = 'long') =>
        new Intl.DateTimeFormat(locale, { month: style }).format(
          new Date(2024, monthIndex0, 1),
        ),
    }),
    [locale, userCurrency],
  );
}
