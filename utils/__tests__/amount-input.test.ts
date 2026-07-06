import { describe, expect, it } from 'vitest';

import { nextAmountCents } from '@/utils/amount-input';

describe('nextAmountCents', () => {
  it('appends a typed digit by shifting cents left', () => {
    // "0,00" (0 cents) → user types "5" → mask digits "000" → "0005"
    expect(nextAmountCents(0, '0,00', '0,005')).toBe(5);
    // 5 cents → type "0" → "0,050"
    expect(nextAmountCents(5, '0,05', '0,050')).toBe(50);
    // 50 cents → type "1" → 501
    expect(nextAmountCents(50, '0,50', '0,501')).toBe(501);
  });

  it('is cursor-position independent (typing at the front behaves the same)', () => {
    // Same underlying edit whether the "5" lands at the front or the back:
    // both add exactly one digit, so one digit shifts in.
    expect(nextAmountCents(0, '0,00', '50,00')).toBe(5);
    expect(nextAmountCents(0, '0,00', '0,005')).toBe(5);
  });

  it('removes low-order digits on backspace', () => {
    expect(nextAmountCents(1234, '12,34', '12,3')).toBe(123);
    expect(nextAmountCents(123, '1,23', '1,2')).toBe(12);
    expect(nextAmountCents(5, '0,05', '0,0')).toBe(0);
  });

  it('handles multi-digit paste (added chars shift in order)', () => {
    expect(nextAmountCents(0, '0,00', '0,00123')).toBe(123);
  });

  it('returns the current value when the digit stream is unchanged', () => {
    // Non-digit-only edits (e.g. separators) leave the value untouched.
    expect(nextAmountCents(1234, '12,34', '1234')).toBe(1234);
    expect(nextAmountCents(1234, '12,34', '12.34')).toBe(1234);
  });

  it('works the same for a locale that groups differently', () => {
    // en mask "1,234.56" and pt-BR mask "1.234,56" both reduce to digits
    // "123456", so the same typed edit yields the same cents.
    expect(nextAmountCents(123456, '1,234.56', '1,234.567')).toBe(1234567);
    expect(nextAmountCents(123456, '1.234,56', '1.234,567')).toBe(1234567);
  });
});
