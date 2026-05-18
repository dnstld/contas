import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { ActionMenu } from '@/components/ui/molecules/action-menu';
import type { WalletWithMeta } from '@/data/finance-types';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface WalletItemProps {
  wallet: WalletWithMeta;
  isActive: boolean;
  onSwitch: (id: string) => void;
}

export function WalletItem({ wallet, isActive, onSwitch }: WalletItemProps) {
  const { t } = useTranslation();
  const borderColor = useThemeColor({}, 'border');
  const positiveColor = useThemeColor({}, 'positive');

  return (
    <View style={[styles.container, { borderColor }]}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {wallet.name}
          </Text>
          <Text variant="caption" tone="textMuted">
            {wallet.currency}
            {' · '}
            {wallet.memberCount === 1
              ? t('wallets.membersOne')
              : t('wallets.membersMany', { count: wallet.memberCount })}
          </Text>
        </View>

        {isActive ? (
          <View
            style={[
              styles.activeBadge,
              { backgroundColor: positiveColor + '22', borderColor: positiveColor + '44' },
            ]}
          >
            <Text variant="caption" weight="semibold" style={{ color: positiveColor }}>
              {t('wallets.activeLabel')}
            </Text>
          </View>
        ) : (
          <ActionMenu
            items={[
              {
                label: t('wallets.switchButton'),
                action: () => onSwitch(wallet.id),
                systemImage: 'arrow.left.arrow.right',
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
