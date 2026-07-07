import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/atoms/chip';

export interface QuickPickItem {
  /** Stable React key + identity for the item. */
  key: string;
  label: string;
  /** Highlights the chip as the active choice. */
  selected?: boolean;
  onPress: () => void;
}

export interface QuickPickChipsProps {
  items: readonly QuickPickItem[];
  /**
   * Optional accent chip pinned after the items (e.g. "All categories" /
   * "+ Add") — an action rather than a selectable value.
   */
  trailing?: { label: string; onPress: () => void };
}

/**
 * A wrapping row of quick-select chips. Presentational and value-agnostic:
 * callers map their own data (categories, past descriptions, …) to
 * {@link QuickPickItem}s. Shared by every quick-pick surface in the transaction
 * form so spacing and selected styling stay identical. Unlike `ChipGroup`, the
 * row wraps onto multiple lines rather than scrolling horizontally.
 */
export function QuickPickChips({ items, trailing }: QuickPickChipsProps) {
  return (
    <View style={styles.chipRow}>
      {items.map((item) => (
        <Chip
          key={item.key}
          label={item.label}
          variant={item.selected ? 'secondary' : 'default'}
          selected={item.selected}
          onPress={item.onPress}
        />
      ))}
      {trailing ? (
        <Chip label={trailing.label} variant="primary" accent onPress={trailing.onPress} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 6,
    rowGap: 0,
  },
});
