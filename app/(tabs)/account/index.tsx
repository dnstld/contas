import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { SectionList, SortMenu, Toggle } from '@/components/ui';
import type { ListCardRowProps } from '@/components/ui/molecules/list-card-row';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import { AccountCards } from '@/components/settings/account-cards';
import { DangerZone } from '@/components/settings/danger-zone';
import { useAuth } from '@/hooks/use-auth';
import { useDemoMode } from '@/hooks/use-demo-mode';
import { useLanguage } from '@/hooks/use-language';
import { useTransactions } from '@/hooks/use-finance-queries';
import { useWallet } from '@/hooks/use-wallet';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWalletMembers } from '@/hooks/use-wallet-members';
import { type SupportedLanguage } from '@/i18n';

type Row = ListCardRowProps & { id: string };

const ROW_DEFAULTS: Pick<ListCardRowProps, 'size' | 'density'> = {
  size: 'sm',
  density: 'comfortable',
};

const renderRow = ({ item }: { item: Row }) => {
  const { id: _id, ...props } = item;
  return <SectionListRow {...ROW_DEFAULTS} {...props} />;
};

const keyExtractor = (item: Row) => item.id;

export default function SettingsScreen() {
  const background = useThemeColor({}, 'background');
  const { t } = useTranslation();
  const { session } = useAuth();

  const currentUserId = session?.user?.id ?? null;

  const { showRevenue, setShowRevenue } = useWallet();
  const { data: transactions = [] } = useTransactions();
  const hasRevenue = transactions.some((t) => t.type === 'income');
  const revenueToggleDisabled = !hasRevenue;

  const { language, setLanguage, supported } = useLanguage();
  const { enabled: demoMode, set: setDemoMode } = useDemoMode();

  const { members, refetch: refetchMembers } = useWalletMembers();

  useFocusEffect(
    useCallback(() => {
      refetchMembers();
    }, [refetchMembers]),
  );

  const partner = members.find((m) => m.userId !== currentUserId) ?? null;

  const languageOptions = useMemo(
    () =>
      supported.map((code) => ({
        value: code,
        label: t(`settings.languages.${code}`),
      })),
    [supported, t],
  );

  const displayRows: Row[] = [
    {
      id: 'revenueVisible',
      title: t('settings.revenueVisible.title'),
      subtitle: t(
        revenueToggleDisabled
          ? 'settings.revenueVisible.descriptionDisabled'
          : 'settings.revenueVisible.description',
      ),
      trailing: (
        <Toggle
          value={showRevenue ?? false}
          onValueChange={(next) => {
            void setShowRevenue(next);
          }}
          disabled={revenueToggleDisabled}
        />
      ),
    },
    {
      id: 'demoMode',
      title: t('settings.demoMode.title'),
      subtitle: t('settings.demoMode.description'),
      trailing: <Toggle value={demoMode} onValueChange={setDemoMode} />,
    },
  ];

  const languageRows: Row[] = [
    {
      id: 'language',
      title: t('settings.languageRow.title'),
      trailing: (
        <SortMenu<SupportedLanguage>
          options={languageOptions}
          value={language}
          onChange={setLanguage}
        />
      ),
    },
  ];

  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.content}>
      <AccountCards />

      <SectionList<Row>
        variant="card"
        scrollEnabled={false}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        sections={[
          {
            id: 'display',
            title: t('settings.sections.display'),
            data: displayRows,
          },
        ]}
      />

      <SectionList<Row>
        variant="card"
        scrollEnabled={false}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        sections={[
          {
            id: 'language',
            title: t('settings.sections.regional'),
            data: languageRows,
          },
        ]}
      />

      <DangerZone
        currentUserId={currentUserId ?? ''}
        partnerName={partner?.displayName ?? null}
        hasParter={!!partner}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 64,
    gap: 16,
  },
});
