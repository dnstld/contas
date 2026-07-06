import { describe, expect, it } from 'vitest';

import { currencyLocale, normalizeCurrency } from '@/data/currency';
import { formatCurrency } from '@/utils/format';

describe('currencyLocale', () => {
  it('maps each currency to its home locale', () => {
    expect(currencyLocale('BRL')).toBe('pt-BR');
    expect(currencyLocale('USD')).toBe('en-US');
    expect(currencyLocale('EUR')).toBe('de-DE');
  });

  it('falls back to the default currency locale for unknown codes', () => {
    expect(currencyLocale('XXX')).toBe(currencyLocale(normalizeCurrency('XXX')));
    expect(currencyLocale(null)).toBe('pt-BR'); // DEFAULT_CURRENCY = BRL
  });
});

describe('amount formatting follows the currency, not the UI language', () => {
  // Regardless of the UI language, formatting an amount with its currency's
  // home locale yields the same, currency-native output.
  it('BRL always renders in Brazilian style', () => {
    expect(formatCurrency(1234.5, 'BRL', currencyLocale('BRL'))).toMatch(/^R\$\s1\.234,50$/);
  });

  it('USD always renders "$1,234.50" (narrow symbol)', () => {
    expect(formatCurrency(1234.5, 'USD', currencyLocale('USD'))).toBe('$1,234.50');
  });

  it('EUR always renders with a trailing symbol', () => {
    expect(formatCurrency(1234.5, 'EUR', currencyLocale('EUR'))).toMatch(/^1\.234,50\s€$/);
  });
});
