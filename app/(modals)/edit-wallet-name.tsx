import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { ModalActions } from '@/components/ui/molecules/modal-actions';
import { ModalFormScaffold } from '@/components/ui/templates/modal-form-scaffold';
import { Fonts } from '@/constants/theme';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useRenameWallet } from '@/hooks/use-wallet-mutations';
import { useWalletList } from '@/hooks/use-wallet-list';

export default function EditWalletNameScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: wallets = [] } = useWalletList();
  const currentName = wallets.find((w) => w.id === id)?.name ?? null;
  const renameWallet = useRenameWallet();

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
    if (!trimmed || !id || renameWallet.isPending) return;
    try {
      await renameWallet.mutateAsync({ id, name: trimmed });
      router.back();
    } catch {
      // Failure is surfaced to the user via the global MutationCache toast
      // (this mutation is not `meta.silent`); nothing to do here but stay open.
    }
  };

  const isPending = renameWallet.isPending;
  const canSave = name.trim().length > 0 && !isPending;

  return (
    <ModalFormScaffold
      footer={
        <ModalActions
          primary={{
            label: t('wallets.saveButton'),
            onPress: handleSave,
            loading: isPending,
            disabled: !canSave,
          }}
        />
      }
    >
      <Text variant="subtitle" weight="semibold" style={styles.title}>
        {t('wallets.editTitle')}
      </Text>

      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('wallets.nameLabel').toUpperCase()}
        </Text>
        <TextInput
          ref={inputRef}
          value={name}
          onChangeText={setName}
          placeholder={t('wallets.namePlaceholder')}
          placeholderTextColor={mutedColor}
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          accessibilityLabel={t('wallets.nameLabel')}
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
