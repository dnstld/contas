import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/atoms/text';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, subtitle, trailing, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.text}>
        <Text variant="title" weight="bold">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="textMuted">{subtitle}</Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
