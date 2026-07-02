import { generateDemoFinance } from './finance-demo';
import {
  txDate,
  type Category,
  type Finance,
  type OneOffTransaction,
  type Transaction,
} from './finance-types';

/**
 * Onboarding "example" data shown on a fresh wallet (no real categories). It
 * reuses the demo generator's realistic transactions, re-dated into the current
 * and previous month under stable `example:` category ids, so the grid cards and
 * the category detail screen can render a believable — but clearly badged —
 * sample the user can explore. Read-only: these never hit the database.
 */

export const EXAMPLE_CATEGORY_PREFIX = 'example:';

export function isExampleCategoryId(id: string): boolean {
  return id.startsWith(EXAMPLE_CATEGORY_PREFIX);
}

export type ExampleSlot = 'groceries' | 'pharmacy' | 'transport';

export type ExampleNames = Record<ExampleSlot, string>;

// Map each example slot onto a demo expense category with matching semantics so
// the borrowed transactions (descriptions + amounts) read naturally.
const SLOT_SOURCE: Record<ExampleSlot, string> = {
  groceries: 'mercado',
  pharmacy: 'saude',
  transport: 'transporte',
};

const CURRENT_COUNT = 5;
const PREVIOUS_COUNT = 4;

export function generateExampleFinance(currency: string, now: Date, names: ExampleNames): Finance {
  const demo = generateDemoFinance(currency);
  const year = now.getFullYear();
  const month = now.getMonth();
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;

  const categories: Category[] = [];
  const transactions: Transaction[] = [];

  (Object.keys(SLOT_SOURCE) as ExampleSlot[]).forEach((slot) => {
    const exampleId = `${EXAMPLE_CATEGORY_PREFIX}${slot}`;
    categories.push({
      id: exampleId,
      name: names[slot],
      type: 'expense',
      createdAt: new Date(year, 0, 1).toISOString(),
    });

    // Borrow one-off demo transactions for the mapped source category.
    const pool = demo.transactions.filter(
      (t): t is OneOffTransaction =>
        t.categoryId === SLOT_SOURCE[slot] && t.kind === 'one-off' && t.status === 'completed',
    );

    const place = (
      source: OneOffTransaction[],
      targetYear: number,
      targetMonth: number,
      tag: string,
    ) => {
      source.forEach((t, i) => {
        const day = Math.min(2 + i * 5, 28);
        const iso = new Date(targetYear, targetMonth, day).toISOString();
        transactions.push({
          ...t,
          id: `${exampleId}:${tag}${i}`,
          categoryId: exampleId,
          categoryName: names[slot],
          date: iso,
          createdAt: iso,
          updatedAt: iso,
        });
      });
    };

    place(pool.slice(0, CURRENT_COUNT), year, month, 'c');
    place(pool.slice(CURRENT_COUNT, CURRENT_COUNT + PREVIOUS_COUNT), prevYear, prevMonth, 'p');
  });

  const years = Array.from(new Set(transactions.map((t) => txDate(t).getFullYear()))).sort(
    (a, b) => a - b,
  );

  return { years, currency, categories, transactions };
}
