import { Host, Button as SwiftUIButton } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  fixedSize,
  foregroundStyle,
  labelStyle,
  tint as tintMod,
} from '@expo/ui/swift-ui/modifiers';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { ROUTES } from '@/constants/routes';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

function HeaderLogo() {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
      }}
    >
      <Text variant="subtitle" weight="bold" style={{ letterSpacing: 1.5 }}>
        {t('common.appName')}
      </Text>
    </View>
  );
}

function HeaderCreateButton({ onPress }: { onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const tintColor = Colors[scheme].tint;
  const onPrimary = useThemeColor({}, 'onPrimary');
  const { t } = useTranslation();
  const label = t('common.add');

  if (Platform.OS === 'ios') {
    return (
      <Host matchContents>
        <SwiftUIButton
          label={label}
          systemImage="plus"
          onPress={onPress}
          modifiers={[
            buttonStyle('glassProminent'),
            controlSize('regular'),
            tintMod(tintColor),
            foregroundStyle('white'),
            labelStyle('titleAndIcon'),
            fixedSize(),
          ]}
        />
      </Host>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.androidButton,
        { backgroundColor: tintColor, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name="plus" size={16} color={onPrimary} />
      <Text variant="body" weight="semibold" style={{ color: onPrimary }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AppStackLayout() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const backgroundColor = Colors[scheme].background;

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerStyle: { backgroundColor },
        headerTitle: '',
        headerLeft: () => <HeaderLogo />,
        headerShadowVisible: false,
        headerRight: () => (
          <HeaderCreateButton onPress={() => router.push(ROUTES.createTransaction)} />
        ),
      }}
    />
  );
}

const styles = StyleSheet.create({
  androidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
});
