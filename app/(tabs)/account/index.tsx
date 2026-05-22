import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Divider,
  SettingsRow,
  SettingsSection,
  SortMenu,
  Surface,
  Text,
  Toggle,
} from '@/components/ui';
import { SectionHeader } from '@/components/ui/molecules/section-header';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/molecules/action-menu';
import { AddWalletCard } from '@/components/settings/add-wallet-card';
import { DangerZone } from '@/components/settings/danger-zone';
import { InvitationSection } from '@/components/settings/invitation-section';
import { useAuth } from '@/hooks/use-auth';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/data/currency';
import { useDemoMode } from '@/hooks/use-demo-mode';
import { useLanguage } from '@/hooks/use-language';
import { useMyProfile } from '@/hooks/use-my-profile';
import { useRevenueVisible } from '@/hooks/use-revenue-visible';
import { useWallet } from '@/hooks/use-wallet';
import { useWalletList } from '@/hooks/use-wallet-list';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWalletMembers } from '@/hooks/use-wallet-members';
import { MAX_WALLETS_PER_USER } from '@/constants/limits';
import { ROUTES } from '@/constants/routes';
import { type SupportedLanguage } from '@/i18n';

function userInitials(name: string | null): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

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

  const { walletId, switchWallet } = useWallet();
  const { data: wallets = [] } = useWalletList();

  const { language, setLanguage, supported } = useLanguage();
  const { currency, setCurrency } = useWallet();
  const [revenueVisible, setRevenueVisible] = useRevenueVisible();
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

  return (
    <>
      <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.content}>
        <View style={styles.accountSection}>
          <SectionHeader
            title={t('settings.sections.account')}
            trailing={
              <Text variant="caption" tone="textMuted" weight="medium">
                {members.length}/{MAX_WALLETS_PER_USER}
              </Text>
            }
          />
          <Surface padding={0} radius={16} bordered>
            <View style={styles.profileRow}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Surface
                  variant="elevated"
                  padding={0}
                  radius={22}
                  style={[styles.avatar, styles.avatarFallback]}
                >
                  <Text variant="subtitle" weight="semibold">
                    {userInitials(displayName)}
                  </Text>
                </Surface>
              )}
              <View style={styles.profileText}>
                <Text variant="subtitle" weight="semibold" numberOfLines={1}>
                  {displayName ?? email}
                </Text>
                {displayName && email ? (
                  <Text variant="caption" tone="textMuted" numberOfLines={1}>
                    {email}
                  </Text>
                ) : null}
              </View>
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
            </View>

            {partner ? (
              <>
                <Divider inset={16} />
                <View style={styles.profileRow}>
                  {partner.avatarUrl ? (
                    <Image source={{ uri: partner.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <Surface
                      variant="elevated"
                      padding={0}
                      radius={22}
                      style={[styles.avatar, styles.avatarFallback]}
                    >
                      <Text variant="subtitle" weight="semibold">
                        {userInitials(partner.displayName)}
                      </Text>
                    </Surface>
                  )}
                  <View style={styles.profileText}>
                    <Text variant="subtitle" weight="semibold" numberOfLines={1}>
                      {partner.displayName ?? t('wallet.partner.unnamed')}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </Surface>
        </View>

        <View style={styles.accountSection}>
          <SectionHeader
            title={t('settings.sections.wallets')}
            trailing={
              <Text variant="caption" tone="textMuted" weight="medium">
                {wallets.length}/{MAX_WALLETS_PER_USER}
              </Text>
            }
          />
          <Surface padding={0} bordered>
            <SettingsRow
              title={t('settings.walletsRow.title')}
              description={wallets.length > 0 ? wallets.map((w) => w.name).join(', ') : undefined}
              trailing={
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
              }
            />
          </Surface>
          <AddWalletCard />
          {!partner ? <InvitationSection /> : null}
        </View>

        <SettingsSection title={t('settings.sections.display')}>
          <SettingsRow
            title={t('settings.revenueVisible.title')}
            description={t('settings.revenueVisible.description')}
            trailing={<Toggle value={revenueVisible} onValueChange={setRevenueVisible} />}
          />
          <SettingsRow
            title={t('settings.demoMode.title')}
            description={t('settings.demoMode.description')}
            trailing={<Toggle value={demoMode} onValueChange={setDemoMode} />}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.regional')}>
          <SettingsRow
            title={t('settings.languageRow.title')}
            trailing={
              <SortMenu<SupportedLanguage>
                options={languageOptions}
                value={language}
                onChange={setLanguage}
              />
            }
          />
          <SettingsRow
            title={t('settings.currencyRow.title')}
            trailing={
              <SortMenu<SupportedCurrency>
                options={currencyOptions}
                value={currency}
                onChange={setCurrency}
              />
            }
          />
        </SettingsSection>

        <DangerZone
          currentUserId={currentUserId ?? ''}
          partnerName={partner?.displayName ?? null}
          hasParter={!!partner}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 64,
    gap: 24,
  },
  accountSection: {
    gap: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
});
