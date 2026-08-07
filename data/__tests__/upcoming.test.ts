import { describe, expect, it } from 'vitest';

import { buildUpcoming, nextOccurrenceOnOrAfter } from '@/data/finance-aggregations';
import type { Category, CategoryItem } from '@/data/finance-types';
import { parseDayStart } from '@/data/finance-types';

const categories: Category[] = [
  { id: 'subs', name: 'Subscriptions', type: 'expense' },
  { id: 'salary', name: 'Salary', type: 'income' },
];

function mkItem(overrides: Partial<CategoryItem> & Pick<CategoryItem, 'id'>): CategoryItem {
  return {
    categoryId: 'subs',
    name: overrides.id,
    recurrence: 'monthly',
    ...overrides,
  };
}

describe('nextOccurrenceOnOrAfter', () => {
  describe('daily', () => {
    it('rolls a past anchor forward to today (from)', () => {
      expect(nextOccurrenceOnOrAfter('2026-07-01', 'daily', parseDayStart('2026-07-15'))).toBe(
        '2026-07-15',
      );
    });

    it('keeps a future anchor', () => {
      expect(nextOccurrenceOnOrAfter('2026-07-20', 'daily', parseDayStart('2026-07-15'))).toBe(
        '2026-07-20',
      );
    });
  });

  describe('weekly', () => {
    it('steps +7 days preserving weekday until on/after from', () => {
      // 2026-07-01 is a Wednesday; stepping lands on the Wednesday >= from.
      expect(nextOccurrenceOnOrAfter('2026-07-01', 'weekly', parseDayStart('2026-07-15'))).toBe(
        '2026-07-15',
      );
      expect(nextOccurrenceOnOrAfter('2026-07-01', 'weekly', parseDayStart('2026-07-16'))).toBe(
        '2026-07-22',
      );
    });

    it('keeps a future anchor', () => {
      expect(nextOccurrenceOnOrAfter('2026-07-20', 'weekly', parseDayStart('2026-07-15'))).toBe(
        '2026-07-20',
      );
    });
  });

  describe('monthly', () => {
    it('clamps day 31 to Feb 28 in a non-leap year', () => {
      expect(nextOccurrenceOnOrAfter('2026-01-31', 'monthly', parseDayStart('2026-02-01'))).toBe(
        '2026-02-28',
      );
    });

    it('clamps day 31 to Feb 29 in a leap year', () => {
      expect(nextOccurrenceOnOrAfter('2024-01-31', 'monthly', parseDayStart('2024-02-01'))).toBe(
        '2024-02-29',
      );
    });

    it('recomputes the clamp from the original day (later long months are not shrunk)', () => {
      // Jan 31 anchor: Feb clamps to 28, but March must return to 31.
      expect(nextOccurrenceOnOrAfter('2026-01-31', 'monthly', parseDayStart('2026-03-01'))).toBe(
        '2026-03-31',
      );
    });

    it('keeps a future anchor and steps a past one by whole months', () => {
      expect(nextOccurrenceOnOrAfter('2026-03-15', 'monthly', parseDayStart('2026-03-10'))).toBe(
        '2026-03-15',
      );
      expect(nextOccurrenceOnOrAfter('2026-03-15', 'monthly', parseDayStart('2026-03-20'))).toBe(
        '2026-04-15',
      );
    });
  });

  describe('yearly', () => {
    it('clamps Feb 29 to Feb 28 on a non-leap year', () => {
      expect(nextOccurrenceOnOrAfter('2024-02-29', 'yearly', parseDayStart('2025-01-01'))).toBe(
        '2025-02-28',
      );
    });

    it('returns Feb 29 again on the next leap year', () => {
      expect(nextOccurrenceOnOrAfter('2024-02-29', 'yearly', parseDayStart('2028-01-01'))).toBe(
        '2028-02-29',
      );
    });
  });
});

describe('buildUpcoming', () => {
  // Local July 15, 2026 → window is [2026-07-15, 2026-07-25] (today + 10 days).
  const now = new Date(2026, 6, 15);

  it('includes a recurring expense item due within the window, sorted by due date', () => {
    const items: CategoryItem[] = [
      mkItem({ id: 'later', nextDueOn: '2026-07-24' }), // rolls to 2026-07-24
      mkItem({ id: 'soon', nextDueOn: '2026-07-20' }),
    ];
    const result = buildUpcoming(items, categories, now);
    expect(result.map((o) => o.item.id)).toEqual(['soon', 'later']);
    expect(result.map((o) => o.dueOn)).toEqual(['2026-07-20', '2026-07-24']);
  });

  it('rolls a past anchor forward into the window', () => {
    const items = [mkItem({ id: 'old', nextDueOn: '2026-06-20' })];
    const [occ] = buildUpcoming(items, categories, now);
    expect(occ?.dueOn).toBe('2026-07-20');
  });

  it('includes an occurrence exactly at today + windowDays and excludes beyond it', () => {
    const items: CategoryItem[] = [
      mkItem({ id: 'boundary', nextDueOn: '2026-07-25' }), // == today + 10
      mkItem({ id: 'beyond', nextDueOn: '2026-07-26' }), // == today + 11
    ];
    const result = buildUpcoming(items, categories, now);
    expect(result.map((o) => o.item.id)).toEqual(['boundary']);
  });

  it('excludes archived items', () => {
    const items = [
      mkItem({ id: 'archived', nextDueOn: '2026-07-20', archivedAt: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(buildUpcoming(items, categories, now)).toEqual([]);
  });

  it('excludes items in an income category', () => {
    const items = [mkItem({ id: 'salary', categoryId: 'salary', nextDueOn: '2026-07-20' })];
    expect(buildUpcoming(items, categories, now)).toEqual([]);
  });

  it('excludes items whose category is archived', () => {
    const archivedCategories: Category[] = [
      {
        id: 'subs',
        name: 'Subscriptions',
        type: 'expense',
        archivedAt: '2026-06-01T00:00:00.000Z',
      },
    ];
    const items = [mkItem({ id: 'netflix', nextDueOn: '2026-07-20' })];
    expect(buildUpcoming(items, archivedCategories, now)).toEqual([]);
  });

  it("excludes items with recurrence 'none' or no due date", () => {
    const items: CategoryItem[] = [
      mkItem({ id: 'oneoff', recurrence: 'none', nextDueOn: undefined }),
      mkItem({ id: 'nodate', recurrence: 'monthly', nextDueOn: undefined }),
    ];
    expect(buildUpcoming(items, categories, now)).toEqual([]);
  });
});
