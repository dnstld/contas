import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';
import Transition from 'react-native-screen-transitions';

import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import type { TransactionType } from '@/data/finance-types';
import { CATEGORY_NAME_MAX_LENGTH } from '@/constants/limits';
import { Fonts } from '@/constants/theme';
import {
  isCategoryHasTransactionsError,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/use-finance-mutations';
import { useCategories } from '@/hooks/use-finance-queries';
import { useFormatters } from '@/hooks/use-formatters';
import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';
import { categoryFormBridge } from '@/utils/modal-bridge';

export default function CategoryFormScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    type: TransactionType;
    bridgeId: string;
    editId?: string;
  }>();

  const type = params.type;
  const bridgeId = params.bridgeId;
  const editId = params.editId ?? null;
  const isEdit = !!editId;

  const { data: allCategories = [] } = useCategories();
  const editCategory = isEdit ? (allCategories.find((c) => c.id === editId) ?? null) : null;

  const isLastOfType = allCategories.filter((c) => c.type === type).length <= 1;

  const { currency } = useWallet();
  const { formatDecimal, currencySymbol } = useFormatters();
  const symbol = currencySymbol(currency);

  const bottomPadding = useModalBottomPadding();
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const {
    text: textColor,
    textMuted: mutedColor,
    border: borderColor,
    danger: dangerColor,
    inputBackground,
  } = useModalChrome();

  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();
  const isPending = isCreating || isUpdating || isDeleting;

  const [name, setName] = useState(editCategory?.name ?? '');
  const [budgetCents, setBudgetCents] = useState(
    editCategory?.monthlyBudget != null ? Math.round(editCategory.monthlyBudget * 100) : 0,
  );
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const nameInputRef = useRef<TextInput>(null);
  const hasHydratedEdit = useRef(false);

  useEffect(() => {
    if (isEdit && editCategory && !hasHydratedEdit.current) {
      hasHydratedEdit.current = true;
      setName(editCategory.name);
      setBudgetCents(
        editCategory.monthlyBudget != null ? Math.round(editCategory.monthlyBudget * 100) : 0,
      );
    }
  }, [isEdit, editCategory]);

  useEffect(() => {
    if (!isEdit) {
      const handle = setTimeout(() => nameInputRef.current?.focus(), 250);
      return () => clearTimeout(handle);
    }
  }, [isEdit]);

  const handleBudgetChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length === 0) {
      setBudgetCents(0);
      return;
    }
    const parsed = Number.parseInt(digits, 10);
    if (Number.isFinite(parsed)) setBudgetCents(parsed);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed || isPending) return;
    if (isEdit && editCategory) {
      updateCategory(
        {
          id: editCategory.id,
          name: trimmed,
          ...(budgetCents > 0 && { monthlyBudgetCents: budgetCents }),
        },
        { onSuccess: () => router.back() },
      );
    } else {
      createCategory(
        {
          name: trimmed,
          type,
          ...(budgetCents > 0 && { monthlyBudgetCents: budgetCents }),
        },
        {
          onSuccess: (data) => {
            categoryFormBridge.emit(bridgeId, 'created', data.id);
            router.back();
          },
        },
      );
    }
  };

  const handleDelete = () => {
    if (!editCategory || isPending) return;
    setDeleteWarning(null);
    deleteCategory(editCategory.id, {
      onSuccess: (id) => {
        categoryFormBridge.emit(bridgeId, 'deleted', id);
        router.back();
      },
      onError: (err) => {
        if (isCategoryHasTransactionsError(err)) {
          setDeleteWarning(t('category.edit.hasTransactions', { count: err.transactionCount }));
        }
      },
    });
  };

  const canSave = name.trim().length > 0 && !isPending;
  const formattedBudget = formatDecimal(budgetCents / 100);

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
          <Text variant="subtitle" weight="semibold" style={[styles.title, { color: textColor }]}>
            {isEdit ? t('category.edit.title') : t('category.create.title')}
          </Text>

          <View style={styles.field}>
            <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
              {t('category.create.nameLabel').toUpperCase()}
            </Text>
            <TextInput
              ref={nameInputRef}
              value={name}
              onChangeText={setName}
              placeholder={t('category.create.namePlaceholder')}
              placeholderTextColor={mutedColor}
              maxLength={CATEGORY_NAME_MAX_LENGTH}
              returnKeyType="next"
              style={[
                styles.fieldInput,
                { color: textColor, backgroundColor: inputBackground, fontFamily: Fonts.sans },
              ]}
            />
            <Text variant="caption" tone="textMuted">
              {t('category.create.nameCaption')}
            </Text>
          </View>

          <View style={styles.field}>
            <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
              {t('category.create.budgetLabel').toUpperCase()}
            </Text>
            <View style={[styles.budgetRow, { backgroundColor: inputBackground }]}>
              <RNText style={[styles.budgetSymbol, { color: mutedColor, fontFamily: Fonts.sans }]}>
                {symbol}
              </RNText>
              <TextInput
                value={formattedBudget}
                onChangeText={handleBudgetChange}
                keyboardType="number-pad"
                inputMode="numeric"
                returnKeyType="done"
                onSubmitEditing={handleSave}
                style={[
                  styles.budgetInput,
                  { color: budgetCents > 0 ? textColor : mutedColor, fontFamily: Fonts.sans },
                ]}
              />
            </View>
            <Text variant="caption" tone="textMuted">
              {t('category.create.budgetCaption')}
            </Text>
          </View>
        </Transition.ScrollView>

        <View style={[styles.footer, { borderTopColor: borderColor }]}>
          <PressableButton
            label={isEdit ? t('category.edit.saveButton') : t('category.create.createButton')}
            variant="primary"
            size="large"
            loading={isCreating || isUpdating}
            disabled={!canSave}
            onPress={handleSave}
          />

          {isEdit && !isLastOfType ? (
            <View style={styles.deleteWrap}>
              {deleteWarning ? (
                <Text variant="caption" style={[styles.deleteWarning, { color: dangerColor }]}>
                  {deleteWarning}
                </Text>
              ) : null}
              <PressableButton
                label={t('category.edit.delete')}
                variant="destructive"
                size="large"
                loading={isDeleting}
                disabled={isPending && !isDeleting}
                onPress={handleDelete}
              />
            </View>
          ) : null}
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
  fieldInput: {
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  budgetSymbol: {
    fontSize: 15,
    lineHeight: 21,
    includeFontPadding: false,
  },
  budgetInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    padding: 0,
    textAlignVertical: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deleteWrap: {
    marginTop: 12,
    gap: 8,
  },
  deleteWarning: {
    textAlign: 'center',
  },
});
