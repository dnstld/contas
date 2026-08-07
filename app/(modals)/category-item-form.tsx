import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { CurrencyInput } from '@/components/ui/atoms/currency-input';
import { DatePicker } from '@/components/ui/atoms/date-picker';
import { SegmentedControl } from '@/components/ui/atoms/segmented-control';
import { Text } from '@/components/ui/atoms/text';
import { ModalActions } from '@/components/ui/molecules/modal-actions';
import { ModalFormScaffold } from '@/components/ui/templates/modal-form-scaffold';
import { ITEM_NAME_MAX_LENGTH } from '@/constants/limits';
import { Fonts } from '@/constants/theme';
import { parseDayStart, toDayString, type Recurrence } from '@/data/finance-types';
import {
  isCategoryItemInUseError,
  useArchiveCategoryItem,
  useCreateCategoryItem,
  useDeleteCategoryItem,
  useUpdateCategoryItem,
} from '@/hooks/use-category-item-mutations';
import { useCategoryItems } from '@/hooks/use-finance-queries';
import { useFormatters } from '@/hooks/use-formatters';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useNow } from '@/hooks/use-now';
import { useWallet } from '@/hooks/use-wallet';
import { nextAmountCents } from '@/utils/amount-input';
import { categoryItemFormBridge } from '@/utils/modal-bridge';
import { toast } from '@/utils/toast';

