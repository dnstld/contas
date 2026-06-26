import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AddSquareCard, Skeleton, SquareCard, SquareCardSkeleton, Text } from '@/components/ui';
import { ROUTES, editWalletNameHref, walletsHref } from '@/constants/routes';
import { useFreeTierLimits } from '@/hooks/use-free-tier-limits';
import { useWallet } from '@/hooks/use-wallet';
import { useWalletList } from '@/hooks/use-wallet-list';

export function WalletCards() {
  const { t } = useTranslation();
  const router = useRouter();
  const { walletId, switchWallet } = useWallet();
  const { data: wallets = [] } = useWalletList();
  const limits = useFreeTierLimits();
  const maxWallets = limits?.maxWalletsPerUser;

  const atLimit = maxWallets != null && wallets.length >= maxWallets;

  const memberLabel = (count: number) =>
    count === 1 ? t('wallets.membersOne') : t('wallets.membersMany', { count });

  function goCreate() {
    router.push(walletsHref());
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text variant="caption" weight="semibold" tone="textMuted" style={styles.label}>
          {t('settings.sections.wallets').toUpperCase()}
        </Text>
        {maxWallets != null ? (
          <Text variant="caption" weight="medium" tone="textMuted">
            {wallets.length}/{maxWallets}
          </Text>
        ) : (
          <Skeleton width={28} height={14} />
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {wallets.map((w) => {
          const active = w.id === walletId;
          return (
            <SquareCard
              key={w.id}
              name={w.name}
              avatarName={w.name}
              subtitle={`${w.currency} · ${memberLabel(w.memberCount)}`}
              active={active}
              badge={active ? 'edit' : undefined}
              onPress={
                active
                  ? () => router.push(editWalletNameHref(w.id))
                  : () => {
                      switchWallet(w.id);
                      router.navigate(ROUTES.home);
                    }
              }
            />
          );
        })}

        {maxWallets == null ? (
          <SquareCardSkeleton />
        ) : (
          <AddSquareCard
            label={t('settings.walletCards.add')}
            onPress={atLimit ? undefined : goCreate}
            locked={atLimit}
            lockedLabel={t('wallets.freeTierLimit', { count: maxWallets })}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  label: {
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
