import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';

type Props = {
  onReset: () => void;
};

export function ErrorFallback({ onReset }: Props) {
  const { t } = useTranslation();
  const background = useThemeColor({}, 'background');
  const tint = useThemeColor({}, 'tint');
  const onPrimary = useThemeColor({}, 'onPrimary');

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Text variant="title" weight="semibold" style={styles.center}>
        {t('errorFallback.title')}
      </Text>
      <Text variant="body" tone="textMuted" style={styles.center}>
        {t('errorFallback.body')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('errorFallback.retry')}
        onPress={onReset}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: tint, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <Text variant="body" weight="semibold" style={{ color: onPrimary }}>
          {t('errorFallback.retry')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  center: {
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
});
