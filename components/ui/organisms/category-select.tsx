import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { useModalChrome } from '@/hooks/use-modal-chrome';

export interface CategorySelectProps {
  /** Section caption above the field (e.g. "Where it goes"). Omit to render no caption. */
  title?: string;
  /** Label of the currently selected option, or null when nothing is selected. */
  selectedLabel?: string | null;
  /** Shown when no option is selected (or the hint to show while disabled). */
  placeholder: string;
  onPress: () => void;
  /** Greys the field and blocks tapping (e.g. "What for" before a category is picked). */
  disabled?: boolean;
}

/**
 * Trigger field for a grouped select modal. Tapping it opens the picker where
 * options are shown in groups. Presentational — the modal owns the data and
 * grouping logic. Shared by the transaction form's "Where it goes" (categories)
 * and "What for" (items) fields.
 */
export function CategorySelect({
  title,
  selectedLabel,
  placeholder,
  onPress,
  disabled = false,
}: CategorySelectProps) {
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
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={selectedLabel ?? placeholder}
        style={({ pressed }) => [
          styles.field,
          { backgroundColor: inputBackground },
          disabled && styles.disabled,
          !disabled && pressed && styles.pressed,
        ]}
      >
        <Text
          variant="body"
          numberOfLines={1}
          style={[styles.value, { color: hasValue && !disabled ? text : textMuted }]}
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
  disabled: { opacity: 0.5 },
  value: { flex: 1, minWidth: 0 },
});
