import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { ROUTES } from '@/constants/routes';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const background = useThemeColor({}, 'background');
  const tint = useThemeColor({}, 'tint');

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View style={[styles.container, { backgroundColor: background }]}>
        <Text variant="title" weight="semibold" heading style={styles.center}>
          {t('notFound.title')}
        </Text>
        <Text variant="body" tone="textMuted" style={styles.center}>
          {t('notFound.body')}
        </Text>
        <Link href={ROUTES.home} style={styles.link}>
          <Text variant="body" weight="semibold" style={{ color: tint }}>
            {t('notFound.home')}
          </Text>
        </Link>
      </View>
    </>
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
  link: {
    marginTop: 8,
  },
});
