import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AddSquareCard, SquareCard, Text } from '@/components/ui';
import { MAX_WALLETS_PER_USER } from '@/constants/limits';
import { ROUTES, walletsHref } from '@/constants/routes';
import { useWallet } from '@/hooks/use-wallet';
import { useWalletList } from '@/hooks/use-wallet-list';

export function WalletCards() {
  const { t } = useTranslation();
  const router = useRouter();
  const { walletId, switchWallet } = useWallet();
  const { data: wallets = [] } = useWalletList();

  const atLimit = wallets.length >= MAX_WALLETS_PER_USER;

  const memberLabel = (count: number) =>
    count === 1 ? t('wallets.membersOne') : t('wallets.membersMany', { count });

  function goCreate() {
    router.push(walletsHref());
  }

  function goRedeem() {
    router.push(ROUTES.redeemCode);
  }

  function openAddChooser() {
    const create = t('wallets.addCard.createButton');
    const redeem = t('wallets.addCard.redeemButton');

    if (Platform.OS === 'ios') {
      const cancel = t('common.cancel');
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [create, redeem, cancel], cancelButtonIndex: 2 },
        (index) => {
          if (index === 0) goCreate();
          else if (index === 1) goRedeem();
        },
      );
      return;
    }

    Alert.alert(t('settings.walletCards.add'), undefined, [
      { text: create, onPress: goCreate },
      { text: redeem, onPress: goRedeem },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text variant="caption" weight="semibold" tone="textMuted" style={styles.label}>
          {t('settings.sections.wallets').toUpperCase()}
        </Text>
        <Text variant="caption" weight="medium" tone="textMuted">
          {wallets.length}/{MAX_WALLETS_PER_USER}
        </Text>
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
              onPress={
                active
                  ? undefined
                  : () => {
                      switchWallet(w.id);
                      router.navigate(ROUTES.home);
                    }
              }
            />
          );
        })}

        <AddSquareCard
          label={t('settings.walletCards.add')}
          onPress={atLimit ? undefined : openAddChooser}
          locked={atLimit}
          lockedLabel={t('wallets.freeTierLimit', { count: MAX_WALLETS_PER_USER })}
        />
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
