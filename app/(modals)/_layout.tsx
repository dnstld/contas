import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { useThemeColor } from '@/hooks/use-theme-color';

function ModalCloseButton() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.dismissAll()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t('common.close')}
    >
      {({ pressed }) => <Icon name="xmark" size={18} style={{ opacity: pressed ? 0.6 : 1 }} />}
    </Pressable>
  );
}

export default function ModalsLayout() {
  const headerBackground = useThemeColor({}, 'modalBackground');

  return (
    <Stack
      screenOptions={{
        headerTitle: '',
        headerTitleAlign: 'center',
        headerBackTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: headerBackground },
        headerRight: () => <ModalCloseButton />,
      }}
    >
      <Stack.Screen name="create" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="category-form" />
      <Stack.Screen name="edit-display-name" />
      <Stack.Screen name="redeem-code" />
      <Stack.Screen name="wallets" />
    </Stack>
  );
}
