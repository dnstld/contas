import { ChipGroup, type ChipGroupItem } from '@/components/ui/molecules/chip-group';

export type CategoryFilterItem = ChipGroupItem<string>;

export interface CategoryFilterProps {
  categories: readonly CategoryFilterItem[];
  selectedIds: readonly string[];
  onChange: (next: string[]) => void;
}

export function CategoryFilter({ categories, selectedIds, onChange }: CategoryFilterProps) {
  return (
    <ChipGroup
      items={categories}
      selectedIds={selectedIds}
      multiSelect
      selectedVariant="primary"
      unselectedVariant="default"
      onToggle={(id) => {
        const exists = selectedIds.includes(id);
        const next = exists ? selectedIds.filter((s) => s !== id) : [...selectedIds, id];
        onChange(next);
      }}
    />
  );
}
