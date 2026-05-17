import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();

  return (
    <NativeTabs tintColor={palette.tint}>
      <NativeTabs.Trigger name="(status)">
        <NativeTabs.Trigger.Label>{t('tabs.balance')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" drawable="ic_menu_sort_by_size" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Label>{t('tabs.transactions')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="arrow.left.arrow.right" drawable="ic_menu_recent_history" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" drawable="ic_menu_manage" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore" hidden />

      <NativeTabs.Trigger name="ui-demo" hidden={!__DEV__}>
        <NativeTabs.Trigger.Label>{t('tabs.uiDemo')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" drawable="ic_menu_view" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
