import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Icon, Skeleton, Surface, Text } from '@/components/ui';
import { LogoIllustration } from '@/components/ui/molecules/logo/svg/logo-illustration';
import { editWalletNameHref, walletsHref } from '@/constants/routes';
import { useFreeTierLimits } from '@/hooks/use-free-tier-limits';
import { useWallet } from '@/hooks/use-wallet';
import { useWalletList } from '@/hooks/use-wallet-list';
import { useThemeColor } from '@/hooks/use-theme-color';

type Anchor = { x: number; y: number; width: number; height: number };

/**
 * Wallet switcher rendered at the top of the Overview screen. The field shows
 * the active wallet (brand mark + name + `currency · members`); tapping it opens
 * a dropdown to switch wallet, edit any wallet, or create a new one (capped by
 * the free-tier limit). Replaces the old `WalletCards` row on the Account
 * screen — this is now the single place to manage wallets.
 */
export function WalletSelect() {
  const { t } = useTranslation();
  const router = useRouter();
  const { walletId, switchWallet } = useWallet();
  const { data: wallets = [] } = useWalletList();
  const limits = useFreeTierLimits();
  const maxWallets = limits?.maxWalletsPerUser;

  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');

  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const active = wallets.find((w) => w.id === walletId) ?? wallets[0];
  const atLimit = maxWallets != null && wallets.length >= maxWallets;

  const memberLabel = (count: number) =>
    count === 1 ? t('wallets.membersOne') : t('wallets.membersMany', { count });

  function openMenu() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }

  function selectWallet(id: string) {
    switchWallet(id);
    setOpen(false);
  }

  function editWallet(id: string) {
    setOpen(false);
    router.push(editWalletNameHref(id));
  }

  function addWallet() {
    setOpen(false);
    router.push(walletsHref());
  }

  // No active wallet yet (initial load) — hold the field's footprint so the
  // header doesn't jump when data arrives.
  if (!active) {
    return (
      <View style={styles.container}>
        <Skeleton width="100%" height={60} borderRadius={12} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        ref={triggerRef}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={active.name}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          styles.field,
          { backgroundColor: surface, borderColor: open ? tint : border },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.logoBox}>
          <LogoIllustration width={34} />
        </View>
        <View style={styles.fieldText}>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {active.name}
          </Text>
          <Text variant="caption" tone="textMuted" numberOfLines={1}>
            {`${active.currency} · ${memberLabel(active.memberCount)}`}
          </Text>
        </View>
        <View style={open ? styles.chevronOpen : undefined}>
          <Icon name="chevron.down" size={16} tone="textMuted" />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {anchor ? (
            <Pressable
              // Stop backdrop taps from closing when interacting with the panel.
              onPress={() => {}}
              style={[
                styles.panelWrap,
                { top: anchor.y + anchor.height + 6, left: anchor.x, width: anchor.width },
              ]}
            >
              <Surface variant="elevated" bordered padding={6} radius={14}>
                {wallets.map((w) => {
                  const isActive = w.id === active.id;
                  return (
                    <View key={w.id} style={styles.row}>
                      <Pressable
                        onPress={() => selectWallet(w.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${w.name}, ${w.currency} · ${memberLabel(w.memberCount)}`}
                        accessibilityState={{ selected: isActive }}
                        style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
                      >
                        <View style={styles.rowText}>
                          <Text variant="body" weight="semibold" numberOfLines={1}>
                            {w.name}
                          </Text>
                          <Text variant="caption" tone="textMuted" numberOfLines={1}>
                            {`${w.currency} · ${memberLabel(w.memberCount)}`}
                          </Text>
                        </View>
                        {isActive ? <Icon name="checkmark" size={16} tone="tint" /> : null}
                      </Pressable>
                      <Pressable
                        onPress={() => editWallet(w.id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={t('wallets.actions.edit')}
                        style={({ pressed }) => [
                          styles.editButton,
                          { borderColor: border },
                          pressed && styles.rowPressed,
                        ]}
                      >
                        <Icon name="pencil" size={15} tone="textMuted" />
                      </Pressable>
                    </View>
                  );
                })}

                <View style={[styles.divider, { backgroundColor: border }]} />

                <Pressable
                  onPress={atLimit ? undefined : addWallet}
                  disabled={atLimit}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.walletCards.add')}
                  accessibilityState={{ disabled: atLimit }}
                  style={({ pressed }) => [
                    styles.rowMain,
                    styles.createRow,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={[styles.plusCircle, { borderColor: border }]}>
                    <Icon name="plus" size={16} tone={atLimit ? 'textMuted' : 'tint'} />
                  </View>
                  <View style={styles.rowText}>
                    <Text
                      variant="body"
                      weight="semibold"
                      tone={atLimit ? 'textMuted' : 'tint'}
                      numberOfLines={1}
                    >
                      {t('settings.walletCards.add')}
                    </Text>
                    {atLimit && maxWallets != null ? (
                      <Text variant="caption" tone="textMuted" numberOfLines={1}>
                        {t('wallets.freeTierLimit', { count: maxWallets })}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              </Surface>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoBox: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  fieldText: { flex: 1, minWidth: 0, gap: 2 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  pressed: { opacity: 0.6 },

  backdrop: { flex: 1 },
  panelWrap: { position: 'absolute' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  rowPressed: { opacity: 0.6 },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  createRow: { gap: 12 },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4, marginHorizontal: 8 },
  plusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
