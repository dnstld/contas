import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { useModalChrome } from '@/hooks/use-modal-chrome';

export interface CategorySelectProps {
  /** Section caption above the field (e.g. "Where it goes"). Omit to render no caption. */
  title?: string;
  /** Label of the currently selected option, or null when nothing is selected. */
  selectedLabel?: string | null;
  /** Shown when no option is selected. */
  placeholder: string;
  onPress: () => void;
}

/**
 * Trigger field for the grouped category picker. Tapping it opens the
 * `category-select` modal where options are shown in groups. Presentational —
 * the modal owns the data and grouping logic.
 */
export function CategorySelect({ title, selectedLabel, placeholder, onPress }: CategorySelectProps) {
  const { text, textMuted, inputBackground } = useModalChrome();
  const hasValue = !!selectedLabel;

  return (
    <View style={styles.container}>
      {title ? (
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={selectedLabel ?? placeholder}
        style={({ pressed }) => [
          styles.field,
          { backgroundColor: inputBackground },
          pressed && styles.pressed,
        ]}
      >
        <Text
          variant="body"
          numberOfLines={1}
          style={[styles.value, { color: hasValue ? text : textMuted }]}
        >
          {hasValue ? selectedLabel : placeholder}
        </Text>
        <Icon name="chevron.down" size={16} tone="textMuted" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { letterSpacing: 0.8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  pressed: { opacity: 0.6 },
  value: { flex: 1, minWidth: 0 },
});
