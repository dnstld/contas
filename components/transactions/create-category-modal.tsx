import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text as RNText, TextInput, View } from 'react-native';

import { ModalSheet } from '@/components/ui/molecules/modal-sheet';
import { Text } from '@/components/ui/atoms/text';
import type { TransactionType } from '@/components/transactions/transaction-form';
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  isCategoryHasTransactionsError,
} from '@/hooks/use-finance-mutations';
import { useFormatters } from '@/hooks/use-formatters';
import { useCategories } from '@/hooks/use-finance-queries';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useWallet } from '@/hooks/use-wallet';
import { Fonts } from '@/constants/theme';
import { CATEGORY_NAME_MAX_LENGTH } from '@/constants/limits';

export interface CategoryFormModalProps {
  visible: boolean;
  type: TransactionType;
  editCategory?: { id: string; name: string; monthlyBudget?: number };
  onCreated: (categoryId: string) => void;
  onDeleted?: (categoryId: string) => void;
  onClose: () => void;
}

export function CategoryFormModal({
  visible,
  type,
  editCategory,
  onCreated,
  onDeleted,
  onClose,
}: CategoryFormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!editCategory;

  const [name, setName] = useState('');
  const [budgetCents, setBudgetCents] = useState(0);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const nameInputRef = useRef<TextInput>(null);

  const { currency } = useWallet();
  const { formatDecimal, currencySymbol } = useFormatters();
  const symbol = currencySymbol(currency);

  const {
    text: textColor,
    textMuted: mutedColor,
    border: borderColor,
    accent: accentColor,
    danger: dangerColor,
    inputBackground,
    onPrimary,
  } = useModalChrome();

  const { data: allCategories = [] } = useCategories();
  const isLastOfType = allCategories.filter((c) => c.type === type).length <= 1;

  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();

  const isPending = isCreating || isUpdating || isDeleting;

  useEffect(() => {
    if (visible) {
      setName(editCategory?.name ?? '');
      setBudgetCents(
        editCategory?.monthlyBudget != null ? Math.round(editCategory.monthlyBudget * 100) : 0,
      );
      setDeleteWarning(null);
      if (!isEdit) setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [visible, editCategory?.name, editCategory?.monthlyBudget, isEdit]);

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
        { onSuccess: () => onClose() },
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
            onCreated(data.id);
            onClose();
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
        onDeleted?.(id);
        onClose();
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
    <ModalSheet visible={visible} onRequestClose={onClose} animationType="fade">
      <View style={styles.sheetInner}>
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

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text variant="body" weight="medium" style={{ color: mutedColor }}>
                {t('category.create.cancel')}
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
              <Text variant="body" weight="semibold" style={{ color: onPrimary }}>
                {isEdit
                  ? isUpdating
                    ? t('category.edit.saving')
                    : t('category.edit.saveButton')
                  : isCreating
                    ? t('category.create.creating')
                    : t('category.create.createButton')}
              </Text>
            </Pressable>
          </View>

          {isEdit && !isLastOfType ? (
            <View style={styles.deleteSection}>
              {deleteWarning ? (
                <Text variant="caption" style={[styles.deleteWarning, { color: dangerColor }]}>
                  {deleteWarning}
                </Text>
              ) : null}
              <Pressable
                onPress={handleDelete}
                disabled={isPending}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  {
                    borderColor: dangerColor,
                    backgroundColor: pressed ? `${dangerColor}14` : 'transparent',
                    opacity: isPending ? 0.5 : 1,
                  },
                ]}
              >
                <Text variant="body" weight="medium" style={{ color: dangerColor }}>
                  {isDeleting ? t('category.edit.deleting') : t('category.edit.delete')}
                </Text>
              </Pressable>
            </View>
          ) : null}
      </View>
    </ModalSheet>
  );
}

// Keep legacy export so existing import in transaction-form.tsx keeps working
// until we update it in the next step.
export const CreateCategoryModal = CategoryFormModal;
export type CreateCategoryModalProps = CategoryFormModalProps;

const styles = StyleSheet.create({
  sheetInner: {
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
  deleteSection: {
    gap: 8,
    marginTop: -4,
  },
  deleteWarning: {
    textAlign: 'center',
  },
  deleteBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
