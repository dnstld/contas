import { describe, expect, it } from 'vitest';

import { isExpectedConstraintError } from '@/utils/error';

describe('isExpectedConstraintError', () => {
  it('is true for a duplicate-key violation (Postgres 23505)', () => {
    // Shape Supabase/PostgREST throws for a unique-constraint violation.
    const err = {
      code: '23505',
      details: 'Key (cat, name)=(1, Food) already exists.',
      hint: null,
      message: 'duplicate key value violates unique constraint "category_items_cat_name_idx"',
    };
    expect(isExpectedConstraintError(err)).toBe(true);
  });

  it('is false for other constraint codes that may indicate real bugs', () => {
    expect(isExpectedConstraintError({ code: '23503' })).toBe(false); // foreign key
    expect(isExpectedConstraintError({ code: '23502' })).toBe(false); // not-null
    expect(isExpectedConstraintError({ code: '42501' })).toBe(false); // RLS / permission
    expect(isExpectedConstraintError({ code: 'PGRST116' })).toBe(false); // not found
  });

  it('is false when there is no code', () => {
    expect(isExpectedConstraintError({ message: 'something went wrong' })).toBe(false);
    expect(isExpectedConstraintError(new Error('boom'))).toBe(false);
    expect(isExpectedConstraintError('23505')).toBe(false); // bare string, no code field
    expect(isExpectedConstraintError(null)).toBe(false);
    expect(isExpectedConstraintError(undefined)).toBe(false);
  });

  it('ignores a non-string code', () => {
    // getErrorCode only recognizes string codes; a numeric code should not match.
    expect(isExpectedConstraintError({ code: 23505 })).toBe(false);
  });
});
