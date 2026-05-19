import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CategoryCardData } from '@/components/ui/organisms/category-card';
import type { CategoryFilterItem } from '@/components/ui/organisms/category-filter';
import type { SortOption } from '@/components/ui/molecules/sort-menu';
import { useFormatters } from '@/hooks/use-formatters';

export type CategorySortMode = 'highestExpense' | 'mostUsed' | 'overBudget';

export interface UseCategoryGridOptions {
  categories: readonly CategoryCardData[];
  filterItems?: readonly CategoryFilterItem[];
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
  summary: string | null;
}

export function useCategoryGrid({
  categories,
  currency = 'USD',
  period,
}: UseCategoryGridOptions): UseCategoryGridResult {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatters();
  const [sort, setSort] = useState<CategorySortMode>('highestExpense');
  const [selected, setSelectedState] = useState<readonly string[]>([]);

  const sortOptions = useMemo<readonly SortOption<CategorySortMode>[]>(
    () => [
      { value: 'highestExpense', label: t('category.sort.highestExpense') },
      { value: 'mostUsed', label: t('category.sort.mostUsed') },
      { value: 'overBudget', label: t('category.sort.overBudget') },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    if (selected.length === 0) return categories;
    return categories.filter((c) => selected.includes(c.id));
  }, [categories, selected]);

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
      case 'overBudget':
        return arr.sort((a, b) => budgetRatio(b) - budgetRatio(a));
      case 'highestExpense':
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
    summary,
  };
}

function budgetRatio(c: CategoryCardData) {
  if (!c.budget || c.budget === 0) return Number.NEGATIVE_INFINITY;
  return c.total / c.budget;
}
