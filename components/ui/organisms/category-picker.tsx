import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/atoms/chip';
import { Icon } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { ChipGroup, type ChipGroupItem } from '@/components/ui/molecules/chip-group';

export type CategoryPickerItem = ChipGroupItem<string>;

export type CategoryPickerMode = 'single' | 'multi';

const ALL_ID = '__all__';

export interface CategoryPickerProps {
  mode: CategoryPickerMode;
  /** Section header above the chips (e.g. "Where it goes"). Omit to render no title. */
  title?: string;
  categories: readonly CategoryPickerItem[];
  selectedIds: readonly string[];
  onChange: (next: string[]) => void;
  onCreate?: () => void;
  /** Overrides the create-chip label (defaults to the generic "+ Add"). */
  createLabel?: string;
  /** Long-press handler. When provided, a "press and hold to edit" hint is shown. */
  onEdit?: (id: string) => void;
}

export function CategoryPicker({
  mode,
  title,
  categories,
  selectedIds,
  onChange,
  onCreate,
  createLabel,
  onEdit,
}: CategoryPickerProps) {
  const { t } = useTranslation();

  const items = useMemo<readonly CategoryPickerItem[]>(
    () =>
      mode === 'multi'
        ? [{ id: ALL_ID, label: t('category.filter.all') }, ...categories]
        : categories,
    [categories, mode, t],
  );

  const effectiveSelected =
    mode === 'multi' && selectedIds.length === 0 ? [ALL_ID] : selectedIds;

  const handleToggle = (id: string) => {
    if (mode === 'multi') {
      if (id === ALL_ID) {
        onChange([]);
        return;
      }
      const exists = selectedIds.includes(id);
      onChange(exists ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
      return;
    }
    // single
    onChange(selectedIds[0] === id ? [] : [id]);
  };

  const handleLongPress = onEdit
    ? (id: string) => {
        if (id === ALL_ID) return;
        onEdit(id);
      }
    : undefined;

  const showHint = !!onEdit && categories.length > 0;

  const trailing =
    onCreate || showHint ? (
      <View style={styles.trailing}>
        {onCreate ? (
          <Chip
            label={createLabel ?? t('category.create.chipLabel')}
            variant="default"
            onPress={onCreate}
          />
        ) : null}
        {showHint ? (
          <View style={styles.hint}>
            <Icon name="hand.tap" size={14} tone="textMuted" />
            <Text variant="caption" tone="textMuted" numberOfLines={1}>
              {t('category.pressAndHoldHint')}
            </Text>
          </View>
        ) : null}
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      {title ? (
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <ChipGroup
        items={items}
        selectedIds={effectiveSelected}
        multiSelect={mode === 'multi'}
        selectedVariant="primary"
        unselectedVariant="default"
        showCheckWhenSelected={mode === 'single'}
        onToggle={handleToggle}
        onLongPress={handleLongPress}
        trailing={trailing}
        contentStyle={styles.chipRow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { letterSpacing: 0.8 },
  chipRow: { paddingHorizontal: 0 },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
