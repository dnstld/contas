import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ModalSheet } from '@/components/ui/molecules/modal-sheet';
import { Text } from '@/components/ui/atoms/text';
import { Fonts } from '@/constants/theme';
import { DISPLAY_NAME_MAX_LENGTH } from '@/constants/limits';
import { useAuth } from '@/hooks/use-auth';
import { myProfileKey } from '@/hooks/use-my-profile';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';
import { walletMemberKeys } from '@/hooks/use-wallet-members';
import { supabase } from '@/utils/supabase';

export interface EditDisplayNameModalProps {
  visible: boolean;
  currentName: string | null;
  onClose: () => void;
}

export function EditDisplayNameModal({ visible, currentName, onClose }: EditDisplayNameModalProps) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { walletId } = useWallet();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'positive');
  const inputBackground = useThemeColor({}, 'surfaceMuted');
  const onPrimary = useThemeColor({}, 'onPrimary');

  useEffect(() => {
    if (visible) {
      setName(currentName ?? '');
      setIsPending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, currentName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || isPending) return;
    setIsPending(true);
    const userId = session?.user.id;
    const [authResult, profileResult] = await Promise.all([
      supabase.auth.updateUser({ data: { full_name: trimmed } }),
      userId
        ? supabase.from('profiles').update({ display_name: trimmed }).eq('id', userId)
        : Promise.resolve({ error: null }),
    ]);
    setIsPending(false);
    if (!authResult.error && !profileResult.error) {
      if (userId) queryClient.invalidateQueries({ queryKey: myProfileKey(userId) });
      if (walletId) queryClient.invalidateQueries({ queryKey: walletMemberKeys.list(walletId) });
      onClose();
    }
  };

  const canSave = name.trim().length > 0 && !isPending;

  return (
    <ModalSheet visible={visible} onRequestClose={onClose} animationType="fade">
      <View style={styles.body}>
        <Text variant="subtitle" weight="semibold" style={styles.title}>
          {t('profile.editName.title')}
        </Text>

        <View style={styles.field}>
          <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
            {t('profile.editName.nameLabel').toUpperCase()}
          </Text>
          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={setName}
            placeholder={t('profile.editName.namePlaceholder')}
            placeholderTextColor={mutedColor}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            accessibilityLabel={t('profile.editName.nameLabel')}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, fontFamily: Fonts.sans },
            ]}
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('profile.editName.cancel')}
            style={({ pressed }) => [styles.cancelBtn, { borderColor, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text variant="body" weight="medium" style={{ color: mutedColor }}>
              {t('profile.editName.cancel')}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel={t('profile.editName.save')}
            accessibilityState={{ disabled: !canSave, busy: isPending }}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: accentColor,
                opacity: canSave ? (pressed ? 0.8 : 1) : 0.4,
              },
            ]}
          >
            <Text variant="body" weight="semibold" style={{ color: onPrimary }}>
              {isPending ? t('profile.editName.saving') : t('profile.editName.save')}
            </Text>
          </Pressable>
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    gap: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
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
  saveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
  },
});
