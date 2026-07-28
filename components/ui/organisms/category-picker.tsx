import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/atoms/badge';
import { Chip } from '@/components/ui/atoms/chip';
import { Icon } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { ChipGroup, type ChipGroupItem } from '@/components/ui/molecules/chip-group';
import { SectionLabel } from '@/components/ui/molecules/section-label';

export type CategoryPickerItem = ChipGroupItem<string>;

export type CategoryPickerMode = 'single' | 'multi';

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
  /**
   * Compact summary of the current selection (e.g. "2 selected · R$X in July"),
   * shown as a pill beside the title. Only rendered in multi mode.
   */
  summaryLabel?: string | null;
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
  summaryLabel,
}: CategoryPickerProps) {
  const { t } = useTranslation();

  const handleToggle = (id: string) => {
    if (mode === 'multi') {
      const exists = selectedIds.includes(id);
      onChange(exists ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
      return;
    }
    // single
    onChange(selectedIds[0] === id ? [] : [id]);
  };

  const showHint = !!onEdit && categories.length > 0;

  // With exactly one category there's nothing to filter between it and
  // "everything" — the sole chip renders as always-selected.
  const forceSingleSelected = mode === 'multi' && categories.length === 1;
  const chipSelectedIds = forceSingleSelected ? categories.map((c) => c.id) : selectedIds;

  // Clearing is offered in multi mode whenever a real (non-forced) selection is
  // active. It replaces the old leading "All" chip, and stays visible in the
  // header regardless of how far the chip row is scrolled.
  const showClear = mode === 'multi' && !forceSingleSelected && selectedIds.length > 0;

  const trailing =
    onCreate || showHint ? (
      <View style={styles.trailing}>
        {onCreate ? (
          <Chip
            label={createLabel ?? t('category.create.chipLabel')}
            variant="primary"
            accent
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
      {title || summaryLabel || showClear ? (
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            {title ? <SectionLabel label={title} /> : null}
            {mode === 'multi' && summaryLabel ? (
              <Badge label={summaryLabel} tone="tint" variant="soft" />
            ) : null}
          </View>
          {showClear ? (
            <Pressable
              onPress={() => onChange([])}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('category.clear')}
              style={styles.clear}
            >
              <Text variant="caption" tone="textMuted" weight="medium">
                {`${t('category.clear')} (${selectedIds.length})`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <ChipGroup
        items={categories}
        selectedIds={chipSelectedIds}
        multiSelect={mode === 'multi'}
        selectedVariant="primary"
        unselectedVariant="default"
        showCheckWhenSelected
        onToggle={handleToggle}
        onLongPress={onEdit}
        trailing={trailing}
        contentStyle={styles.chipRow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
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
