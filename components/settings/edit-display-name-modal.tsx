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
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/utils/supabase';

export interface EditDisplayNameModalProps {
  visible: boolean;
  currentName: string | null;
  onClose: () => void;
}

export function EditDisplayNameModal({
  visible,
  currentName,
  onClose,
}: EditDisplayNameModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'positive');
  const inputBackground = useThemeColor({}, 'surfaceMuted');

  useEffect(() => {
    if (visible) {
      setName(currentName ?? '');
      setIsPending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || isPending) return;
    setIsPending(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    setIsPending(false);
    if (!error) onClose();
  };

  const canSave = name.trim().length > 0 && !isPending;

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
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              style={[
                styles.input,
                { color: textColor, backgroundColor: inputBackground, fontFamily: Fonts.sans },
              ]}
            />
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
                {t('profile.editName.cancel')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: accentColor,
                  opacity: canSave ? (pressed ? 0.8 : 1) : 0.4,
                },
              ]}
            >
              <Text variant="body" weight="semibold" style={styles.saveBtnLabel}>
                {isPending ? t('profile.editName.saving') : t('profile.editName.save')}
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
  saveBtnLabel: {
    color: '#fff',
  },
});
