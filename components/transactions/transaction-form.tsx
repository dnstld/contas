import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryFormModal } from '@/components/transactions/create-category-modal';
import { transactionDate } from '@/data/finance-types';
import { DatePicker } from '@/components/ui/atoms/date-picker';
import { Icon } from '@/components/ui/atoms/icon';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/atoms/segmented-control';
import { Text } from '@/components/ui/atoms/text';
import { ChipGroup, type ChipGroupItem } from '@/components/ui/molecules/chip-group';
import { Fonts } from '@/constants/theme';
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
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const { currency } = useWallet();
  const { formatDecimal } = useFormatters();

  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'positive');
  const dangerColor = useThemeColor({}, 'negative');
  const surfaceMutedColor = useThemeColor({}, 'surfaceMuted');
  const onPrimary = useThemeColor({}, 'onPrimary');

  const [type, setType] = useState<TransactionType>(initialValues?.type ?? 'expense');
  const [amountCents, setAmountCents] = useState<number>(initialValues?.amountCents ?? 0);
  const [date, setDate] = useState<Date>(initialValues?.date ?? new Date());
  const [categoryId, setCategoryId] = useState<string | null>(initialValues?.categoryId ?? null);
  const [description, setDescription] = useState<string>(initialValues?.description ?? '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(
    initialValues?.categoryId ?? null,
  );
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    monthlyBudget?: number;
  } | null>(null);

  const typeOptions: SegmentedOption<TransactionType>[] = useMemo(
    () => [
      { value: 'expense', label: t('create.types.expense') },
      { value: 'income', label: t('create.types.income') },
    ],
    [t],
  );

  const categoryItems: ChipGroupItem<string>[] = useMemo(() => {
    // Build per-category stats from transaction history.
    const statsById = new Map<string, { mostRecentYear: number; count: number }>();
    for (const t of transactions) {
      const year = new Date(transactionDate(t)).getFullYear();
      const s = statsById.get(t.categoryId);
      if (!s) {
        statsById.set(t.categoryId, { mostRecentYear: year, count: 1 });
      } else {
        s.count += 1;
        if (year > s.mostRecentYear) s.mostRecentYear = year;
      }
    }

    const items = categories
      .filter((c) => c.type === type)
      .map((c) => ({ id: c.id, label: c.name }))
      .sort((a, b) => {
        const sa = statsById.get(a.id) ?? { mostRecentYear: 0, count: 0 };
        const sb = statsById.get(b.id) ?? { mostRecentYear: 0, count: 0 };
        if (sb.mostRecentYear !== sa.mostRecentYear) return sb.mostRecentYear - sa.mostRecentYear;
        return sb.count - sa.count;
      });

    // Pin the selected/newly-created category to slot 0.
    if (newCategoryId) {
      const idx = items.findIndex((i) => i.id === newCategoryId);
      if (idx > 0) {
        const [picked] = items.splice(idx, 1);
        if (picked) items.unshift(picked);
      }
    }

    return items;
  }, [categories, transactions, type, newCategoryId]);

  const formattedAmount = formatDecimal(amountCents / 100);

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length === 0) {
      setAmountCents(0);
      return;
    }
    const parsed = Number.parseInt(digits, 10);
    if (Number.isFinite(parsed)) {
      setAmountCents(parsed);
    }
  };

  const handleCategoryLongPress = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    setEditingCategory({ id: cat.id, name: cat.name, monthlyBudget: cat.monthlyBudget });
  };

  const handleTypeChange = (next: TransactionType) => {
    setType(next);
    setCategoryId(null);
    setNewCategoryId(null);
  };

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
    <SafeAreaView edges={['bottom']} style={[styles.root, { backgroundColor }]}>
      <View style={styles.dragHandleWrap}>
        <View style={[styles.dragHandle, { backgroundColor: borderColor }]} />
      </View>

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
          <View style={styles.typeSelector}>
            <SegmentedControl<TransactionType>
              options={typeOptions}
              value={type}
              onChange={handleTypeChange}
            />
          </View>

          <View style={styles.amountSection}>
            <Text style={[styles.amountSymbol, { color: mutedColor, fontFamily: Fonts.rounded }]}>
              {currency}
            </Text>
            <TextInput
              value={formattedAmount}
              onChangeText={handleAmountChange}
              keyboardType="number-pad"
              inputMode="numeric"
              accessibilityLabel={t('create.amountPlaceholder')}
              selectionColor={textColor}
              style={[
                styles.amountInput,
                {
                  color: amountCents > 0 ? textColor : mutedColor,
                  fontFamily: Fonts.rounded,
                },
              ]}
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
              {t('create.categoryLabel').toUpperCase()}
            </Text>
            <ChipGroup<string>
              items={categoryItems}
              selectedIds={categoryId ? [categoryId] : []}
              onToggle={(id) => setCategoryId((current) => (current === id ? null : id))}
              onLongPress={handleCategoryLongPress}
              multiSelect={false}
              showCheckWhenSelected
              leading={
                <Pressable
                  onPress={() => setShowCreateModal(true)}
                  style={({ pressed }) => [
                    styles.newCategoryChip,
                    { borderColor, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text variant="caption" weight="medium" tone="textMuted">
                    {t('category.create.chipLabel')}
                  </Text>
                </Pressable>
              }
            />
            {categoryItems.length > 0 ? (
              <Text variant="caption" tone="textMuted">
                {t('category.pressAndHoldHint')}
              </Text>
            ) : null}
          </View>

          <CategoryFormModal
            visible={showCreateModal}
            type={type}
            onCreated={(id) => {
              setCategoryId(id);
              setNewCategoryId(id);
            }}
            onClose={() => setShowCreateModal(false)}
          />
          <CategoryFormModal
            visible={!!editingCategory}
            type={type}
            editCategory={editingCategory ?? undefined}
            onCreated={() => {}}
            onDeleted={(id) => {
              if (categoryId === id) {
                setCategoryId(null);
                setNewCategoryId(null);
              }
            }}
            onClose={() => setEditingCategory(null)}
          />

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
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: borderColor }]}>
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

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: accentColor,
                shadowColor: accentColor,
                shadowOpacity: canSubmit ? (pressed ? 0.18 : 0.32) : 0.12,
                transform: [{ scale: pressed && canSubmit ? 0.98 : 1 }],
                opacity: canSubmit ? 1 : 0.5,
              },
            ]}
          >
            <Icon name="checkmark" size={18} color={onPrimary} />
            <Text
              variant="subtitle"
              weight="bold"
              style={[styles.submitLabel, { color: onPrimary }]}
            >
              {submitLabel ?? t('create.save')}
            </Text>
          </Pressable>

          {onDelete ? (
            <Pressable
              onPress={onDelete}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy: isDeleting }}
              style={({ pressed }) => [
                styles.delete,
                {
                  borderColor: dangerColor,
                  backgroundColor: pressed ? `${dangerColor}14` : 'transparent',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: busy ? 0.5 : 1,
                },
              ]}
            >
              <Text variant="subtitle" weight="semibold" style={{ color: dangerColor }}>
                {deleteLabel ?? t('edit.delete')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    gap: 32,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  typeSelector: {
    alignSelf: 'stretch',
  },
  amountSection: {
    alignItems: 'center',
    gap: 2,
  },
  amountSymbol: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  amountInput: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
    alignSelf: 'stretch',
  },
  field: {
    gap: 8,
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
  submit: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  submitLabel: {
    letterSpacing: 0.3,
  },
  delete: {
    marginTop: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorBanner: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  newCategoryChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
