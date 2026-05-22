import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';

type Props = {
  onReset: () => void;
};

export function ErrorFallback({ onReset }: Props) {
  const { t } = useTranslation();
  const background = useThemeColor({}, 'background');

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Text variant="title" weight="semibold" style={styles.center}>
        {t('errorFallback.title')}
      </Text>
      <Text variant="body" tone="textMuted" style={styles.center}>
        {t('errorFallback.body')}
      </Text>
      <PressableButton
        variant="primary"
        label={t('errorFallback.retry')}
        onPress={onReset}
        style={styles.button}
      />
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
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
});
