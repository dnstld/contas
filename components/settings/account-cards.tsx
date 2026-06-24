import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AddSquareCard, SquareCard, Text } from '@/components/ui';
import { InvitationSection } from '@/components/settings/invitation-section';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/use-auth';
import { useTransactions } from '@/hooks/use-finance-queries';
import { useMyProfile } from '@/hooks/use-my-profile';
import { useWalletMembers } from '@/hooks/use-wallet-members';

export function AccountCards() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const currentUserId = session?.user?.id ?? null;
  const email = session?.user?.email ?? null;

  const { displayName: profileName, avatarUrl: profileAvatar } = useMyProfile();
  const { members } = useWalletMembers();
  const { data: transactions = [] } = useTransactions();

  const [inviting, setInviting] = useState(false);

  function goEditName() {
    router.push(ROUTES.editDisplayName);
  }

  function openSelfMenu() {
    const edit = t('profile.actions.editName');
    const signOutLabel = t('profile.actions.signOut');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [edit, signOutLabel, t('common.cancel')],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) goEditName();
          else if (index === 1) void signOut();
        },
      );
      return;
    }

    Alert.alert(edit, undefined, [
      { text: edit, onPress: goEditName },
      { text: signOutLabel, style: 'destructive', onPress: () => void signOut() },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  const txCountByUser = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of transactions) {
      if (!tx.createdByUserId) continue;
      counts.set(tx.createdByUserId, (counts.get(tx.createdByUserId) ?? 0) + 1);
    }
    return counts;
  }, [transactions]);

  // Current user first, partners after.
  const ordered = useMemo(() => {
    const me = members.filter((m) => m.userId === currentUserId);
    const others = members.filter((m) => m.userId !== currentUserId);
    return [...me, ...others];
  }, [members, currentUserId]);

  const transactionsLabel = (count: number) =>
    count === 1
      ? t('settings.accountCards.transactionsOne')
      : t('settings.accountCards.transactionsMany', { count });

  return (
    <View style={styles.wrapper}>
      <Text variant="caption" weight="semibold" tone="textMuted" style={styles.label}>
        {t('settings.sections.account').toUpperCase()}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {ordered.map((m) => {
          const isMe = m.userId === currentUserId;
          const name =
            (isMe ? profileName ?? session?.user?.user_metadata?.full_name : m.displayName) ??
            (isMe ? email : null) ??
            t('wallet.partner.unnamed');
          const avatarUrl = isMe
            ? profileAvatar ?? session?.user?.user_metadata?.avatar_url ?? null
            : m.avatarUrl;
          return (
            <SquareCard
              key={m.userId}
              name={name}
              avatarUrl={avatarUrl}
              avatarName={name}
              subtitle={transactionsLabel(txCountByUser.get(m.userId) ?? 0)}
              onPress={isMe ? openSelfMenu : undefined}
            />
          );
        })}

        <AddSquareCard label={t('settings.accountCards.add')} onPress={() => setInviting(true)} />
      </ScrollView>

      {inviting ? <InvitationSection /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
