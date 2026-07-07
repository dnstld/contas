import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CategoryPicker, type CategoryPickerItem } from '@/components/ui/organisms/category-picker';
import { SortMenu, type SortOption } from '@/components/ui/molecules/sort-menu';
import type { CategorySortMode } from '@/hooks/use-category-grid';

export interface CategoryGridControlsProps {
  sortOptions: readonly SortOption<CategorySortMode>[];
  sort: CategorySortMode;
  onSortChange: (next: CategorySortMode) => void;
  filterItems?: readonly CategoryPickerItem[];
  selectedIds: readonly string[];
  onSelectedChange: (next: readonly string[]) => void;
  onCreateCategory?: () => void;
  onEditCategory?: (id: string) => void;
  /** Overrides the picker section title (defaults to "Where it goes"). */
  title?: string;
  /** Overrides the create-chip label (defaults to "+ Add"). */
  createLabel?: string;
  /** Forces the sort menu's visibility (defaults to: shown when categories exist). */
  showSort?: boolean;
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
  onEditCategory,
  title,
  createLabel,
  showSort,
  summary,
}: CategoryGridControlsProps) {
  const { t } = useTranslation();
  const hasCategories = !!filterItems && filterItems.length > 0;
  const sortVisible = showSort ?? hasCategories;
  return (
    <View style={styles.container}>
      {hasCategories || onCreateCategory ? (
        <CategoryPicker
          mode="multi"
          title={title ?? t('category.section.expenses')}
          categories={filterItems ?? []}
          selectedIds={selectedIds}
          onChange={onSelectedChange}
          onCreate={onCreateCategory}
          createLabel={createLabel}
          onEdit={onEditCategory}
          summaryLabel={summary}
        />
      ) : null}
      {sortVisible ? (
        <View style={styles.controls}>
          <SortMenu
            label={t('category.sort.label')}
            options={sortOptions}
            value={sort}
            onChange={onSortChange}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  controls: { flexDirection: 'row' },
});
