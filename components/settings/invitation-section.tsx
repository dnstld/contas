import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native';

import { Surface, Text } from '@/components/ui';
import { RedeemCodeModal } from '@/components/settings/redeem-code-modal';
import { useCreateInvitation } from '@/hooks/use-wallet-invitation';
import { useThemeColor } from '@/hooks/use-theme-color';

interface InvitationSectionProps {
  onRedeemSuccess: () => void;
}

export function InvitationSection({ onRedeemSuccess }: InvitationSectionProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState<string | null>(null);
  const [redeemVisible, setRedeemVisible] = useState(false);

  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'textMuted');
  const accentColor = useThemeColor({}, 'positive');

  const createInvitation = useCreateInvitation();

  const handleInvite = async () => {
    if (createInvitation.isPending) return;
    try {
      const generated = await createInvitation.mutateAsync();
      setCode(generated);
    } catch {
      // swallow — user can retry
    }
  };

  const handleShare = async () => {
    if (!code) return;
    await Share.share({ message: code });
  };

  return (
    <View style={styles.wrapper}>
      <Text variant="caption" weight="semibold" tone="textMuted" style={styles.label}>
        {t('wallet.invitation.sectionTitle').toUpperCase()}
      </Text>

      <Surface variant="muted" padding={16} radius={16} style={styles.card}>
        {code ? (
          <>
            <Text variant="caption" weight="medium" tone="textMuted" style={styles.codeLabel}>
              {t('wallet.invitation.codeLabel').toUpperCase()}
            </Text>
            <Surface variant="elevated" padding={14} radius={10} style={styles.codeBlock}>
              <Text variant="body" weight="semibold" style={styles.codeText} numberOfLines={1}>
                {code}
              </Text>
            </Surface>
            <Text variant="caption" tone="textMuted" style={styles.expiry}>
              {t('wallet.invitation.codeExpiry')}
            </Text>

            <View style={styles.codeActions}>
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [
                  styles.pill,
                  { borderColor: accentColor, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text variant="caption" weight="semibold" style={{ color: accentColor }}>
                  {t('wallet.invitation.shareCode')}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setRedeemVisible(true)}
              style={({ pressed }) => [styles.linkBtn, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Text variant="caption" style={{ color: mutedColor }}>
                {t('wallet.invitation.haveCodeLink')}
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.ctaRow}>
            <Pressable
              onPress={handleInvite}
              disabled={createInvitation.isPending}
              style={({ pressed }) => [
                styles.pill,
                styles.pillFilled,
                { backgroundColor: accentColor, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              {createInvitation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text variant="caption" weight="semibold" style={styles.pillFilledLabel}>
                  {t('wallet.invitation.inviteButton')}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => setRedeemVisible(true)}
              style={({ pressed }) => [styles.pill, { borderColor, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text variant="caption" weight="medium" style={{ color: mutedColor }}>
                {t('wallet.invitation.haveCodeButton')}
              </Text>
            </Pressable>
          </View>
        )}
      </Surface>

      <RedeemCodeModal
        visible={redeemVisible}
        onClose={() => setRedeemVisible(false)}
        onSuccess={onRedeemSuccess}
      />
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
    gap: 12,
  },
  codeLabel: {
    letterSpacing: 0.6,
  },
  codeBlock: {
    alignItems: 'center',
  },
  codeText: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 1.5,
  },
  expiry: {
    textAlign: 'center',
  },
  codeActions: {
    alignItems: 'center',
  },
  ctaRow: {
    gap: 10,
  },
  pill: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillFilled: {
    borderWidth: 0,
  },
  pillFilledLabel: {
    color: '#fff',
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
});
