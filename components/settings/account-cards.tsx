import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AddSquareCard, SectionLabel, SquareCard, SquareCardSkeleton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/use-auth';
import { useFreeTierLimits } from '@/hooks/use-free-tier-limits';
import { useMyProfile } from '@/hooks/use-my-profile';
import {
  useCancelInvitation,
  useInviteToWallet,
  useOutgoingInvitations,
  type OutgoingInvitation,
} from '@/hooks/use-wallet-invitation';
import { useWalletMembers } from '@/hooks/use-wallet-members';
import { captureError } from '@/utils/monitoring';
import { toast } from '@/utils/toast';

export function AccountCards() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? null;
  const email = session?.user?.email ?? null;

  const { displayName: profileName, avatarUrl: profileAvatar } = useMyProfile();
  const { members, refetch: refetchMembers } = useWalletMembers();
  const { data: invites = [], refetch: refetchInvites } = useOutgoingInvitations();
  const cancelInvite = useCancelInvitation();
  const reinvite = useInviteToWallet();

  // Manually check whether the invitee has joined (the Check CTA).
  const checkPending = async () => {
    const [{ data: refreshed }] = await Promise.all([refetchInvites(), refetchMembers()]);
    const stillPending = (refreshed ?? []).some((i) => i.status === 'pending');
    if (stillPending) toast.info(t('settings.accountCards.stillPending'));
  };

  // Tapping a pending card lets the inviter re-check status or cancel the invite.
  const handlePendingPress = (invite: OutgoingInvitation) => {
    Alert.alert(invite.email, t('settings.accountCards.pendingPrompt'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.accountCards.cancelInvite'),
        style: 'destructive',
        onPress: () => void cancelInvite.mutateAsync(invite.id).catch(() => {}),
      },
      { text: t('settings.accountCards.checkStatus'), onPress: () => void checkPending() },
    ]);
  };

  const handleDeclinedPress = (invite: OutgoingInvitation) => {
    Alert.alert(invite.email, t('settings.accountCards.declinedPrompt'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.accountCards.dismiss'),
        style: 'destructive',
        onPress: () => void cancelInvite.mutateAsync(invite.id).catch(() => {}),
      },
      {
        text: t('settings.accountCards.reInvite'),
        onPress: async () => {
          try {
            await reinvite.mutateAsync(invite.email);
            toast.success(t('wallet.invitation.sentToast', { email: invite.email }));
          } catch (err) {
            captureError(err, { tags: { context: 'invitation' } });
            toast.error(t('wallet.invitation.error'));
          }
        },
      },
    ]);
  };

  // Free tier: cap outstanding (pending) invitations per wallet.
  const limits = useFreeTierLimits();
  const maxPendingInvites = limits?.maxPendingInvitesPerWallet;
  const pendingCount = invites.filter((i) => i.status === 'pending').length;
  const atInviteLimit = maxPendingInvites != null && pendingCount >= maxPendingInvites;

  // Current user first, partners after.
  const ordered = useMemo(() => {
    const me = members.filter((m) => m.userId === currentUserId);
    const others = members.filter((m) => m.userId !== currentUserId);
    return [...me, ...others];
  }, [members, currentUserId]);

  return (
    <View style={styles.wrapper}>
      <SectionLabel label={t('settings.sections.account')} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {ordered.map((m) => {
          const isMe = m.userId === currentUserId;
          const name =
            (isMe ? (profileName ?? session?.user?.user_metadata?.['full_name']) : m.displayName) ??
            (isMe ? email : null) ??
            t('wallet.partner.unnamed');
          const avatarUrl = isMe
            ? (profileAvatar ?? session?.user?.user_metadata?.['avatar_url'] ?? null)
            : m.avatarUrl;
          return (
            <SquareCard
              key={m.userId}
              name={name}
              avatarUrl={avatarUrl}
              avatarName={name}
              subtitle={isMe ? email : m.email}
              badge={isMe ? 'edit' : undefined}
              onPress={isMe ? () => router.push(ROUTES.editDisplayName) : undefined}
            />
          );
        })}

        {invites.map((invite) => {
          const declined = invite.status === 'declined';
          return (
            <SquareCard
              key={invite.id}
              name={t(
                declined
                  ? 'settings.accountCards.inviteDeclined'
                  : 'settings.accountCards.invitePending',
              )}
              avatarName={invite.email}
              subtitle={invite.email}
              badge={declined ? 'declined' : 'pending'}
              onPress={
                declined ? () => handleDeclinedPress(invite) : () => handlePendingPress(invite)
              }
            />
          );
        })}

        {maxPendingInvites == null ? (
          <SquareCardSkeleton />
        ) : (
          <AddSquareCard
            label={t('settings.accountCards.add')}
            onPress={atInviteLimit ? undefined : () => router.push(ROUTES.inviteMember)}
            locked={atInviteLimit}
            lockedLabel={t('wallet.invitation.freeTierLimit', { count: maxPendingInvites })}
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
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
