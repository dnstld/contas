import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Transition from 'react-native-screen-transitions';

import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import { SortMenu } from '@/components/ui/molecules/sort-menu';
import { ROUTES } from '@/constants/routes';
import { Fonts } from '@/constants/theme';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/data/currency';
import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';
import { useCreateWallet } from '@/hooks/use-wallet-mutations';

export default function WalletsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { switchWallet } = useWallet();
  const createWallet = useCreateWallet();

  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState<SupportedCurrency>('BRL');
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const handle = setTimeout(() => nameInputRef.current?.focus(), 250);
    return () => clearTimeout(handle);
  }, []);

  const bottomPadding = useModalBottomPadding();
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const {
    border: borderColor,
    text: textColor,
    textMuted: mutedColor,
    inputBackground,
  } = useModalChrome();

  const currencyOptions = useMemo(
    () =>
      SUPPORTED_CURRENCIES.map((code) => ({
        value: code,
        label: t(`settings.currencies.${code}`),
      })),
    [t],
  );

  async function handleCreate() {
    const name = newName.trim();
    if (!name || createWallet.isPending) return;
    const newId = await createWallet.mutateAsync({ name, currency: newCurrency });
    switchWallet(newId);
    router.back();
    router.navigate(ROUTES.home);
  }

  const canCreate = newName.trim().length > 0 && !createWallet.isPending;

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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="subtitle" weight="semibold" style={styles.title}>
            {t('wallets.createTitle')}
          </Text>

          <View style={styles.field}>
            <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
              {t('wallets.nameLabel').toUpperCase()}
            </Text>
            <TextInput
              ref={nameInputRef}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('wallets.namePlaceholder')}
              placeholderTextColor={mutedColor}
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              style={[
                styles.input,
                { color: textColor, backgroundColor: inputBackground, fontFamily: Fonts.sans },
              ]}
            />
          </View>

          <View style={styles.field}>
            <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
              {t('settings.currencyRow.title').toUpperCase()}
            </Text>
            <SortMenu<SupportedCurrency>
              options={currencyOptions}
              value={newCurrency}
              onChange={setNewCurrency}
            />
          </View>
        </Transition.ScrollView>

        <View style={[styles.footer, { borderTopColor: borderColor }]}>
          <PressableButton
            label={t('common.create')}
            variant="primary"
            size="large"
            loading={createWallet.isPending}
            disabled={!canCreate}
            onPress={handleCreate}
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
