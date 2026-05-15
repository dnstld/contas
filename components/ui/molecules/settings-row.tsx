import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/atoms/text';

export interface SettingsRowProps {
  title: string;
  description?: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SettingsRow({
  title,
  description,
  trailing,
  style,
}: SettingsRowProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.text}>
        <Text variant="body" weight="medium">
          {title}
        </Text>
        {description ? (
          <Text variant="caption" tone="textMuted">
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    flexShrink: 0,
  },
});
