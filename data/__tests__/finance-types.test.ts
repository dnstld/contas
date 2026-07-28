import { describe, expect, it } from 'vitest';

import {
  parseDayStart,
  toDayString,
  transactionDate,
  txDate,
  type OneOffTransaction,
} from '@/data/finance-types';

describe('day-string helpers — calendar dates are timezone-stable', () => {
  it('toDayString formats a Date as local YYYY-MM-DD with zero padding', () => {
    expect(toDayString(new Date(2026, 6, 6))).toBe('2026-07-06'); // month index 6 = July
    expect(toDayString(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDayString(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('parseDayStart builds local midnight from parts (never UTC-parsed)', () => {
    const d = parseDayStart('2026-07-06');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(6);
    // Local midnight, so no time-of-day can push the day across a zone boundary.
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('round-trips toDayString ↔ parseDayStart', () => {
    for (const day of ['2026-01-01', '2026-03-09', '2026-12-31']) {
      expect(toDayString(parseDayStart(day))).toBe(day);
    }
  });

  it('reads the stored calendar day literally from a legacy full-ISO string', () => {
    // A late-evening UTC instant must NOT be reinterpreted into the next day:
    // we take the leading date portion verbatim.
    const d = parseDayStart('2026-07-06T22:30:00.000Z');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(6);
  });

  it('txDate parses a one-off transaction date to local midnight', () => {
    const tx: OneOffTransaction = {
      id: 't',
      kind: 'one-off',
      recurrence: 'none',
      type: 'expense',
      categoryId: 'c',
      categoryName: 'C',
      amount: 10,
      description: '',
      status: 'completed',
      date: '2026-07-06',
      createdAt: '2026-07-06T09:00:00.000Z',
      updatedAt: '2026-07-06T09:00:00.000Z',
      createdByUserId: null,
      onBehalfOfUserId: null,
    };
    expect(transactionDate(tx)).toBe('2026-07-06');
    expect(txDate(tx).getDate()).toBe(6);
    expect(txDate(tx).getMonth()).toBe(6);
  });
});
