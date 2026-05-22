import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Transition from 'react-native-screen-transitions';

import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import { Fonts } from '@/constants/theme';
import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ROUTES } from '@/constants/routes';
import { useRedeemInvitation } from '@/hooks/use-wallet-invitation';

export default function RedeemCodeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const redeem = useRedeemInvitation();

  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const bottomPadding = useModalBottomPadding();
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const {
    text: textColor,
    textMuted: mutedColor,
    border: borderColor,
    danger: dangerColor,
    inputBackground,
  } = useModalChrome();

  useEffect(() => {
    const handle = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(handle);
  }, []);

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

  const canJoin = code.trim().length > 0 && !redeem.isPending;

  return (
    <View style={[styles.root, { backgroundColor, paddingBottom: bottomPadding }]}>
      <View style={styles.dragHandleWrap}>
        <View style={[styles.dragHandle, { backgroundColor: borderColor }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Transition.ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text variant="subtitle" weight="semibold" style={styles.title}>
            {t('wallet.invitation.redeemTitle')}
          </Text>

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
                  borderColor: error ? dangerColor : 'transparent',
                  borderWidth: error ? 1 : 0,
                },
              ]}
            />
            {error ? (
              <Text variant="caption" style={{ color: dangerColor }}>
                {t('wallet.invitation.redeemError')}
              </Text>
            ) : null}
          </View>
        </Transition.ScrollView>

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
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    opacity: 0.6,
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
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
