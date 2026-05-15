import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function TransactionsScreen() {
  const background = useThemeColor({}, 'background');
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Text variant="title" weight="semibold">
        {t('transactions.title')}
      </Text>
      <Text variant="body" tone="textMuted">
        {t('transactions.comingSoon')}
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
