import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import { ModalFormScaffold } from '@/components/ui/templates/modal-form-scaffold';
import { DISPLAY_NAME_MAX_LENGTH } from '@/constants/limits';
import { Fonts } from '@/constants/theme';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/use-my-profile';

export default function EditDisplayNameScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { displayName: currentName } = useMyProfile();
  const updateProfile = useUpdateMyProfile();

  const [name, setName] = useState(currentName ?? '');
  const inputRef = useRef<TextInput>(null);
  const hydratedRef = useRef(false);

  const { text: textColor, textMuted: mutedColor, inputBackground } = useModalChrome();

  useEffect(() => {
    if (!hydratedRef.current && currentName != null) {
      hydratedRef.current = true;
      setName(currentName);
    }
  }, [currentName]);

  useEffect(() => {
    const handle = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(handle);
  }, []);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || updateProfile.isPending) return;
    try {
      await updateProfile.mutateAsync({ displayName: trimmed });
      router.back();
    } catch {
      // Failure is surfaced to the user via the global MutationCache toast
      // (this mutation is not `meta.silent`); nothing to do here but stay open.
    }
  };

  const isPending = updateProfile.isPending;
  const canSave = name.trim().length > 0 && !isPending;

  return (
    <ModalFormScaffold
      footer={
        <PressableButton
          label={t('profile.editName.save')}
          variant="primary"
          size="large"
          loading={isPending}
          disabled={!canSave}
          onPress={handleSave}
        />
      }
    >
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
    </ModalFormScaffold>
  );
}

const styles = StyleSheet.create({
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
});
