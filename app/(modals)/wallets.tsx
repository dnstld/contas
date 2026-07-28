import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import { SortMenu } from '@/components/ui/molecules/sort-menu';
import { ModalFormScaffold } from '@/components/ui/templates/modal-form-scaffold';
import { ROUTES } from '@/constants/routes';
import { Fonts } from '@/constants/theme';
import {
  SUPPORTED_CURRENCIES,
  defaultCurrencyForRegion,
  type SupportedCurrency,
} from '@/data/currency';
import { getDeviceRegionCode } from '@/i18n';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useWallet } from '@/hooks/use-wallet';
import { useCreateWallet } from '@/hooks/use-wallet-mutations';

export default function WalletsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { switchWallet } = useWallet();
  const createWallet = useCreateWallet();

  const [newName, setNewName] = useState('');
  // Smart default from the device region (e.g. BR → BRL, DE → EUR); the user
  // can still pick any supported currency. Currency is locked once the wallet
  // is created, so this initial choice is the only time it can be set.
  const [newCurrency, setNewCurrency] = useState<SupportedCurrency>(() =>
    defaultCurrencyForRegion(getDeviceRegionCode()),
  );
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const handle = setTimeout(() => nameInputRef.current?.focus(), 250);
    return () => clearTimeout(handle);
  }, []);

  const { text: textColor, textMuted: mutedColor, inputBackground } = useModalChrome();

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
    // Errors are surfaced centrally by mutationCache.onError (toast + Sentry).
    // Catch here so a rejected mutateAsync doesn't escape this fire-and-forget
    // onPress handler as an unhandled promise rejection (which bypasses the
    // monitoring wrapper and double-reports raw — see CONTAS-6).
    try {
      const newId = await createWallet.mutateAsync({ name, currency: newCurrency });
      switchWallet(newId);
      router.dismissTo(ROUTES.home);
    } catch {
      // Handled centrally; navigation intentionally skipped on failure.
    }
  }

  const canCreate = newName.trim().length > 0 && !createWallet.isPending;

  return (
    <ModalFormScaffold
      footer={
        <PressableButton
          label={t('common.create')}
          variant="primary"
          size="large"
          loading={createWallet.isPending}
          disabled={!canCreate}
          onPress={handleCreate}
        />
      }
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
