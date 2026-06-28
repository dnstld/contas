import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CategoryCardData } from '@/components/ui/organisms/category-card';
import type { CategoryPickerItem } from '@/components/ui/organisms/category-picker';
import type { SortOption } from '@/components/ui/molecules/sort-menu';
import { useFormatters } from '@/hooks/use-formatters';

export type CategorySortMode = 'highestExpense' | 'mostUsed' | 'income';

/** Each sort mode also scopes the list to a category kind. */
function kindForSort(sort: CategorySortMode): 'expense' | 'income' {
  return sort === 'income' ? 'income' : 'expense';
}

export interface UseCategoryGridOptions {
  categories: readonly CategoryCardData[];
  filterItems?: readonly CategoryPickerItem[];
  currency?: string;
  period?: 'month' | 'year';
}

export interface UseCategoryGridResult {
  sortOptions: readonly SortOption<CategorySortMode>[];
  sort: CategorySortMode;
  setSort: (next: CategorySortMode) => void;
  selected: readonly string[];
  setSelected: (next: readonly string[]) => void;
  sorted: CategoryCardData[];
  /** Filter chips scoped to the active sort's kind (expense vs income). */
  filterItems: readonly CategoryPickerItem[];
  summary: string | null;
}

export function useCategoryGrid({
  categories,
  filterItems,
  currency = 'USD',
  period,
}: UseCategoryGridOptions): UseCategoryGridResult {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatters();
  const [sort, setSortState] = useState<CategorySortMode>('highestExpense');
  const [selected, setSelectedState] = useState<readonly string[]>([]);

  // Switching between expense- and income-scoped sorts clears the chip selection,
  // since selected ids belong to the previous kind.
  const setSort = useCallback((next: CategorySortMode) => {
    setSortState((prev) => {
      if (kindForSort(prev) !== kindForSort(next)) setSelectedState([]);
      return next;
    });
  }, []);

  const sortOptions = useMemo<readonly SortOption<CategorySortMode>[]>(
    () => [
      { value: 'highestExpense', label: t('category.sort.highestExpense') },
      { value: 'mostUsed', label: t('category.sort.mostUsed') },
      { value: 'income', label: t('category.sort.income') },
    ],
    [t],
  );

  const kind = kindForSort(sort);

  const byKind = useMemo(
    () => categories.filter((c) => (c.kind ?? 'expense') === kind),
    [categories, kind],
  );

  // Chips reflect the active kind's categories (pre-selection).
  const kindFilterItems = useMemo(() => {
    if (!filterItems) return [];
    const ids = new Set(byKind.map((c) => c.id));
    return filterItems.filter((f) => ids.has(f.id));
  }, [filterItems, byKind]);

  const filtered = useMemo(() => {
    if (selected.length === 0) return byKind;
    return byKind.filter((c) => selected.includes(c.id));
  }, [byKind, selected]);

  const summary = useMemo(() => {
    if (selected.length === 0) return null;
    let expenseSum = 0;
    let revenueSum = 0;
    for (const c of filtered) {
      if (c.kind === 'income') revenueSum += c.total;
      else expenseSum += c.total;
    }
    const count = selected.length;
    const parts = [t('category.selectedCount', { count })];
    if (expenseSum > 0 && revenueSum > 0) {
      parts.push(`${t('overview.expenses')} ${formatCurrency(expenseSum, currency)}`);
      parts.push(`${t('overview.revenue')} ${formatCurrency(revenueSum, currency)}`);
    } else if (expenseSum > 0) {
      parts.push(formatCurrency(expenseSum, currency));
    } else if (revenueSum > 0) {
      parts.push(formatCurrency(revenueSum, currency));
    }
    const base = parts.join(' · ');
    const suffix =
      period === 'year'
        ? ` ${t('category.perYear')}`
        : period === 'month'
          ? ` ${t('category.perMonth')}`
          : '';
    return parts.length > 1 ? `${base}${suffix}` : base;
  }, [filtered, selected, currency, period, t, formatCurrency]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case 'mostUsed':
        return arr.sort((a, b) => {
          const countDiff = (b.entryCount ?? 0) - (a.entryCount ?? 0);
          if (countDiff !== 0) return countDiff;
          return b.total - a.total;
        });
      // Highest expense and highest income both order by the card's total
      // (which is revenue for income cards) descending.
      case 'highestExpense':
      case 'income':
        return arr.sort((a, b) => b.total - a.total);
      default: {
        const _exhaustive: never = sort;
        return _exhaustive;
      }
    }
  }, [filtered, sort]);

  return {
    sortOptions,
    sort,
    setSort,
    selected,
    setSelected: setSelectedState,
    sorted,
    filterItems: kindFilterItems,
    summary,
  };
}
