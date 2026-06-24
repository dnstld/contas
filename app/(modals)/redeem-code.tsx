import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import { Surface } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { ROUTES } from '@/constants/routes';
import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useThemeColor } from '@/hooks/use-theme-color';
import { usePeekInvitation, useRedeemInvitation } from '@/hooks/use-wallet-invitation';

export default function RedeemCodeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string }>();
  const redeem = useRedeemInvitation();

  // A code arriving via deep link is fixed for the life of the screen; the
  // manual-entry path starts empty and the user types into `code`.
  const [linkedCode] = useState(() =>
    typeof params.code === 'string' ? params.code.trim() : '',
  );
  const [code, setCode] = useState(linkedCode);
  const [error, setError] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const preview = usePeekInvitation(linkedCode || null);
  // Fall back to the manual input when there's no link code, or the linked
  // code couldn't be previewed (invalid/expired) so the user can fix it.
  const showManualInput = !linkedCode || preview.isError;

  const bottomPadding = useModalBottomPadding();
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const accentColor = useThemeColor({}, 'tint');
  const {
    text: textColor,
    textMuted: mutedColor,
    border: borderColor,
    danger: dangerColor,
    inputBackground,
  } = useModalChrome();

  useEffect(() => {
    // Only steal focus for manual entry — a previewed link needs no typing.
    if (linkedCode) return;
    const handle = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(handle);
  }, [linkedCode]);

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (!trimmed || redeem.isPending) return;
    setError(false);
    try {
      await redeem.mutateAsync(trimmed);
      router.dismissTo(ROUTES.home);
    } catch {
      setError(true);
    }
  };

  const expired = preview.data?.expired ?? false;
  const canJoin = code.trim().length > 0 && !redeem.isPending && !expired;
  const showError = error || (!!linkedCode && (preview.isError || expired));

  return (
    <View style={[styles.root, { backgroundColor, paddingBottom: bottomPadding }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text variant="subtitle" weight="semibold" style={styles.title}>
            {linkedCode ? t('wallet.invitation.invitedTitle') : t('wallet.invitation.redeemTitle')}
          </Text>

          {linkedCode && preview.isLoading ? (
            <View style={styles.previewLoading}>
              <ActivityIndicator color={accentColor} />
            </View>
          ) : null}

          {linkedCode && preview.data && !preview.data.expired ? (
            <Surface variant="muted" padding={16} radius={16} style={styles.preview}>
              <Text variant="caption" tone="textMuted">
                {t('wallet.invitation.previewJoining')}
              </Text>
              <Text variant="subtitle" weight="semibold">
                {preview.data.walletName}
              </Text>
              {preview.data.inviterName ? (
                <Text variant="caption" tone="textMuted">
                  {t('wallet.invitation.previewSharedBy', { name: preview.data.inviterName })}
                </Text>
              ) : null}
            </Surface>
          ) : null}

          {showManualInput ? (
            <View style={styles.field}>
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(v) => {
                  setCode(v);
                  setError(false);
                }}
                placeholder={t('wallet.invitation.codeInputPlaceholder')}
                placeholderTextColor={mutedColor}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleJoin}
                accessibilityLabel={t('wallet.invitation.codeInputPlaceholder')}
                style={[
                  styles.input,
                  {
                    color: textColor,
                    backgroundColor: inputBackground,
                    fontFamily: Fonts.sans,
                    borderColor: showError ? dangerColor : 'transparent',
                    borderWidth: showError ? 1 : 0,
                  },
                ]}
              />
            </View>
          ) : null}

          {showError ? (
            <Text variant="caption" style={[styles.error, { color: dangerColor }]}>
              {t('wallet.invitation.redeemError')}
            </Text>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: borderColor }]}>
          <PressableButton
            label={t('wallet.invitation.redeemButton')}
            variant="primary"
            size="large"
            loading={redeem.isPending}
            disabled={!canJoin}
            onPress={handleJoin}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  previewLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  preview: {
    gap: 4,
    alignItems: 'center',
  },
  field: {
    gap: 6,
  },
  input: {
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  error: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
