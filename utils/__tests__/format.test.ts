import { describe, expect, it } from 'vitest';

import {
  currencySymbol,
  formatCurrency,
  formatDate,
  formatDecimal,
  formatPercent,
  monthName,
} from '@/utils/format';

describe('formatCurrency', () => {
  it('formats the supported currencies in en', () => {
    expect(formatCurrency(1234.5, 'USD', 'en')).toBe('$1,234.50');
    expect(formatCurrency(1234.5, 'EUR', 'en')).toBe('€1,234.50');
  });

  it('is locale-aware (pt-BR groups/decimals differently)', () => {
    // BRL in pt-BR: "R$ 1.234,50" (NBSP after R$).
    expect(formatCurrency(1234.5, 'BRL', 'pt-BR')).toMatch(/^R\$\s1\.234,50$/);
  });

  it('honors fractionDigits and signDisplay', () => {
    expect(formatCurrency(1234, 'USD', 'en', { fractionDigits: 0 })).toBe('$1,234');
    expect(formatCurrency(1234.5, 'USD', 'en', { signDisplay: 'always' })).toBe('+$1,234.50');
    expect(formatCurrency(0, 'USD', 'en', { signDisplay: 'exceptZero' })).toBe('$0.00');
  });
});

describe('formatPercent', () => {
  it('formats as whole-number percent', () => {
    expect(formatPercent(0.15, 'en')).toBe('15%');
    expect(formatPercent(0.156, 'en')).toBe('16%'); // rounds, 0 fraction digits
  });

  it('honors signDisplay', () => {
    expect(formatPercent(0.15, 'en', { signDisplay: 'exceptZero' })).toBe('+15%');
    expect(formatPercent(0, 'en', { signDisplay: 'exceptZero' })).toBe('0%');
  });
});

describe('formatDecimal', () => {
  it('defaults to 2 fraction digits', () => {
    expect(formatDecimal(1234.5, 'en')).toBe('1,234.50');
  });
});

describe('currencySymbol', () => {
  it('derives the symbol for the supported currencies', () => {
    expect(currencySymbol('USD', 'en')).toBe('$');
    expect(currencySymbol('EUR', 'en')).toBe('€');
    expect(currencySymbol('BRL', 'pt-BR')).toBe('R$');
  });
});

describe('monthName', () => {
  it('formats a 0-based month index', () => {
    expect(monthName(0, 'en', 'long')).toBe('January');
    expect(monthName(6, 'en', 'short')).toBe('Jul');
  });
});

describe('formatDate', () => {
  it('passes options straight through to Intl.DateTimeFormat', () => {
    const d = new Date('2026-07-15T09:30:00Z');
    expect(formatDate(d, 'en', { month: 'short', day: '2-digit', timeZone: 'UTC' })).toBe('Jul 15');
  });
});
