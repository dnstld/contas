import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { SectionList, SortMenu, Text, Toggle } from '@/components/ui';
import { Avatar } from '@/components/ui/atoms/avatar';
import type { ListCardRowProps } from '@/components/ui/molecules/list-card-row';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/molecules/action-menu';
import { AddWalletCard } from '@/components/settings/add-wallet-card';
import { DangerZone } from '@/components/settings/danger-zone';
import { InvitationSection } from '@/components/settings/invitation-section';
import { useAuth } from '@/hooks/use-auth';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/data/currency';
import { useDemoMode } from '@/hooks/use-demo-mode';
import { useLanguage } from '@/hooks/use-language';
import { useMyProfile } from '@/hooks/use-my-profile';
import { useTransactions } from '@/hooks/use-finance-queries';
import { useWallet } from '@/hooks/use-wallet';
import { useWalletList } from '@/hooks/use-wallet-list';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWalletMembers } from '@/hooks/use-wallet-members';
import { MAX_WALLETS_PER_USER } from '@/constants/limits';
import { ROUTES } from '@/constants/routes';
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
  const router = useRouter();
  const { signOut, session } = useAuth();

  const { displayName: profileName, avatarUrl: profileAvatar } = useMyProfile();
  const avatarUrl = profileAvatar ?? session?.user?.user_metadata?.avatar_url ?? null;
  const displayName = profileName ?? session?.user?.user_metadata?.full_name ?? null;
  const email = session?.user?.email ?? null;
  const currentUserId = session?.user?.id ?? null;

  const { walletId, switchWallet, showRevenue, setShowRevenue } = useWallet();
  const { data: wallets = [] } = useWalletList();
  const { data: transactions = [] } = useTransactions();
  const hasRevenue = transactions.some((t) => t.type === 'income');
  const revenueToggleDisabled = !hasRevenue;

  const { language, setLanguage, supported } = useLanguage();
  const { currency, setCurrency } = useWallet();
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

  const currencyOptions = useMemo(
    () =>
      SUPPORTED_CURRENCIES.map((code) => ({
        value: code,
        label: t(`settings.currencies.${code}`),
      })),
    [t],
  );

  const accountRows: Row[] = [
    {
      id: 'me',
      size: 'md',
      density: 'comfortable',
      leading: <Avatar url={avatarUrl} name={displayName} size={44} />,
      title: displayName ?? email,
      subtitle: displayName && email ? email : null,
      trailing: (
        <ActionMenu
          items={[
            {
              label: t('profile.actions.editName'),
              action: () => router.push(ROUTES.editDisplayName),
              systemImage: 'pencil',
            } satisfies ActionMenuItem,
            {
              label: t('profile.actions.signOut'),
              action: signOut,
              destructive: true,
              systemImage: 'rectangle.portrait.and.arrow.right',
            } satisfies ActionMenuItem,
          ]}
        />
      ),
    },
    ...(partner
      ? [
          {
            id: 'partner',
            size: 'md',
            density: 'comfortable',
            leading: <Avatar url={partner.avatarUrl} name={partner.displayName} size={44} />,
            title: partner.displayName ?? t('wallet.partner.unnamed'),
          } satisfies Row,
        ]
      : []),
  ];

  const walletRows: Row[] = [
    {
      id: 'wallets',
      title: t('settings.walletsRow.title'),
      subtitle: wallets.length > 0 ? wallets.map((w) => w.name).join(', ') : undefined,
      trailing: (
        <ActionMenu
          items={wallets.map<ActionMenuItem>((w) => ({
            label: w.name,
            action: () => {
              if (w.id !== walletId) {
                switchWallet(w.id);
                router.navigate(ROUTES.home);
              }
            },
            systemImage: w.id === walletId ? 'checkmark' : undefined,
          }))}
        />
      ),
    },
  ];

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

  const regionalRows: Row[] = [
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
    {
      id: 'currency',
      title: t('settings.currencyRow.title'),
      trailing: (
        <SortMenu<SupportedCurrency>
          options={currencyOptions}
          value={currency}
          onChange={setCurrency}
        />
      ),
    },
  ];

  const countBadge = (current: number, max: number) => (
    <Text variant="caption" tone="textMuted" weight="medium">
      {current}/{max}
    </Text>
  );

  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.content}>
      <SectionList<Row>
        variant="card"
        scrollEnabled={false}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        sections={[
          {
            id: 'account',
            title: t('settings.sections.account'),
            trailing: countBadge(members.length, MAX_WALLETS_PER_USER),
            data: accountRows,
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
            id: 'wallets',
            title: t('settings.sections.wallets'),
            trailing: countBadge(wallets.length, MAX_WALLETS_PER_USER),
            data: walletRows,
          },
        ]}
      />

      <AddWalletCard />
      {!partner ? <InvitationSection /> : null}

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
            id: 'regional',
            title: t('settings.sections.regional'),
            data: regionalRows,
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
    gap: 24,
  },
});
