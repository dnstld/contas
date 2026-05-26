import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Surface, Text } from '@/components/ui';
import { Icon } from '@/components/ui/atoms/icon';
import { MAX_WALLETS_PER_USER } from '@/constants/limits';
import { ROUTES, walletsHref } from '@/constants/routes';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWalletList } from '@/hooks/use-wallet-list';

export function AddWalletCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: wallets = [] } = useWalletList();
  const atLimit = wallets.length >= MAX_WALLETS_PER_USER;

  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'textMuted');
  const accentColor = useThemeColor({}, 'tint');
  const onPrimary = useThemeColor({}, 'onPrimary');

  return (
    <View style={styles.wrapper}>
      <Text variant="caption" weight="semibold" tone="textMuted" style={styles.label}>
        {t('wallets.addCard.sectionTitle').toUpperCase()}
      </Text>

      <Surface variant="muted" padding={16} radius={16} style={styles.card}>
        {atLimit ? (
          <View style={styles.lockedRow}>
            <Icon name="lock.fill" size={16} color={mutedColor} />
            <Text variant="caption" tone="textMuted" style={styles.lockedText}>
              {t('wallets.freeTierLimit', { count: MAX_WALLETS_PER_USER })}
            </Text>
          </View>
        ) : (
          <>
            <Text variant="caption" tone="textMuted" style={styles.description}>
              {t('wallets.addCard.description')}
            </Text>

            <View style={styles.ctaRow}>
              <Pressable
                onPress={() => router.push(walletsHref())}
                style={({ pressed }) => [
                  styles.pill,
                  styles.pillFilled,
                  {
                    backgroundColor: accentColor,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Icon name="plus" size={16} color={onPrimary} />
                <Text variant="caption" weight="semibold" style={{ color: onPrimary }}>
                  {t('wallets.addCard.createButton')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push(ROUTES.redeemCode)}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    borderColor,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Icon name="envelope" size={16} color={mutedColor} />
                <Text variant="caption" weight="medium" style={{ color: mutedColor }}>
                  {t('wallets.addCard.redeemButton')}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </Surface>
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
  card: {
    gap: 16,
  },
  description: {
    lineHeight: 18,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockedText: {
    lineHeight: 18,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillFilled: {
    borderWidth: 0,
  },
});
