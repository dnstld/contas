import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Surface, Text } from '@/components/ui';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
import {
  useAcceptInvitation,
  useDeclineInvitation,
  usePendingInvitations,
  type PendingInvitation,
} from '@/hooks/use-wallet-invitation';
import { captureError } from '@/utils/monitoring';
import { toast } from '@/utils/toast';

export function PendingInviteBanner() {
  const { data: invitations = [] } = usePendingInvitations();

  if (invitations.length === 0) return null;

  return (
    <View style={styles.stack}>
      {invitations.map((invite) => (
        <InviteCard key={invite.id} invite={invite} />
      ))}
    </View>
  );
}

function InviteCard({ invite }: { invite: PendingInvitation }) {
  const { t } = useTranslation();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();

  const accepting = accept.isPending && accept.variables === invite.id;
  const declining = decline.isPending && decline.variables === invite.id;
  const busy = accepting || declining;

  const body = invite.inviterName
    ? t('wallet.inviteBanner.body', { inviter: invite.inviterName, wallet: invite.walletName })
    : t('wallet.inviteBanner.bodyNoInviter', { wallet: invite.walletName });

  const handleAccept = async () => {
    if (busy) return;
    try {
      await accept.mutateAsync(invite.id);
      toast.success(t('wallet.inviteBanner.acceptedToast', { wallet: invite.walletName }));
    } catch (err) {
      captureError(err, { tags: { context: 'invitation' } });
      toast.error(t('wallet.inviteBanner.error'));
    }
  };

  const handleDecline = async () => {
    if (busy) return;
    try {
      await decline.mutateAsync(invite.id);
      toast.info(t('wallet.inviteBanner.declinedToast'));
    } catch (err) {
      captureError(err, { tags: { context: 'invitation' } });
      toast.error(t('wallet.inviteBanner.error'));
    }
  };

  return (
    <Surface variant="plain" bordered padding={16} style={styles.card}>
      <View style={styles.text}>
        <Text variant="body" weight="semibold">
          {t('wallet.inviteBanner.title')}
        </Text>
        <Text variant="caption" tone="textMuted">
          {body}
        </Text>
      </View>
      <View style={styles.actions}>
        <PressableButton
          label={t('wallet.inviteBanner.decline')}
          variant="secondary"
          size="medium"
          style={styles.action}
          disabled={busy}
          loading={declining}
          onPress={handleDecline}
        />
        <PressableButton
          label={t('wallet.inviteBanner.accept')}
          variant="primary"
          size="medium"
          style={styles.action}
          disabled={busy}
          loading={accepting}
          onPress={handleAccept}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  card: {
    gap: 12,
  },
  text: {
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
});
