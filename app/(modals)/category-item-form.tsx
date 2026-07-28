import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { CurrencyInput } from '@/components/ui/atoms/currency-input';
import { DatePicker } from '@/components/ui/atoms/date-picker';
import { SegmentedControl } from '@/components/ui/atoms/segmented-control';
import { Text } from '@/components/ui/atoms/text';
import { ModalActions } from '@/components/ui/molecules/modal-actions';
import { ModalFormScaffold } from '@/components/ui/templates/modal-form-scaffold';
import { ITEM_NAME_MAX_LENGTH } from '@/constants/limits';
import { Fonts } from '@/constants/theme';
import { MOCK_CATEGORY_ITEMS } from '@/data/__fixtures__/category-items';
import { parseDayStart, type Recurrence } from '@/data/finance-types';
import { useFormatters } from '@/hooks/use-formatters';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useNow } from '@/hooks/use-now';
import { useWallet } from '@/hooks/use-wallet';
import { nextAmountCents } from '@/utils/amount-input';

const RECURRENCE_ORDER: Recurrence[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

export default function CategoryItemFormScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const now = useNow();
  const { currency } = useWallet();
  const { formatAmount } = useFormatters();
  const { text: textColor, textMuted: mutedColor, inputBackground } = useModalChrome();

  const params = useLocalSearchParams<{ categoryId: string; editId?: string }>();
  const editId = params.editId ?? null;
  const isEdit = !!editId;

  const editItem = isEdit ? (MOCK_CATEGORY_ITEMS.find((it) => it.id === editId) ?? null) : null;

  const [name, setName] = useState(editItem?.name ?? '');
  const [amountCents, setAmountCents] = useState(
    editItem?.defaultAmount != null ? Math.round(editItem.defaultAmount * 100) : 0,
  );
  const [recurrence, setRecurrence] = useState<Recurrence>(editItem?.recurrence ?? 'none');
  const [nextDue, setNextDue] = useState<Date>(
    editItem?.nextDueOn ? parseDayStart(editItem.nextDueOn) : now,
  );

  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!isEdit) {
      const handle = setTimeout(() => nameInputRef.current?.focus(), 250);
      return () => clearTimeout(handle);
    }
  }, [isEdit]);

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

  const canSave = name.trim().length > 0;

  // TODO(phaseB): create item
  const handleSave = () => router.back();
  // TODO(phaseB): archive item
  const handleArchive = () => router.back();
  // TODO(phaseB): delete item
  const handleDelete = () => router.back();

  return (
    <ModalFormScaffold
      footer={
        <ModalActions
          primary={{ label: t('categoryItemForm.save'), onPress: handleSave, disabled: !canSave }}
          secondary={
            isEdit
              ? [
                  { label: t('categoryItemForm.archive'), onPress: handleArchive, tone: 'muted' },
                  {
                    label: t('categoryItemForm.delete'),
                    onPress: handleDelete,
                    tone: 'destructive',
                  },
                ]
              : undefined
          }
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
