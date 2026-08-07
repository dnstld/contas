import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { CategoryFields } from '@/components/categories/category-fields';
import { SegmentedControl } from '@/components/ui/atoms/segmented-control';
import { ModalActions } from '@/components/ui/molecules/modal-actions';
import { ModalFormScaffold } from '@/components/ui/templates/modal-form-scaffold';
import type { TransactionType } from '@/data/finance-types';
import {
  isCategoryHasTransactionsError,
  useArchiveCategory,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/use-finance-mutations';
import { useCategories } from '@/hooks/use-finance-queries';
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
  const isArchived = !!editCategory?.archivedAt;

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

  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: archiveCategory, isPending: isArchiving } = useArchiveCategory();
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();
  const isPending = isCreating || isUpdating || isArchiving || isDeleting;

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

  const handleArchiveToggle = () => {
    if (!editCategory || isPending) return;
    const archived = !isArchived;
    archiveCategory(
      { id: editCategory.id, archived },
      {
        onSuccess: (updated) => {
          toast.success(
            archived ? t('feedback.categoryArchived') : t('feedback.categoryUnarchived'),
          );
          categoryFormBridge.emit(bridgeId, 'archived', updated.id);
          router.back();
        },
      },
    );
  };

  const handleDelete = () => {
    if (!editCategory || isPending) return;
    Alert.alert(t('category.edit.deleteConfirmTitle'), t('category.edit.deleteConfirmMessage'), [
      { text: t('category.edit.deleteConfirmCancel'), style: 'cancel' },
      {
        text: t('category.edit.deleteConfirmAction'),
        style: 'destructive',
        onPress: performDelete,
      },
    ]);
  };

  // In edit mode, only allow saving when something actually changed.
  const originalBudgetCents =
    editCategory?.monthlyBudget != null ? Math.round(editCategory.monthlyBudget * 100) : 0;
  const isDirty =
    !isEdit ||
    name.trim() !== (editCategory?.name ?? '').trim() ||
    budgetCents !== originalBudgetCents;

  const canSave = name.trim().length > 0 && isDirty && !isPending;

  return (
    <>
      <Stack.Screen
        options={{ headerTitle: isEdit ? t('category.edit.title') : t('category.create.title') }}
      />
      <ModalFormScaffold
        footer={
          <ModalActions
            primary={{
              label: isEdit ? t('category.edit.saveButton') : t('category.create.createButton'),
              onPress: handleSave,
              loading: isCreating || isUpdating,
              disabled: !canSave,
            }}
            secondary={
              isEdit
                ? [
                    {
                      label: isArchived ? t('category.edit.unarchive') : t('category.edit.archive'),
                      onPress: handleArchiveToggle,
                      tone: 'muted',
                      loading: isArchiving,
                      // Disable while there are unsaved edits: archiving discards
                      // the pending changes silently, so require Save/discard first.
                      disabled: isDirty || (isPending && !isArchiving),
                    },
                    {
                      label: t('category.edit.delete'),
                      onPress: handleDelete,
                      tone: 'destructive',
                      loading: isDeleting,
                      disabled: isPending && !isDeleting,
                    },
                  ]
                : undefined
            }
            warning={deleteWarning}
          />
        }
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
      </ModalFormScaffold>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
});
