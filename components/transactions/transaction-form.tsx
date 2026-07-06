import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { categorySelectHref } from '@/constants/routes';
import { nextAmountCents } from '@/utils/amount-input';
import { categoryFormBridge, makeBridgeId } from '@/utils/modal-bridge';
import { Chip } from '@/components/ui/atoms/chip';
import { CurrencyInput } from '@/components/ui/atoms/currency-input';
import { DatePicker } from '@/components/ui/atoms/date-picker';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/atoms/segmented-control';
import { Text } from '@/components/ui/atoms/text';
import { ModalFormScaffold } from '@/components/ui/templates/modal-form-scaffold';
import { CategorySelect } from '@/components/ui/organisms/category-select';
import { Fonts } from '@/constants/theme';
import { MOST_USED_CATEGORIES_LIMIT, rankCategoriesByUsage } from '@/data/finance-aggregations';
import { useCategories, useTransactions } from '@/hooks/use-finance-queries';
import { useFormatters } from '@/hooks/use-formatters';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';
import { TRANSACTION_DESCRIPTION_MAX_LENGTH } from '@/constants/limits';

export type TransactionType = 'expense' | 'income';

export type TransactionFormValues = {
  type: TransactionType;
  amountCents: number;
  date: Date;
  categoryId: string | null;
  description: string;
};

export interface TransactionFormProps {
  initialValues?: Partial<TransactionFormValues>;
  onSubmit: (values: TransactionFormValues) => void;
  onDelete?: () => void;
  submitLabel?: string;
  deleteLabel?: string;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  errorMessage?: string | null;
}

