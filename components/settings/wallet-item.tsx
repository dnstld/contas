import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import type { WalletWithMeta } from '@/data/finance-types';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface WalletItemProps {
  wallet: WalletWithMeta;
  isActive: boolean;
  onSwitch: (id: string) => void;
  isSwitchPending?: boolean;
}

export function WalletItem({ wallet, isActive, onSwitch, isSwitchPending }: WalletItemProps) {
  const { t } = useTranslation();
  const borderColor = useThemeColor({}, 'border');
  const positiveColor = useThemeColor({}, 'positive');
  const mutedColor = useThemeColor({}, 'textMuted');

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
          <View style={[styles.activeBadge, { backgroundColor: positiveColor + '22', borderColor: positiveColor + '44' }]}>
            <Text variant="caption" weight="semibold" style={{ color: positiveColor }}>
              {t('wallets.activeLabel')}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => onSwitch(wallet.id)}
            disabled={isSwitchPending}
            style={({ pressed }) => [
              styles.switchBtn,
              { borderColor, opacity: pressed || isSwitchPending ? 0.5 : 1 },
            ]}
          >
            {isSwitchPending ? (
              <ActivityIndicator size="small" color={mutedColor} />
            ) : (
              <Text variant="caption" weight="medium" style={{ color: mutedColor }}>
                {t('wallets.switchButton')}
              </Text>
            )}
          </Pressable>
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
  switchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
});
