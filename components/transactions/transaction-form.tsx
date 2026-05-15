import { useEffect, useMemo, useRef, useState } from 'react';
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

import { DatePicker } from '@/components/ui/atoms/date-picker';
import { Icon } from '@/components/ui/atoms/icon';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/atoms/segmented-control';
import { Text } from '@/components/ui/atoms/text';
import {
  ChipGroup,
  type ChipGroupItem,
} from '@/components/ui/molecules/chip-group';
import { Fonts } from '@/constants/theme';
import { useCurrency } from '@/hooks/use-currency';
import { useFinanceMock } from '@/hooks/use-finance-mock';
import { useFormatters } from '@/hooks/use-formatters';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  onClose?: () => void;
  onDelete?: () => void;
  title?: string;
  submitLabel?: string;
  deleteLabel?: string;
  autoFocusAmount?: boolean;
}

const DESCRIPTION_MAX_LENGTH = 100;

export function TransactionForm({
  initialValues,
  onSubmit,
  onClose,
  onDelete,
  title,
  submitLabel,
  deleteLabel,
  autoFocusAmount = true,
}: TransactionFormProps) {
  const { t } = useTranslation();
  const { mock } = useFinanceMock();
  const { currency } = useCurrency();
  const { formatCurrency } = useFormatters();

  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'positive');
  const dangerColor = useThemeColor({}, 'negative');

  const [type, setType] = useState<TransactionType>(
    initialValues?.type ?? 'expense',
  );
  const [amountCents, setAmountCents] = useState<number>(
    initialValues?.amountCents ?? 0,
  );
  const [date, setDate] = useState<Date>(initialValues?.date ?? new Date());
  const [categoryId, setCategoryId] = useState<string | null>(
    initialValues?.categoryId ?? null,
  );
  const [description, setDescription] = useState<string>(
    initialValues?.description ?? '',
  );

  const amountRef = useRef<TextInput>(null);
  useEffect(() => {
    if (!autoFocusAmount) return;
    const timer = setTimeout(() => amountRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [autoFocusAmount]);

  const typeOptions: SegmentedOption<TransactionType>[] = useMemo(
    () => [
      { value: 'expense', label: t('create.types.expense') },
      { value: 'income', label: t('create.types.income') },
    ],
    [t],
  );

  const categoryItems: ChipGroupItem<string>[] = useMemo(
    () =>
      mock.categories
        .filter((c) => c.type === type)
        .map((c) => ({ id: c.id, label: c.name })),
    [mock.categories, type],
  );

  const formattedAmount = formatCurrency(amountCents / 100, currency);

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

  const handleTypeChange = (next: TransactionType) => {
    setType(next);
    setCategoryId(null);
  };

  const canSubmit = amountCents > 0 && categoryId !== null;

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
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor }]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel={t('create.close')}
        >
          <Icon name="xmark" size={22} tone="text" />
        </Pressable>
        <Text variant="subtitle" weight="semibold">
          {title ?? t('create.title')}
        </Text>
        <View style={styles.headerSpacer} />
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
            <TextInput
              ref={amountRef}
              value={formattedAmount}
              onChangeText={handleAmountChange}
              keyboardType="number-pad"
              inputMode="numeric"
              autoFocus={autoFocusAmount}
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
            {categoryItems.length > 0 ? (
              <ChipGroup<string>
                items={categoryItems}
                selectedIds={categoryId ? [categoryId] : []}
                onToggle={(id) =>
                  setCategoryId((current) => (current === id ? null : id))
                }
                multiSelect={false}
                showCheckWhenSelected
              />
            ) : (
              <Text variant="body" tone="textMuted">
                {t('create.categoryEmpty')}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
              {t('create.descriptionPlaceholder').toUpperCase()}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              maxLength={DESCRIPTION_MAX_LENGTH}
              placeholder={t('create.descriptionPlaceholder')}
              placeholderTextColor={mutedColor}
              style={[
                styles.descriptionInput,
                {
                  color: textColor,
                  fontFamily: Fonts.sans,
                  borderBottomColor: borderColor,
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
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
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
            <Icon name="checkmark" size={18} color="#fff" />
            <Text
              variant="subtitle"
              weight="bold"
              style={styles.submitLabel}
            >
              {submitLabel ?? t('create.save')}
            </Text>
          </Pressable>

          {onDelete ? (
            <Pressable
              onPress={onDelete}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.delete,
                {
                  borderColor: dangerColor,
                  backgroundColor: pressed ? `${dangerColor}14` : 'transparent',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text
                variant="subtitle"
                weight="semibold"
                style={{ color: dangerColor }}
              >
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerSpacer: {
    width: 22,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 24,
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
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: '60%',
    padding: 0,
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
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    color: '#fff',
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
});
