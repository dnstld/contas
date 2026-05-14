import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { CategoryFilter, type CategoryFilterItem } from '@/components/ui/organisms/category-filter';
import { CategoryCard, type CategoryCardData } from '@/components/ui/organisms/category-card';
import { EmptyState } from '@/components/ui/molecules/empty-state';
import { SortMenu, type SortOption } from '@/components/ui/molecules/sort-menu';

export type CategorySortMode =
  | 'highestExpense'
  | 'mostUsed'
  | 'overBudget';

const SORT_OPTIONS: readonly SortOption<CategorySortMode>[] = [
  { value: 'highestExpense', label: 'Maior despesa' },
  { value: 'mostUsed', label: 'Mais usadas' },
  { value: 'overBudget', label: 'Acima do orçamento' },
];

export interface CategoryGridProps {
  categories: readonly CategoryCardData[];
  filterItems?: readonly CategoryFilterItem[];
  currency?: string;
  revenueVisible?: boolean;
  /** Period the totals represent — used to append "por mês" / "por ano" to the filter summary. */
  period?: 'month' | 'year';
  onCardPress?: (id: string) => void;
}

export function CategoryGrid({
  categories,
  filterItems,
  currency = 'USD',
  revenueVisible = false,
  period,
  onCardPress,
}: CategoryGridProps) {
  const [sort, setSort] = useState<CategorySortMode>('highestExpense');
  const [selected, setSelected] = useState<readonly string[]>([]);

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
    const parts = [`${count} ${count === 1 ? 'selecionada' : 'selecionadas'}`];
    if (expenseSum > 0 && revenueSum > 0) {
      parts.push(`Despesas ${formatCurrency(expenseSum, currency)}`);
      parts.push(`Receitas ${formatCurrency(revenueSum, currency)}`);
    } else if (expenseSum > 0) {
      parts.push(formatCurrency(expenseSum, currency));
    } else if (revenueSum > 0) {
      parts.push(formatCurrency(revenueSum, currency));
    }
    const base = parts.join(' · ');
    const suffix = period === 'year' ? ' por ano' : period === 'month' ? ' por mês' : '';
    return parts.length > 1 ? `${base}${suffix}` : base;
  }, [filtered, selected, currency, period]);

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
        // Most over budget first; categories without a budget go last.
        return arr.sort((a, b) => budgetRatio(b) - budgetRatio(a));
      case 'highestExpense':
      default:
        return arr.sort((a, b) => b.total - a.total);
    }
  }, [filtered, sort]);

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <SortMenu
          options={SORT_OPTIONS}
          value={sort}
          onChange={setSort}
        />
      </View>
      {filterItems && filterItems.length > 0 ? (
        <CategoryFilter
          categories={filterItems}
          selectedIds={selected}
          onChange={(next) => setSelected(next)}
        />
      ) : null}
      {summary ? (
        <Text variant="caption" tone="textMuted" weight="medium">
          {summary}
        </Text>
      ) : null}
      {sorted.length === 0 ? (
        <EmptyState
          icon="line.3.horizontal.decrease.circle"
          title="Nenhuma categoria"
          body="Ajuste os filtros para ver suas categorias."
        />
      ) : (
        <View style={styles.grid}>
          {sorted.map((cat) => (
            <View key={cat.id} style={styles.cell}>
              <CategoryCard
                data={cat}
                currency={currency}
                revenueVisible={revenueVisible}
                onPress={onCardPress}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function budgetRatio(c: CategoryCardData) {
  // No-budget categories sink to the bottom of the "Acima do orçamento" sort.
  if (!c.budget || c.budget === 0) return Number.NEGATIVE_INFINITY;
  return c.total / c.budget;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  controls: { flexDirection: 'row' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  cell: {
    width: '50%',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
});
