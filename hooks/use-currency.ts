import { useMemo } from 'react';

import { usePersistedState } from '@/hooks/use-persisted-state';
import { getDeviceLanguageTag } from '@/i18n';

export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_STORAGE_KEY = 'settings:currency';

let cachedDeviceDefault: SupportedCurrency | undefined;

export function deviceDefaultCurrency(): SupportedCurrency {
  if (cachedDeviceDefault) return cachedDeviceDefault;
  const tag = (getDeviceLanguageTag() ?? '').toLowerCase();
  cachedDeviceDefault = tag.startsWith('pt') ? 'BRL' : 'EUR';
  return cachedDeviceDefault;
}

export function useCurrency() {
  const [stored, setStored, { hydrated }] = usePersistedState<SupportedCurrency | null>(
    CURRENCY_STORAGE_KEY,
    null,
  );

  return useMemo(
    () => ({
      currency: stored ?? deviceDefaultCurrency(),
      setCurrency: (next: SupportedCurrency) => setStored(next),
      hydrated,
      supported: SUPPORTED_CURRENCIES,
    }),
    [stored, setStored, hydrated],
  );
}
