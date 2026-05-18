import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { SortMenu } from '@/components/ui/molecules/sort-menu';
import { WalletItem } from '@/components/settings/wallet-item';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/hooks/use-currency';
import { Fonts } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useWalletList } from '@/hooks/use-wallet-list';
import { useCreateWallet } from '@/hooks/use-wallet-mutations';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';

export interface WalletsModalProps {
  visible: boolean;
  onClose: () => void;
  defaultView?: ModalView;
}

type ModalView = 'list' | 'create';

const FREE_TIER_LIMIT = 2;

export function WalletsModal({ visible, onClose, defaultView = 'list' }: WalletsModalProps) {
  const { t } = useTranslation();
  const { walletId, switchWallet } = useWallet();
  const router = useRouter();

  const { data: wallets = [], isLoading } = useWalletList();
  const createWallet = useCreateWallet();

  const [view, setView] = useState<ModalView>(defaultView);
  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState<SupportedCurrency>('BRL');
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setView(defaultView);
      setNewName('');
      if (defaultView === 'create') {
        setTimeout(() => nameInputRef.current?.focus(), 200);
      }
    }
  }, [visible, defaultView]);

  const backgroundColor = useThemeColor({}, 'modalBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const positiveColor = useThemeColor({}, 'positive');
  const inputBackground = useThemeColor({}, 'surfaceMuted');

  const currencyOptions = useMemo(
    () =>
      SUPPORTED_CURRENCIES.map((code) => ({
        value: code,
        label: t(`settings.currencies.${code}`),
      })),
    [t],
  );

  const atLimit = wallets.length >= FREE_TIER_LIMIT;

  function handleClose() {
    setView('list');
    setNewName('');
    onClose();
  }

  function handleSwitch(id: string) {
    switchWallet(id);
    handleClose();
    router.navigate('/(tabs)/(status)');
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name || createWallet.isPending) return;
    const newId = await createWallet.mutateAsync({ name, currency: newCurrency });
    switchWallet(newId);
    setView('list');
    setNewName('');
  }

  const canCreate = newName.trim().length > 0 && !createWallet.isPending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={[styles.sheet, { backgroundColor, borderColor }]}>
          {/* Header */}
          <View style={styles.header}>
            {view === 'create' ? (
              <Pressable
                onPress={() => {
                  setView('list');
                  setNewName('');
                }}
                hitSlop={8}
              >
                <Text variant="caption" weight="medium" style={{ color: mutedColor }}>
                  ← {t('common.back')}
                </Text>
              </Pressable>
            ) : (
              <View style={{ width: 48 }} />
            )}
            <Text variant="subtitle" weight="semibold">
              {view === 'create' ? t('wallets.createTitle') : t('wallets.modalTitle')}
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={{ width: 48, alignItems: 'flex-end' }}
            >
              <Text variant="caption" weight="medium" style={{ color: mutedColor }}>
                {t('common.done')}
              </Text>
            </Pressable>
          </View>

          {/* List view */}
          {view === 'list' && (
            <>
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {isLoading ? (
                  <Text
                    variant="caption"
                    tone="textMuted"
                    style={{ textAlign: 'center', paddingVertical: 24 }}
                  >
                    {t('common.loading')}
                  </Text>
                ) : (
                  wallets.map((wallet) => (
                    <WalletItem
                      key={wallet.id}
                      wallet={wallet}
                      isActive={wallet.id === walletId}
                      onSwitch={handleSwitch}
                    />
                  ))
                )}
              </ScrollView>

              <Pressable
                onPress={() => {
                  if (atLimit) return;
                  setView('create');
                  setNewCurrency('BRL');
                  setTimeout(() => nameInputRef.current?.focus(), 150);
                }}
                disabled={atLimit}
                style={({ pressed }) => [
                  styles.createBtn,
                  { borderColor, opacity: atLimit ? 0.4 : pressed ? 0.7 : 1 },
                ]}
              >
                <Text
                  variant="body"
                  weight="medium"
                  style={{ color: atLimit ? mutedColor : positiveColor }}
                >
                  {atLimit ? t('wallets.freeTierLimit') : `+ ${t('wallets.createTitle')}`}
                </Text>
              </Pressable>
            </>
          )}

          {/* Create view */}
          {view === 'create' && (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.createForm}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.field}>
                <Text variant="caption" tone="textMuted" weight="medium" style={styles.fieldLabel}>
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
                <Text variant="caption" tone="textMuted" weight="medium" style={styles.fieldLabel}>
                  {t('settings.currencyRow.title').toUpperCase()}
                </Text>
                <SortMenu<SupportedCurrency>
                  options={currencyOptions}
                  value={newCurrency}
                  onChange={setNewCurrency}
                />
              </View>

              <View style={styles.formActions}>
                <Pressable
                  onPress={() => {
                    setView('list');
                    setNewName('');
                  }}
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    { borderColor, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text variant="body" weight="medium" style={{ color: mutedColor }}>
                    {t('common.cancel')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  disabled={!canCreate}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    {
                      backgroundColor: positiveColor,
                      opacity: canCreate ? (pressed ? 0.8 : 1) : 0.4,
                    },
                  ]}
                >
                  <Text variant="body" weight="semibold" style={styles.saveBtnLabel}>
                    {createWallet.isPending ? t('common.saving') : t('common.create')}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
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
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 8,
  },
  createBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  createForm: {
    paddingHorizontal: 20,
    gap: 20,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    letterSpacing: 0.8,
  },
  input: {
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  formActions: {
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
