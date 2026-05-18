import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { withAlpha } from '@/utils/color';
import { useWallet } from '@/hooks/use-wallet';
import { useWalletList } from '@/hooks/use-wallet-list';
import { useLeaveWallet } from '@/hooks/use-leave-wallet';
import {
  useCancelWalletDeletion,
  useConfirmWalletDeletion,
  useRequestOrDeleteWallet,
} from '@/hooks/use-wallet-mutations';

interface DangerZoneProps {
  currentUserId: string;
  partnerName: string | null;
  hasParter: boolean;
}

export function DangerZone({ currentUserId, partnerName, hasParter }: DangerZoneProps) {
  const { t } = useTranslation();
  const { walletId } = useWallet();

  const { data: wallets = [] } = useWalletList();
  const currentWallet = wallets.find((w) => w.id === walletId) ?? null;
  const memberCount = currentWallet?.memberCount ?? 1;
  const pending = currentWallet?.pendingDeleteRequest ?? null;
  const iAmRequester = pending?.requestedByUserId === currentUserId;
  const partnerIsRequester = !!pending && !iAmRequester;

  const leaveWallet = useLeaveWallet();
  const requestOrDelete = useRequestOrDeleteWallet();
  const confirmDeletion = useConfirmWalletDeletion();
  const cancelDeletion = useCancelWalletDeletion();

  const dangerColor = useThemeColor({}, 'negative');
  const mutedColor = useThemeColor({}, 'textMuted');
  const surfaceMuted = useThemeColor({}, 'surfaceMuted');
  const onPrimary = useThemeColor({}, 'onPrimary');

  const displayPartner = partnerName ?? t('wallet.partner.unnamed');

  function handleLeave() {
    Alert.alert(t('wallet.leave.confirmTitle'), t('wallet.leave.confirmBody'), [
      { text: t('wallet.leave.confirmCancel'), style: 'cancel' },
      {
        text: t('wallet.leave.confirmLeave'),
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveWallet.mutateAsync();
          } catch {
            Alert.alert(t('wallet.leave.errorToast'));
          }
        },
      },
    ]);
  }

  function handleDeletePress() {
    if (!walletId) return;

    if (memberCount <= 1) {
      Alert.alert(t('dangerZone.delete.soloTitle'), t('dangerZone.delete.soloMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('dangerZone.delete.confirmAction'),
          style: 'destructive',
          onPress: () => requestOrDelete.mutate(walletId),
        },
      ]);
    } else {
      Alert.alert(
        t('dangerZone.delete.partnerTitle'),
        t('dangerZone.delete.partnerMessage', { partner: displayPartner }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('dangerZone.delete.requestAction'),
            style: 'destructive',
            onPress: () => requestOrDelete.mutate(walletId),
          },
        ],
      );
    }
  }

  function handleApprove() {
    if (!walletId) return;
    Alert.alert(t('dangerZone.delete.approveTitle'), t('dangerZone.delete.approveMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('dangerZone.delete.approveAction'),
        style: 'destructive',
        onPress: () => confirmDeletion.mutate(walletId),
      },
    ]);
  }

  function handleCancel() {
    if (!walletId) return;
    cancelDeletion.mutate(walletId);
  }

  return (
    <View style={styles.container}>
      <Text
        variant="caption"
        weight="semibold"
        style={[styles.sectionLabel, { color: dangerColor }]}
      >
        {t('dangerZone.title').toUpperCase()}
      </Text>

      <View style={[styles.card, { borderColor: withAlpha(dangerColor, 0.27) }]}>
        {/* Leave wallet — only shown when there is a partner AND the user has another wallet to fall back to */}
        {hasParter && wallets.length > 1 && (
          <>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="body" weight="medium">
                  {t('dangerZone.leave.title')}
                </Text>
                <Text variant="caption" tone="textMuted">
                  {t('dangerZone.leave.description')}
                </Text>
              </View>
              <Pressable
                onPress={handleLeave}
                disabled={leaveWallet.isPending}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { borderColor: dangerColor, opacity: pressed || leaveWallet.isPending ? 0.5 : 1 },
                ]}
              >
                {leaveWallet.isPending ? (
                  <ActivityIndicator size="small" color={dangerColor} />
                ) : (
                  <Text variant="caption" weight="semibold" style={{ color: dangerColor }}>
                    {t('dangerZone.leave.button')}
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={[styles.divider, { backgroundColor: withAlpha(dangerColor, 0.13) }]} />
          </>
        )}

        {/* Delete wallet — state-driven */}
        {!pending && (
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text variant="body" weight="medium">
                {t('dangerZone.delete.title')}
              </Text>
              <Text variant="caption" tone="textMuted">
                {memberCount <= 1
                  ? t('dangerZone.delete.soloDescription')
                  : t('dangerZone.delete.partnerDescription', { partner: displayPartner })}
              </Text>
            </View>
            <Pressable
              onPress={handleDeletePress}
              disabled={requestOrDelete.isPending}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  borderColor: dangerColor,
                  opacity: pressed || requestOrDelete.isPending ? 0.5 : 1,
                },
              ]}
            >
              {requestOrDelete.isPending ? (
                <ActivityIndicator size="small" color={dangerColor} />
              ) : (
                <Text variant="caption" weight="semibold" style={{ color: dangerColor }}>
                  {t('dangerZone.delete.button')}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* State: current user requested deletion — waiting for partner */}
        {iAmRequester && (
          <View style={styles.pendingBlock}>
            <View style={styles.pendingHeader}>
              <Text variant="body" weight="medium">
                {t('dangerZone.delete.title')}
              </Text>
              <View
                style={[
                  styles.waitingBadge,
                  {
                    backgroundColor: withAlpha(dangerColor, 0.09),
                    borderColor: withAlpha(dangerColor, 0.2),
                  },
                ]}
              >
                <Text variant="caption" weight="medium" style={{ color: dangerColor }}>
                  {t('dangerZone.delete.waitingBadge')}
                </Text>
              </View>
            </View>
            <Text variant="caption" tone="textMuted" style={styles.pendingCaption}>
              {t('dangerZone.delete.waitingCaption', { partner: displayPartner })}
            </Text>
            <Pressable
              onPress={handleCancel}
              disabled={cancelDeletion.isPending}
              hitSlop={8}
              style={({ pressed }) => [{ opacity: pressed || cancelDeletion.isPending ? 0.5 : 1 }]}
            >
              {cancelDeletion.isPending ? (
                <ActivityIndicator size="small" color={mutedColor} />
              ) : (
                <Text
                  variant="caption"
                  weight="medium"
                  style={{ color: mutedColor, textDecorationLine: 'underline' }}
                >
                  {t('dangerZone.delete.cancelRequest')}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* State: partner requested deletion — awaiting current user's approval */}
        {partnerIsRequester && (
          <View style={[styles.approveBlock, { backgroundColor: withAlpha(dangerColor, 0.05) }]}>
            <Text variant="body" weight="semibold" style={{ color: dangerColor }}>
              {t('dangerZone.delete.partnerRequestedTitle', { partner: displayPartner })}
            </Text>
            <Text variant="caption" tone="textMuted" style={styles.pendingCaption}>
              {t('dangerZone.delete.partnerRequestedCaption')}
            </Text>

            <View style={styles.approveActions}>
              <Pressable
                onPress={handleApprove}
                disabled={confirmDeletion.isPending || cancelDeletion.isPending}
                style={({ pressed }) => [
                  styles.approveBtn,
                  {
                    backgroundColor: dangerColor,
                    opacity: pressed || confirmDeletion.isPending ? 0.6 : 1,
                  },
                ]}
              >
                {confirmDeletion.isPending ? (
                  <ActivityIndicator size="small" color={onPrimary} />
                ) : (
                  <Text variant="body" weight="semibold" style={{ color: onPrimary }}>
                    {t('dangerZone.delete.approveAction')}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleCancel}
                disabled={cancelDeletion.isPending || confirmDeletion.isPending}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    backgroundColor: surfaceMuted,
                    opacity: pressed || cancelDeletion.isPending ? 0.6 : 1,
                  },
                ]}
              >
                {cancelDeletion.isPending ? (
                  <ActivityIndicator size="small" color={mutedColor} />
                ) : (
                  <Text variant="body" weight="medium" style={{ color: mutedColor }}>
                    {t('dangerZone.delete.cancelRequest')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  pendingBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waitingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pendingCaption: {
    lineHeight: 18,
  },
  approveBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  approveActions: {
    gap: 8,
    marginTop: 4,
  },
  approveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
