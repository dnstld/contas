import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import type { Colors } from '@/constants/theme';

export interface SectionLabelProps {
  /** Raw, already-translated label. The component owns the uppercasing. */
  label: string;
  /** Color token for the label. Defaults to the muted section-header tone. */
  tone?: keyof typeof Colors.light;
  style?: StyleProp<ViewStyle>;
}

/**
 * The shared section header used above content groups (category chips, the
 * Upcoming card, …): an uppercased, muted caption. One component so every
 * section label reads identically.
 */
export function SectionLabel({ label, tone = 'textMuted', style }: SectionLabelProps) {
  return (
    <Text
      variant="caption"
      tone={tone}
      weight="medium"
      style={[styles.label, style as StyleProp<TextStyle>]}
    >
      {label.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: { letterSpacing: 0.8 },
});
