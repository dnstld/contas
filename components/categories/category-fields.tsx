import { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/atoms/chip';
import { CurrencyInput } from '@/components/ui/atoms/currency-input';
import { Text } from '@/components/ui/atoms/text';
import { CATEGORY_NAME_MAX_LENGTH } from '@/constants/limits';
import { Fonts } from '@/constants/theme';
import { useFormatters } from '@/hooks/use-formatters';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useWallet } from '@/hooks/use-wallet';
import { nextAmountCents } from '@/utils/amount-input';

export interface CategoryFieldsProps {
  name: string;
  onNameChange: (next: string) => void;
  /** Monthly goal, in cents. */
  budgetCents: number;
  onBudgetChange: (cents: number) => void;
  nameInputRef?: RefObject<TextInput | null>;
  /** Called when the goal field's "done" key is pressed (e.g. to submit). */
  onSubmitBudget?: () => void;
  /**
   * Starter category names shown as chips below the name input. Tapping one
   * fills the name (and toggles off if it already matches). Omit/empty to hide.
   */
  nameSuggestions?: readonly string[];
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
  nameSuggestions,
}: CategoryFieldsProps) {
  const { t } = useTranslation();
  const { currency } = useWallet();
  const { formatAmount } = useFormatters();
  const { text: textColor, textMuted: mutedColor, inputBackground } = useModalChrome();

  const formattedBudget = formatAmount(budgetCents / 100, currency);

  const handleBudgetChange = (value: string) => {
    onBudgetChange(nextAmountCents(budgetCents, formattedBudget, value));
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
          accessibilityLabel={t('category.create.nameLabel')}
          style={[
            styles.fieldInput,
            { color: textColor, backgroundColor: inputBackground, fontFamily: Fonts.sans },
          ]}
        />
        {nameSuggestions && nameSuggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {nameSuggestions.map((s) => {
              const selected = name.trim() === s;
              return (
                <Chip
                  key={s}
                  label={s}
                  variant={selected ? 'secondary' : 'default'}
                  selected={selected}
                  showCheckWhenSelected
                  onPress={() => onNameChange(selected ? '' : s)}
                />
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('category.create.budgetLabel').toUpperCase()}
        </Text>
        <CurrencyInput
          currency={currency}
          symbolColor={mutedColor}
          value={formattedBudget}
          onChangeText={handleBudgetChange}
          keyboardType="number-pad"
          inputMode="numeric"
          returnKeyType="done"
          onSubmitEditing={onSubmitBudget}
          accessibilityLabel={t('category.create.budgetLabel')}
          containerStyle={{ backgroundColor: inputBackground }}
          inputStyle={{ color: budgetCents > 0 ? textColor : mutedColor, fontFamily: Fonts.sans }}
        />
        <Text variant="caption" tone="textMuted">
          {t('category.create.budgetCaption')}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  label: { letterSpacing: 0.8 },
  fieldInput: {
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});
