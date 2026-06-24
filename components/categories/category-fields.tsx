import { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { CATEGORY_NAME_MAX_LENGTH } from '@/constants/limits';
import { Fonts } from '@/constants/theme';
import { useFormatters } from '@/hooks/use-formatters';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useWallet } from '@/hooks/use-wallet';

export interface CategoryFieldsProps {
  name: string;
  onNameChange: (next: string) => void;
  /** Monthly goal, in cents. */
  budgetCents: number;
  onBudgetChange: (cents: number) => void;
  nameInputRef?: RefObject<TextInput | null>;
  /** Called when the goal field's "done" key is pressed (e.g. to submit). */
  onSubmitBudget?: () => void;
}

/**
 * Name + monthly-goal inputs shared by the standalone category-form screen and
 * the inline "create" state of the category-select sheet, so both capture the
 * exact same fields with identical formatting and copy.
 */
export function CategoryFields({
  name,
  onNameChange,
  budgetCents,
  onBudgetChange,
  nameInputRef,
  onSubmitBudget,
}: CategoryFieldsProps) {
  const { t } = useTranslation();
  const { currency } = useWallet();
  const { formatDecimal, currencySymbol } = useFormatters();
  const { text: textColor, textMuted: mutedColor, inputBackground } = useModalChrome();

  const symbol = currencySymbol(currency);
  const formattedBudget = formatDecimal(budgetCents / 100);

  const handleBudgetChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) {
      onBudgetChange(0);
      return;
    }
    const parsed = Number.parseInt(digits, 10);
    if (Number.isFinite(parsed)) onBudgetChange(parsed);
  };

  return (
    <>
      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('category.create.nameLabel').toUpperCase()}
        </Text>
        <TextInput
          ref={nameInputRef}
          value={name}
          onChangeText={onNameChange}
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
            onSubmitEditing={onSubmitBudget}
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
    </>
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
    includeFontPadding: false,
  },
  budgetInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
