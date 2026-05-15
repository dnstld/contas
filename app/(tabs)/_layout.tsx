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
      <NativeTabs.Trigger name="(balanco)">
        <NativeTabs.Trigger.Label>Balanço</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" drawable="ic_menu_home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Label>Transações</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="arrow.left.arrow.right"
          drawable="ic_menu_recent_history"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="gearshape.fill"
          drawable="ic_menu_preferences"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore" hidden />

      <NativeTabs.Trigger name="ui-demo" hidden={!__DEV__}>
        <NativeTabs.Trigger.Label>UI Demo</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" drawable="ic_menu_view" />
      </NativeTabs.Trigger>

      {/* iOS 26 renders the tab bar as a Liquid Glass floating pill only when a
          BottomAccessory is present. Empty content keeps the glass without
          showing a real accessory bar. */}
      <NativeTabs.BottomAccessory>
        <View style={{ width: 1, height: 1, opacity: 0 }} />
      </NativeTabs.BottomAccessory>
    </NativeTabs>
  );
}
