import { useMemo } from 'react';

import { useWallet } from '@/hooks/use-wallet';

export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function useCurrency() {
  const { currency, setCurrency, loading } = useWallet();

  return useMemo(
    () => ({
      currency: currency as SupportedCurrency,
      setCurrency: (next: SupportedCurrency) => setCurrency(next),
      hydrated: !loading,
      supported: SUPPORTED_CURRENCIES,
    }),
    [currency, setCurrency, loading],
  );
}
