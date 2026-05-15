import { Button as SwiftUIButton, Host } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  fixedSize,
  foregroundStyle,
  labelStyle,
  tint as tintMod,
} from '@expo/ui/swift-ui/modifiers';
import { Stack, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function HeaderLogo() {
  return (
    <Text variant="subtitle" weight="bold" style={{ letterSpacing: 1.5 }}>
      CONTAS
    </Text>
  );
}

function HeaderCreateButton({ onPress }: { onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const tintColor = Colors[scheme].positive;

  if (Platform.OS === 'ios') {
    return (
      <Host matchContents>
        <SwiftUIButton
          label="Adicionar"
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
      <Icon name="plus" size={16} color="#fff" />
      <Text variant="body" weight="semibold" style={{ color: '#fff' }}>
        Adicionar
      </Text>
    </Pressable>
  );
}

export default function HomeLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerLeft: () => <HeaderLogo />,
        headerRight: () => (
          <HeaderCreateButton onPress={() => router.push('/modal')} />
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
