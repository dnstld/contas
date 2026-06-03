import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { CategoryFilter, type CategoryFilterItem } from '@/components/ui/organisms/category-filter';
import { SortMenu, type SortOption } from '@/components/ui/molecules/sort-menu';
import type { CategorySortMode } from '@/hooks/use-category-grid';

export interface CategoryGridControlsProps {
  sortOptions: readonly SortOption<CategorySortMode>[];
  sort: CategorySortMode;
  onSortChange: (next: CategorySortMode) => void;
  filterItems?: readonly CategoryFilterItem[];
  selectedIds: readonly string[];
  onSelectedChange: (next: readonly string[]) => void;
  onCreateCategory?: () => void;
  summary: string | null;
}

/**
 * Header chrome for the category grid: sort menu, filter chips, summary line.
 * Designed to be slotted into a list's `ListHeaderComponent`; the cards
 * themselves are rendered by the parent list so virtualization works.
 */
export function CategoryGridControls({
  sortOptions,
  sort,
  onSortChange,
  filterItems,
  selectedIds,
  onSelectedChange,
  onCreateCategory,
  summary,
}: CategoryGridControlsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {(filterItems && filterItems.length > 0) || onCreateCategory ? (
        <CategoryFilter
          categories={filterItems ?? []}
          selectedIds={selectedIds}
          onChange={onSelectedChange}
          onCreate={onCreateCategory}
        />
      ) : null}
      <View style={styles.controls}>
        <SortMenu
          label={t('category.sort.label')}
          options={sortOptions}
          value={sort}
          onChange={onSortChange}
        />
      </View>
      {summary ? (
        <Text variant="caption" tone="textMuted" weight="medium">
          {summary}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  controls: { flexDirection: 'row' },
});
