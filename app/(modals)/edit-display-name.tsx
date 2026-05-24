import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import { DISPLAY_NAME_MAX_LENGTH } from '@/constants/limits';
import { Fonts } from '@/constants/theme';
import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/use-my-profile';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function EditDisplayNameScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { displayName: currentName } = useMyProfile();
  const updateProfile = useUpdateMyProfile();

  const [name, setName] = useState(currentName ?? '');
  const inputRef = useRef<TextInput>(null);
  const hydratedRef = useRef(false);

  const bottomPadding = useModalBottomPadding();
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const {
    text: textColor,
    textMuted: mutedColor,
    border: borderColor,
    inputBackground,
  } = useModalChrome();

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
      // error surfaced via mutation state if needed
    }
  };

  const isPending = updateProfile.isPending;
  const canSave = name.trim().length > 0 && !isPending;

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
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: borderColor }]}>
          <PressableButton
            label={t('profile.editName.save')}
            variant="primary"
            size="large"
            loading={isPending}
            disabled={!canSave}
            onPress={handleSave}
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
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
