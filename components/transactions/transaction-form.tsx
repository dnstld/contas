import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { categoryFormHref } from '@/constants/routes';
import { transactionDate } from '@/data/finance-types';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { categoryFormBridge, makeBridgeId } from '@/utils/modal-bridge';
import { DatePicker } from '@/components/ui/atoms/date-picker';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
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
  const router = useRouter();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const { currency } = useWallet();
  const { formatDecimal } = useFormatters();
  // Stable per-mount id. Lazy useState avoids react-hooks/refs (no `.current`
  // access during render) and gives us a one-time value identical to a ref.
  const [bridgeId] = useState(() => makeBridgeId());
  const bottomPadding = useModalBottomPadding();
  const headerHeight = useHeaderHeight();

  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const borderColor = useThemeColor({}, 'border');
  const dangerColor = useThemeColor({}, 'negative');
  const surfaceMutedColor = useThemeColor({}, 'surfaceMuted');

  const [type, setType] = useState<TransactionType>(initialValues?.type ?? 'expense');
  const [amountCents, setAmountCents] = useState<number>(initialValues?.amountCents ?? 0);
  const [date, setDate] = useState<Date>(initialValues?.date ?? new Date());
  const [categoryId, setCategoryId] = useState<string | null>(initialValues?.categoryId ?? null);
  const [description, setDescription] = useState<string>(initialValues?.description ?? '');
  const [newCategoryId, setNewCategoryId] = useState<string | null>(
    initialValues?.categoryId ?? null,
  );

  useEffect(() => {
    return categoryFormBridge.subscribe(bridgeId, {
      created: (id) => {
        setCategoryId(id);
        setNewCategoryId(id);
      },
      deleted: (id) => {
        setCategoryId((current) => (current === id ? null : current));
        setNewCategoryId((current) => (current === id ? null : current));
      },
    });
  }, [bridgeId]);

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
    // Treat the field like a calculator: each new digit shifts cents left,
    // regardless of cursor position. Without this, typing at the start of
    // "0,00" would turn the mask's trailing zeros into entered digits
    // (e.g. typing "5" at index 0 yields "50,00" → 5000 cents instead of 5).
    const newDigits = text.replace(/\D/g, '');
    const prevDigits = formattedAmount.replace(/\D/g, '');
    if (newDigits === prevDigits) return;

    if (newDigits.length > prevDigits.length) {
      let diffIdx = 0;
      while (diffIdx < prevDigits.length && prevDigits[diffIdx] === newDigits[diffIdx]) {
        diffIdx += 1;
      }
      const addedCount = newDigits.length - prevDigits.length;
      const addedChars = newDigits.slice(diffIdx, diffIdx + addedCount);
      let next = amountCents;
      for (const ch of addedChars) {
        next = next * 10 + Number(ch);
      }
      setAmountCents(next);
    } else if (newDigits.length < prevDigits.length) {
      const removedCount = prevDigits.length - newDigits.length;
      let next = amountCents;
      for (let i = 0; i < removedCount; i += 1) {
        next = Math.floor(next / 10);
      }
      setAmountCents(next);
    } else {
      const parsed = Number.parseInt(newDigits, 10);
      setAmountCents(Number.isFinite(parsed) ? parsed : 0);
    }
  };

  const handleCategoryLongPress = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    router.push(categoryFormHref({ type, bridgeId, editId: cat.id }));
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
    <View style={[styles.root, { backgroundColor, paddingBottom: bottomPadding }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
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
                  onPress={() => router.push(categoryFormHref({ type, bridgeId }))}
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

          <PressableButton
            label={submitLabel ?? t('create.save')}
            iconName="checkmark"
            variant="primary"
            size="large"
            loading={isSubmitting}
            disabled={!canSubmit}
            onPress={handleSubmit}
          />

          {onDelete ? (
            <View style={styles.deleteWrap}>
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
  deleteWrap: {
    marginTop: 12,
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
