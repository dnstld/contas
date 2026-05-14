import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Chip, type ChipVariant } from '@/components/ui/atoms/chip';

export interface ChipGroupItem<T extends string> {
  id: T;
  label: string;
  variant?: ChipVariant;
}

export interface ChipGroupProps<T extends string> {
  items: readonly ChipGroupItem<T>[];
  selectedIds: readonly T[];
  onToggle: (id: T) => void;
  multiSelect?: boolean;
  selectedVariant?: ChipVariant;
  unselectedVariant?: ChipVariant;
  showCheckWhenSelected?: boolean;
  leading?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function ChipGroup<T extends string>({
  items,
  selectedIds,
  onToggle,
  selectedVariant = 'primary',
  unselectedVariant = 'default',
  showCheckWhenSelected = false,
  leading,
  contentStyle,
}: ChipGroupProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, contentStyle]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      {items.map((item) => {
        const selected = selectedIds.includes(item.id);
        return (
          <Chip
            key={item.id}
            label={item.label}
            selected={selected}
            variant={selected ? (item.variant ?? selectedVariant) : unselectedVariant}
            showCheckWhenSelected={showCheckWhenSelected}
            onPress={() => onToggle(item.id)}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  leading: {
    marginRight: 4,
  },
});
