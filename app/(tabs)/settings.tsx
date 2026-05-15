import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SettingsScreen() {
  const background = useThemeColor({}, 'background');

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Text variant="title" weight="semibold">
        Ajustes
      </Text>
      <Text variant="body" tone="textMuted">
        Em breve
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
