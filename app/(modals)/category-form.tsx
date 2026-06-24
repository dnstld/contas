import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { CategoryFields } from '@/components/categories/category-fields';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { SegmentedControl } from '@/components/ui/atoms/segmented-control';
import { Text } from '@/components/ui/atoms/text';
import type { TransactionType } from '@/data/finance-types';
import {
  isCategoryHasTransactionsError,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/use-finance-mutations';
import { useDemoMode } from '@/hooks/use-demo-mode';
import { useCategories } from '@/hooks/use-finance-queries';
import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useThemeColor } from '@/hooks/use-theme-color';
import { categoryFormBridge } from '@/utils/modal-bridge';
import { toast } from '@/utils/toast';

export default function CategoryFormScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    type?: TransactionType;
    bridgeId: string;
    editId?: string;
    prefillName?: string;
  }>();

  const bridgeId = params.bridgeId;
  const editId = params.editId ?? null;
  const isEdit = !!editId;
  const prefillName = params.prefillName ?? null;

  const { data: allCategories = [] } = useCategories();
  const editCategory = isEdit ? (allCategories.find((c) => c.id === editId) ?? null) : null;

  const paramType = params.type ?? null;
  const [pickedType, setPickedType] = useState<TransactionType>(paramType ?? 'expense');
  const type: TransactionType = editCategory?.type ?? paramType ?? pickedType;
  const showTypePicker = !isEdit && paramType === null;

  const typeOptions = useMemo(
    () => [
      { value: 'expense' as const, label: t('create.types.expense') },
      { value: 'income' as const, label: t('create.types.income') },
    ],
    [t],
  );

  const bottomPadding = useModalBottomPadding();
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const { border: borderColor, danger: dangerColor } = useModalChrome();

  const { enabled: demoMode } = useDemoMode();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();
  const isPending = isCreating || isUpdating || isDeleting;

  const [name, setName] = useState(editCategory?.name ?? prefillName ?? '');
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
        {
          onSuccess: () => {
            toast.success(t('feedback.categoryUpdated'));
            router.back();
          },
        },
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
            toast.success(t('feedback.categoryCreated'));
            categoryFormBridge.emit(bridgeId, 'created', data.id);
            router.back();
          },
        },
      );
    }
  };

  const performDelete = () => {
    if (!editCategory || isPending) return;
    setDeleteWarning(null);
    deleteCategory(editCategory.id, {
      onSuccess: (id) => {
        toast.success(t('feedback.categoryDeleted'));
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

  const handleDelete = () => {
    if (!editCategory || isPending) return;
    Alert.alert(
      t('category.edit.deleteConfirmTitle'),
      t('category.edit.deleteConfirmMessage'),
      [
        { text: t('category.edit.deleteConfirmCancel'), style: 'cancel' },
        {
          text: t('category.edit.deleteConfirmAction'),
          style: 'destructive',
          onPress: performDelete,
        },
      ],
    );
  };

  // In edit mode, only allow saving when something actually changed.
  const originalBudgetCents =
    editCategory?.monthlyBudget != null ? Math.round(editCategory.monthlyBudget * 100) : 0;
  const isDirty =
    !isEdit ||
    name.trim() !== (editCategory?.name ?? '').trim() ||
    budgetCents !== originalBudgetCents;

  const canSave = name.trim().length > 0 && isDirty && !isPending && !demoMode;

  return (
    <View style={[styles.root, { backgroundColor, paddingBottom: bottomPadding }]}>
      <Stack.Screen
        options={{ headerTitle: isEdit ? t('category.edit.title') : t('category.create.title') }}
      />
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
          {showTypePicker ? (
            <View style={styles.field}>
              <SegmentedControl options={typeOptions} value={pickedType} onChange={setPickedType} />
            </View>
          ) : null}

          <CategoryFields
            name={name}
            onNameChange={setName}
            budgetCents={budgetCents}
            onBudgetChange={setBudgetCents}
            nameInputRef={nameInputRef}
            onSubmitBudget={handleSave}
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: borderColor }]}>
          {isEdit && deleteWarning ? (
            <Text variant="caption" style={[styles.deleteWarning, { color: dangerColor }]}>
              {deleteWarning}
            </Text>
          ) : null}

          <View style={styles.actionRow}>
            {isEdit ? (
              <View style={styles.actionItem}>
                <PressableButton
                  label={t('category.edit.delete')}
                  variant="destructive"
                  size="large"
                  loading={isDeleting}
                  disabled={(isPending && !isDeleting) || demoMode}
                  onPress={handleDelete}
                />
              </View>
            ) : null}
            <View style={styles.actionItem}>
              <PressableButton
                label={isEdit ? t('category.edit.saveButton') : t('category.create.createButton')}
                variant="primary"
                size="large"
                loading={isCreating || isUpdating}
                disabled={!canSave}
                onPress={handleSave}
              />
            </View>
          </View>
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
  field: {
    gap: 6,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionItem: {
    flex: 1,
  },
  deleteWarning: {
    textAlign: 'center',
    marginBottom: 12,
  },
});
