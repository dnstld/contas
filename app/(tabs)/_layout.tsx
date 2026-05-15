import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];

  return (
    <NativeTabs
      tintColor={palette.tint}
      minimizeBehavior="never"
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" drawable="ic_menu_home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore" hidden />

      <NativeTabs.Trigger name="ui-demo" hidden={!__DEV__}>
        <NativeTabs.Trigger.Label>UI Demo</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" drawable="ic_menu_view" />
      </NativeTabs.Trigger>

      <NativeTabs.BottomAccessory>
        <View style={{ width: 1, height: 1, opacity: 0 }} />
      </NativeTabs.BottomAccessory>
    </NativeTabs>
  );
}
