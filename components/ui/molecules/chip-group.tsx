import { type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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
  onLongPress?: (id: T) => void;
  multiSelect?: boolean;
  selectedVariant?: ChipVariant;
  unselectedVariant?: ChipVariant;
  showCheckWhenSelected?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function ChipGroup<T extends string>({
  items,
  selectedIds,
  onToggle,
  onLongPress,
  selectedVariant = 'primary',
  unselectedVariant = 'default',
  showCheckWhenSelected = false,
  leading,
  trailing,
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
        const chip = (
          <Chip
            label={item.label}
            selected={selected}
            variant={selected ? (item.variant ?? selectedVariant) : unselectedVariant}
            showCheckWhenSelected={showCheckWhenSelected}
            onPress={() => onToggle(item.id)}
          />
        );
        if (onLongPress) {
          // Overlay a transparent Pressable on top of the native Chip so that
          // UIKit/Android hit-testing reaches the RN layer instead of being
          // consumed by SwiftUI.Host / Compose.Host.
          return (
            <View key={item.id} style={styles.chipWrap}>
              {chip}
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => onToggle(item.id)}
                onLongPress={() => onLongPress(item.id)}
                delayLongPress={500}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected }}
              />
            </View>
          );
        }
        return <View key={item.id}>{chip}</View>;
      })}
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
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
  chipWrap: {
    position: 'relative',
  },
  leading: {
    marginRight: 4,
  },
  trailing: {
    marginLeft: 4,
  },
});
