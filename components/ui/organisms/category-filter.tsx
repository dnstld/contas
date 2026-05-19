import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ChipGroup, type ChipGroupItem } from '@/components/ui/molecules/chip-group';

export type CategoryFilterItem = ChipGroupItem<string>;

const ALL_ID = '__all__';

export interface CategoryFilterProps {
  categories: readonly CategoryFilterItem[];
  selectedIds: readonly string[];
  onChange: (next: string[]) => void;
}

export function CategoryFilter({ categories, selectedIds, onChange }: CategoryFilterProps) {
  const { t } = useTranslation();

  const items = useMemo<readonly CategoryFilterItem[]>(
    () => [{ id: ALL_ID, label: t('category.filter.all') }, ...categories],
    [categories, t],
  );

  const effectiveSelected = selectedIds.length === 0 ? [ALL_ID] : selectedIds;

  return (
    <ChipGroup
      items={items}
      selectedIds={effectiveSelected}
      multiSelect
      selectedVariant="primary"
      unselectedVariant="default"
      onToggle={(id) => {
        if (id === ALL_ID) {
          onChange([]);
          return;
        }
        const exists = selectedIds.includes(id);
        const next = exists ? selectedIds.filter((s) => s !== id) : [...selectedIds, id];
        onChange(next);
      }}
    />
  );
}
