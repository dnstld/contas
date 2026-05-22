import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native';

import { Surface, Text } from '@/components/ui';
import { useCreateInvitation } from '@/hooks/use-wallet-invitation';
import { useThemeColor } from '@/hooks/use-theme-color';
import { captureError } from '@/utils/monitoring';

export function InvitationSection() {
  const { t } = useTranslation();
  const [code, setCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState(false);

  const accentColor = useThemeColor({}, 'positive');
  const dangerColor = useThemeColor({}, 'negative');
  const onPrimary = useThemeColor({}, 'onPrimary');

  const createInvitation = useCreateInvitation();

  const handleInvite = async () => {
    if (createInvitation.isPending) return;
    setInviteError(false);
    try {
      const generated = await createInvitation.mutateAsync();
      setCode(generated);
    } catch (err) {
      captureError(err, { tags: { context: 'invitation' } });
      setInviteError(true);
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
          </>
        ) : (
          <>
            <Text variant="caption" tone="textMuted" style={styles.description}>
              {t('wallet.invitation.description')}
            </Text>
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
                  <ActivityIndicator size="small" color={onPrimary} />
                ) : (
                  <Text variant="caption" weight="semibold" style={{ color: onPrimary }}>
                    {t('wallet.invitation.inviteButton')}
                  </Text>
                )}
              </Pressable>
            </View>
            {inviteError ? (
              <Text variant="caption" style={[styles.error, { color: dangerColor }]}>
                {t('wallet.invitation.inviteError')}
              </Text>
            ) : null}
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
  description: {
    lineHeight: 18,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillFilled: {
    borderWidth: 0,
  },
  error: {
    textAlign: 'center',
  },
});
