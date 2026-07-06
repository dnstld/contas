import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar, Surface } from '@/components/ui';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { NotificationBanner } from '@/components/ui/molecules/notification-banner';
import type { WalletWithMeta } from '@/data/finance-types';
import { useAuth } from '@/hooks/use-auth';
import { useWalletList } from '@/hooks/use-wallet-list';
import { useCancelWalletDeletion, useConfirmWalletDeletion } from '@/hooks/use-wallet-mutations';
import { captureError } from '@/utils/monitoring';
import { toast } from '@/utils/toast';

/**
 * Red counterpart to {@link PendingInviteBanner}. Surfaces wallets where the
 * *other* member has requested deletion and the signed-in user is the approver.
 * Sourced from `useWalletList` (each wallet carries its `pendingDeleteRequest`),
 * so it spans every wallet — the banner shows even when a different wallet is
 * active, each card naming its own wallet. The requester's own "waiting for
 * approval" state still lives in the Danger Zone; only the approver-facing
 * prompt moved here.
 */
export function DeleteRequestBanner() {
  const { session } = useAuth();
  const currentUserId = session?.user.id ?? null;
  const { data: wallets = [] } = useWalletList();

  if (!currentUserId) return null;

  const pending = wallets.filter(
    (w) => w.pendingDeleteRequest && w.pendingDeleteRequest.requestedByUserId !== currentUserId,
  );

  if (pending.length === 0) return null;

  return (
    <View style={styles.stack}>
      {pending.map((wallet) => (
        <RequestCard key={wallet.id} wallet={wallet} />
      ))}
    </View>
  );
}

function RequestCard({ wallet }: { wallet: WalletWithMeta }) {
  const { t } = useTranslation();
  const confirm = useConfirmWalletDeletion();
  const cancel = useCancelWalletDeletion();

  const busy = confirm.isPending || cancel.isPending;

  const requesterId = wallet.pendingDeleteRequest?.requestedByUserId ?? null;
  const partnerName = wallet.members.find((m) => m.userId === requesterId)?.displayName ?? null;

  const body = partnerName
    ? t('wallet.deleteBanner.body', { partner: partnerName, wallet: wallet.name })
    : t('wallet.deleteBanner.bodyNoPartner', { wallet: wallet.name });

  const runApprove = async () => {
    try {
      await confirm.mutateAsync(wallet.id);
      toast.success(t('wallet.deleteBanner.approvedToast', { wallet: wallet.name }));
    } catch (err) {
      captureError(err, { tags: { context: 'wallet-delete' } });
      toast.error(t('wallet.deleteBanner.error'));
    }
  };

  const handleApprove = () => {
    if (busy) return;
    // Destructive: gate behind a confirm dialog, mirroring the old Danger Zone flow.
    Alert.alert(t('dangerZone.delete.approveTitle'), t('dangerZone.delete.approveMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('dangerZone.delete.approveAction'),
        style: 'destructive',
        onPress: () => void runApprove(),
      },
    ]);
  };

  const handleDismiss = async () => {
    if (busy) return;
    try {
      await cancel.mutateAsync(wallet.id);
      toast.info(t('wallet.deleteBanner.cancelledToast'));
    } catch (err) {
      captureError(err, { tags: { context: 'wallet-delete' } });
      toast.error(t('wallet.deleteBanner.error'));
    }
  };

  return (
    <Surface variant="plain" tone="negativeSurface" bordered padding={16} style={styles.card}>
      <NotificationBanner
        title={t('wallet.deleteBanner.title')}
        subtitle={body}
        icon={<Avatar icon="trash" size="md" tone="negative" iconTone="onPrimary" />}
      />
      <View style={styles.actions}>
        <PressableButton
          label={t('wallet.deleteBanner.dismiss')}
          variant="secondary"
          size="medium"
          style={styles.action}
          disabled={busy}
          loading={cancel.isPending}
          onPress={handleDismiss}
        />
        <PressableButton
          label={t('wallet.deleteBanner.approve')}
          variant="destructive"
          size="medium"
          style={styles.action}
          disabled={busy}
          loading={confirm.isPending}
          onPress={handleApprove}
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
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
});