export function TransactionForm({
  initialValues,
  onSubmit,
  onDelete,
  submitLabel,
  deleteLabel,
  isSubmitting = false,
  isDeleting = false,
  errorMessage = null,
}: TransactionFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const { currency } = useWallet();
  const { formatAmount } = useFormatters();
  // Stable per-mount id. Lazy useState avoids react-hooks/refs (no `.current`
  // access during render) and gives us a one-time value identical to a ref.
  const [bridgeId] = useState(() => makeBridgeId());

  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const dangerColor = useThemeColor({}, 'negative');
  const surfaceMutedColor = useThemeColor({}, 'surfaceMuted');

  const [type, setType] = useState<TransactionType>(initialValues?.type ?? 'expense');
  const [amountCents, setAmountCents] = useState<number>(initialValues?.amountCents ?? 0);
  const [date, setDate] = useState<Date>(initialValues?.date ?? new Date());
  const [categoryId, setCategoryId] = useState<string | null>(initialValues?.categoryId ?? null);
  const [description, setDescription] = useState<string>(initialValues?.description ?? '');

  useEffect(() => {
    return categoryFormBridge.subscribe(bridgeId, {
      created: (id) => setCategoryId(id),
      deleted: (id) => setCategoryId((current) => (current === id ? null : current)),
      selected: (id) => setCategoryId(id),
    });
  }, [bridgeId]);

  const typeOptions: SegmentedOption<TransactionType>[] = useMemo(
    () => [
      { value: 'expense', label: t('create.types.expense') },
      { value: 'income', label: t('create.types.income') },
    ],
    [t],
  );

  const selectedCategoryName = categoryId
    ? (categories.find((c) => c.id === categoryId)?.name ?? null)
    : null;

  // Top 5 most-used categories of the current type, for quick selection. Shares
  // the ranking with the category picker's "Most used" group so both surfaces
  // always agree. When there's no usage data yet for this type (fresh wallet,
  // or this type just hasn't been used), fall back to the first 5 categories
  // alphabetically (the "rest" list is already alpha-sorted when nothing has
  // usage) rather than hiding the row entirely.
  const topCategories = useMemo(() => {
    const { mostUsed, rest } = rankCategoriesByUsage(categories, transactions, type);
    return mostUsed.length > 0 ? mostUsed : rest.slice(0, MOST_USED_CATEGORIES_LIMIT);
  }, [categories, transactions, type]);

  const formattedAmount = formatAmount(amountCents / 100, currency);

  const handleAmountChange = (text: string) => {
    setAmountCents(nextAmountCents(amountCents, formattedAmount, text));
  };

  const handleTypeChange = (next: TransactionType) => {
    setType(next);
    setCategoryId(null);
  };

  const openCategorySelect = () =>
    router.push(categorySelectHref({ type, bridgeId, selectedId: categoryId ?? undefined }));

  const busy = isSubmitting || isDeleting;
  const canSubmit = amountCents > 0 && categoryId !== null && !busy;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      type,
      amountCents,
      date,
      categoryId,
      description,
    });
  };

  return (
    <ModalFormScaffold
      footer={
        <>
          {errorMessage ? (
            <View
              style={[
                styles.errorBanner,
                { borderColor: dangerColor, backgroundColor: `${dangerColor}14` },
              ]}
            >
              <Text variant="caption" style={{ color: dangerColor }}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            {onDelete ? (
              <View style={styles.actionItem}>
                <PressableButton
                  label={deleteLabel ?? t('edit.delete')}
                  variant="destructive"
                  size="large"
                  loading={isDeleting}
                  disabled={busy && !isDeleting}
                  onPress={onDelete}
                />
              </View>
            ) : null}
            <View style={styles.actionItem}>
              <PressableButton
                label={submitLabel ?? t('create.save')}
                variant="primary"
                size="large"
                loading={isSubmitting}
                disabled={!canSubmit}
                onPress={handleSubmit}
              />
            </View>
          </View>
        </>
      }
    >
      <View style={styles.typeSelector}>
        <SegmentedControl<TransactionType>
          options={typeOptions}
          value={type}
          onChange={handleTypeChange}
        />
      </View>

      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('create.dateLabel').toUpperCase()}
        </Text>
        <DatePicker value={date} onValueChange={setDate} />
      </View>

      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('create.amountPlaceholder').toUpperCase()}
        </Text>
        <CurrencyInput
          currency={currency}
          symbolColor={mutedColor}
          value={formattedAmount}
          onChangeText={handleAmountChange}
          keyboardType="number-pad"
          inputMode="numeric"
          accessibilityLabel={t('create.amountPlaceholder')}
          selectionColor={textColor}
          containerStyle={{ backgroundColor: surfaceMutedColor }}
          inputStyle={{ color: amountCents > 0 ? textColor : mutedColor, fontFamily: Fonts.sans }}
        />
      </View>

      <View style={styles.field}>
        <CategorySelect
          title={type === 'income' ? t('category.section.income') : t('category.section.expenses')}
          selectedLabel={selectedCategoryName}
          placeholder={t('categorySelect.placeholder')}
          onPress={openCategorySelect}
        />
        {topCategories.length > 0 ? (
          <View style={styles.chipRow}>
            {topCategories.map((c) => {
              const selected = categoryId === c.id;
              return (
                <Chip
                  key={c.id}
                  label={c.name}
                  variant={selected ? 'secondary' : 'default'}
                  selected={selected}
                  onPress={() => setCategoryId(c.id)}
                />
              );
            })}
            <Chip
              label={t('categorySelect.groups.all')}
              variant="primary"
              accent
              onPress={openCategorySelect}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('create.descriptionLabel').toUpperCase()}
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          maxLength={TRANSACTION_DESCRIPTION_MAX_LENGTH}
          placeholder={t('create.descriptionPlaceholder')}
          placeholderTextColor={mutedColor}
          style={[
            styles.descriptionInput,
            {
              color: textColor,
              fontFamily: Fonts.sans,
              backgroundColor: surfaceMutedColor,
            },
          ]}
        />
        <View style={styles.descriptionMeta}>
          <Text variant="caption" tone="textMuted">
            {t('create.descriptionCaption')}
          </Text>
          <Text variant="caption" tone="textMuted">
            {t('create.descriptionCounter', { count: description.length })}
          </Text>
        </View>
      </View>
    </ModalFormScaffold>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionItem: {
    flex: 1,
  },
  typeSelector: {
    alignSelf: 'stretch',
  },
  field: {
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  label: {
    letterSpacing: 0.8,
  },
  descriptionInput: {
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  descriptionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBanner: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
