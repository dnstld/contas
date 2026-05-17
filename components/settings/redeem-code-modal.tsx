import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { Fonts } from '@/constants/theme';
import { useRedeemInvitation } from '@/hooks/use-wallet-invitation';
import { useThemeColor } from '@/hooks/use-theme-color';

interface RedeemCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RedeemCodeModal({ visible, onClose, onSuccess }: RedeemCodeModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'positive');
  const dangerColor = useThemeColor({}, 'negative');
  const inputBackground = useThemeColor({}, 'surfaceMuted');

  const redeem = useRedeemInvitation();

  useEffect(() => {
    if (visible) {
      setCode('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (!trimmed || redeem.isPending) return;
    setError(false);
    try {
      await redeem.mutateAsync(trimmed);
      onSuccess();
      onClose();
    } catch {
      setError(true);
    }
  };

  const canJoin = code.trim().length > 0 && !redeem.isPending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor, borderColor }]}>
          <Text variant="subtitle" weight="semibold" style={styles.title}>
            {t('wallet.invitation.redeemTitle')}
          </Text>

          <View style={styles.field}>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(v) => { setCode(v); setError(false); }}
              placeholder={t('wallet.invitation.codeInputPlaceholder')}
              placeholderTextColor={mutedColor}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
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

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text variant="body" weight="medium" style={{ color: mutedColor }}>
                {t('wallet.invitation.redeemCancel')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleJoin}
              disabled={!canJoin}
              style={({ pressed }) => [
                styles.joinBtn,
                {
                  backgroundColor: accentColor,
                  opacity: canJoin ? (pressed ? 0.8 : 1) : 0.4,
                },
              ]}
            >
              <Text variant="body" weight="semibold" style={styles.joinBtnLabel}>
                {redeem.isPending
                  ? t('wallet.invitation.redeeming')
                  : t('wallet.invitation.redeemButton')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  joinBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
  },
  joinBtnLabel: {
    color: '#fff',
  },
});
