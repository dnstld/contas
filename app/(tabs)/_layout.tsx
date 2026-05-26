import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { useThemeColor } from '@/hooks/use-theme-color';

export default function TabLayout() {
  const { t } = useTranslation();
  const tabColor = useThemeColor({}, 'text');

  return (
    <NativeTabs
      tintColor={tabColor}
      iconColor={{ default: tabColor, selected: tabColor }}
      labelStyle={{
        default: { color: tabColor },
        selected: { color: tabColor },
      }}
    >
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
    </NativeTabs>
  );
}
