import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { Surface } from '@/components/ui';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import { NotificationBanner } from '@/components/ui/molecules/notification-banner';
import { ModalFormScaffold } from '@/components/ui/templates/modal-form-scaffold';
import { Fonts } from '@/constants/theme';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useInviteToWallet } from '@/hooks/use-wallet-invitation';
import { captureError } from '@/utils/monitoring';
import { toast } from '@/utils/toast';

function errorKey(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('invalid email')) return 'wallet.invitation.errorInvalidEmail';
  if (message.includes('cannot invite self')) return 'wallet.invitation.errorSelf';
  if (message.includes('already a member')) return 'wallet.invitation.errorAlreadyMember';
  if (message.includes('free_tier_limit')) return 'wallet.invitation.errorLimit';
  return 'wallet.invitation.error';
}

export default function InviteMemberScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const invite = useInviteToWallet();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const {
    text: textColor,
    textMuted: mutedColor,
    danger: dangerColor,
    inputBackground,
  } = useModalChrome();

  useEffect(() => {
    const handle = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(handle);
  }, []);

  const trimmed = email.trim();
  const canSend = trimmed.length > 0 && !invite.isPending;

  const handleSend = async () => {
    if (!canSend) return;
    setError(null);
    try {
      await invite.mutateAsync(trimmed);
      toast.success(t('wallet.invitation.sentToast', { email: trimmed.toLowerCase() }));
      router.back();
    } catch (err) {
      const key = errorKey(err);
      if (key === 'wallet.invitation.error') {
        captureError(err, { tags: { context: 'invitation' } });
      }
      setError(t(key));
    }
  };

  return (
    <ModalFormScaffold
      footer={
        <PressableButton
          label={t('wallet.invitation.sendButton')}
          variant="primary"
          size="large"
          loading={invite.isPending}
          disabled={!canSend}
          onPress={handleSend}
        />
      }
    >
      <Surface variant="plain" bordered padding={16}>
        <NotificationBanner
          title={t('wallet.invitation.sectionTitle')}
          subtitle={t('wallet.invitation.description', { app: t('common.appName') })}
        />
      </Surface>

      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('wallet.invitation.emailLabel').toUpperCase()}
        </Text>
        <TextInput
          ref={inputRef}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          placeholder={t('wallet.invitation.emailPlaceholder')}
          placeholderTextColor={mutedColor}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={handleSend}
          accessibilityLabel={t('wallet.invitation.emailPlaceholder')}
          style={[
            styles.input,
            {
              color: textColor,
              backgroundColor: inputBackground,
              fontFamily: Fonts.sans,
              borderColor: error ? dangerColor : 'transparent',
              borderWidth: error ? 1 : 0,
            },
          ]}
        />
        {error ? (
          <Text variant="caption" style={{ color: dangerColor }}>
            {error}
          </Text>
        ) : null}
      </View>
    </ModalFormScaffold>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    letterSpacing: 0.8,
  },
  input: {
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});