const RECURRENCE_ORDER: Recurrence[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

export default function CategoryItemFormScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const now = useNow();
  const { currency } = useWallet();
  const { formatAmount } = useFormatters();
  const { text: textColor, textMuted: mutedColor, inputBackground } = useModalChrome();

  const params = useLocalSearchParams<{ categoryId: string; bridgeId: string; editId?: string }>();
  const categoryId = params.categoryId;
  const bridgeId = params.bridgeId;
  const editId = params.editId ?? null;
  const isEdit = !!editId;

  const { data: allItems = [] } = useCategoryItems();
  const editItem = isEdit ? (allItems.find((it) => it.id === editId) ?? null) : null;
  const isArchived = !!editItem?.archivedAt;

  const [name, setName] = useState(editItem?.name ?? '');
  const [amountCents, setAmountCents] = useState(
    editItem?.defaultAmount != null ? Math.round(editItem.defaultAmount * 100) : 0,
  );
  const [recurrence, setRecurrence] = useState<Recurrence>(editItem?.recurrence ?? 'none');
  const [nextDue, setNextDue] = useState<Date>(
    editItem?.nextDueOn ? parseDayStart(editItem.nextDueOn) : now,
  );
  const [inUseWarning, setInUseWarning] = useState<string | null>(null);

  const nameInputRef = useRef<TextInput>(null);
  const hasHydratedEdit = useRef(false);

  // Hydrate the form once the edited item resolves from the query cache (it may
  // load async on a cold start), mirroring `category-form`.
  useEffect(() => {
    if (isEdit && editItem && !hasHydratedEdit.current) {
      hasHydratedEdit.current = true;
      setName(editItem.name);
      setAmountCents(editItem.defaultAmount != null ? Math.round(editItem.defaultAmount * 100) : 0);
      setRecurrence(editItem.recurrence);
      setNextDue(editItem.nextDueOn ? parseDayStart(editItem.nextDueOn) : now);
    }
  }, [isEdit, editItem, now]);

  useEffect(() => {
    if (!isEdit) {
      const handle = setTimeout(() => nameInputRef.current?.focus(), 250);
      return () => clearTimeout(handle);
    }
  }, [isEdit]);

  const { mutate: createItem, isPending: isCreating } = useCreateCategoryItem();
  const { mutate: updateItem, isPending: isUpdating } = useUpdateCategoryItem();
  const { mutate: archiveItem, isPending: isArchiving } = useArchiveCategoryItem();
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteCategoryItem();
  const isPending = isCreating || isUpdating || isArchiving || isDeleting;

  const recurrenceOptions = useMemo(
    () =>
      RECURRENCE_ORDER.map((value) => ({
        value,
        label: t(`categoryItemForm.recurrence.${value}`),
      })),
    [t],
  );

  const formattedAmount = formatAmount(amountCents / 100, currency);
  const handleAmountChange = (value: string) => {
    setAmountCents(nextAmountCents(amountCents, formattedAmount, value));
  };

  const canSave = name.trim().length > 0 && !isPending;

  // In edit mode, whether the form differs from the persisted item. Archiving
  // ignores field edits, so we disable it while dirty to avoid silently
  // discarding them (mirrors the category form).
  const originalAmountCents =
    editItem?.defaultAmount != null ? Math.round(editItem.defaultAmount * 100) : 0;
  const isDirty =
    !isEdit ||
    name.trim() !== (editItem?.name ?? '').trim() ||
    amountCents !== originalAmountCents ||
    recurrence !== (editItem?.recurrence ?? 'none') ||
    (recurrence !== 'none' && toDayString(nextDue) !== (editItem?.nextDueOn ?? ''));

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed || isPending) return;
    const shared = {
      name: trimmed,
      recurrence,
      ...(amountCents > 0 && { defaultAmountCents: amountCents }),
      ...(recurrence !== 'none' && { nextDueOn: toDayString(nextDue) }),
    };
    if (isEdit && editItem) {
      updateItem(
        { id: editItem.id, ...shared },
        {
          onSuccess: (updated) => {
            toast.success(t('feedback.categoryItemUpdated'));
            categoryItemFormBridge.emit(bridgeId, 'changed', updated.id);
            router.back();
          },
        },
      );
    } else {
      createItem(
        { categoryId, ...shared },
        {
          onSuccess: (created) => {
            toast.success(t('feedback.categoryItemCreated'));
            categoryItemFormBridge.emit(bridgeId, 'changed', created.id);
            router.back();
          },
        },
      );
    }
  };

  const handleArchiveToggle = () => {
    if (!editItem || isPending) return;
    const archived = !isArchived;
    archiveItem(
      { id: editItem.id, archived },
      {
        onSuccess: (updated) => {
          toast.success(
            archived ? t('feedback.categoryItemArchived') : t('feedback.categoryItemUnarchived'),
          );
          categoryItemFormBridge.emit(bridgeId, 'changed', updated.id);
          categoryItemFormBridge.emit(bridgeId, 'archived', { id: updated.id, archived });
          router.back();
        },
      },
    );
  };

  const performDelete = () => {
    if (!editItem || isPending) return;
    setInUseWarning(null);
    deleteItem(editItem.id, {
      onSuccess: (id) => {
        toast.success(t('feedback.categoryItemDeleted'));
        categoryItemFormBridge.emit(bridgeId, 'changed', id);
        router.back();
      },
      onError: (err) => {
        if (isCategoryItemInUseError(err)) {
          setInUseWarning(t('categoryItemForm.inUseWarning', { count: err.transactionCount }));
        }
      },
    });
  };

  const handleDelete = () => {
    if (!editItem || isPending) return;
    Alert.alert(
      t('categoryItemForm.deleteConfirmTitle'),
      t('categoryItemForm.deleteConfirmMessage'),
      [
        { text: t('categoryItemForm.deleteConfirmCancel'), style: 'cancel' },
        {
          text: t('categoryItemForm.deleteConfirmAction'),
          style: 'destructive',
          onPress: performDelete,
        },
      ],
    );
  };

  return (
    <ModalFormScaffold
      footer={
        <ModalActions
          primary={{
            label: t('categoryItemForm.save'),
            onPress: handleSave,
            loading: isCreating || isUpdating,
            disabled: !canSave,
          }}
          secondary={
            isEdit
              ? [
                  {
                    label: isArchived
                      ? t('categoryItemForm.unarchive')
                      : t('categoryItemForm.archive'),
                    onPress: handleArchiveToggle,
                    tone: 'muted',
                    loading: isArchiving,
                    disabled: isDirty || (isPending && !isArchiving),
                  },
                  {
                    label: t('categoryItemForm.delete'),
                    onPress: handleDelete,
                    tone: 'destructive',
                    loading: isDeleting,
                    disabled: isPending && !isDeleting,
                  },
                ]
              : undefined
          }
          warning={inUseWarning}
        />
      }
    >
      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('categoryItemForm.nameLabel').toUpperCase()}
        </Text>
        <TextInput
          ref={nameInputRef}
          value={name}
          onChangeText={setName}
          placeholder={t('categoryItemForm.namePlaceholder')}
          placeholderTextColor={mutedColor}
          maxLength={ITEM_NAME_MAX_LENGTH}
          returnKeyType="next"
          accessibilityLabel={t('categoryItemForm.nameLabel')}
          style={[
            styles.fieldInput,
            { color: textColor, backgroundColor: inputBackground, fontFamily: Fonts.sans },
          ]}
        />
      </View>

      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('categoryItemForm.amountLabel').toUpperCase()}
        </Text>
        <CurrencyInput
          currency={currency}
          symbolColor={mutedColor}
          value={formattedAmount}
          onChangeText={handleAmountChange}
          keyboardType="number-pad"
          inputMode="numeric"
          returnKeyType="done"
          accessibilityLabel={t('categoryItemForm.amountLabel')}
          containerStyle={{ backgroundColor: inputBackground }}
          inputStyle={{ color: amountCents > 0 ? textColor : mutedColor, fontFamily: Fonts.sans }}
        />
        <Text variant="caption" tone="textMuted">
          {t('categoryItemForm.amountCaption')}
        </Text>
      </View>

      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('categoryItemForm.recurrenceLabel').toUpperCase()}
        </Text>
        <SegmentedControl<Recurrence>
          options={recurrenceOptions}
          value={recurrence}
          onChange={setRecurrence}
        />
      </View>

      {recurrence !== 'none' ? (
        <View style={styles.field}>
          <DatePicker
            value={nextDue}
            onValueChange={setNextDue}
            title={t('categoryItemForm.nextDueLabel')}
          />
        </View>
      ) : null}
    </ModalFormScaffold>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { letterSpacing: 0.8 },
  fieldInput: {
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});
