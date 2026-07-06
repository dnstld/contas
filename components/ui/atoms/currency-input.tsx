import { forwardRef } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Fonts } from '@/constants/theme';
import { currencyLocale } from '@/data/currency';
import { currencyAffix } from '@/utils/format';

export interface CurrencyInputProps extends Omit<TextInputProps, 'style'> {
  /**
   * Wallet currency code. Drives the symbol, its position (prefix/suffix), the
   * spacing, and the formatting locale — all derived from the currency via
   * `currencyLocale` + `currencyAffix`, so the field matches the read-only
   * `formatCurrency` output (e.g. `$` for USD, `R$ 12` for BRL, `12 €` for EUR).
   */
  currency: string;
  /** Color of the currency symbol affix. */
  symbolColor?: string;
  /** Style for the row container (e.g. `backgroundColor`, padding overrides). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Style for the inner `TextInput` (e.g. text color, font). */
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * A single-line amount input with the currency symbol placed beside it in the
 * currency's native position. Atomic-layering: like `PriceText`, this leaf atom
 * takes `currency` as a prop and derives its formatting locale via
 * `currencyLocale`, calling `@/utils/format` directly rather than reading
 * `useFormatters`.
 */
export const CurrencyInput = forwardRef<TextInput, CurrencyInputProps>(function CurrencyInput(
  { currency, symbolColor, containerStyle, inputStyle, ...inputProps },
  ref,
) {
  const affix = currencyAffix(currency, currencyLocale(currency));

  const symbol = (
    <RNText style={[styles.symbol, { color: symbolColor, fontFamily: Fonts.sans }]}>
      {affix.symbol}
    </RNText>
  );

  return (
    <View style={[styles.row, { gap: affix.spaced ? 4 : 0 }, containerStyle]}>
      {affix.position === 'prefix' ? symbol : null}
      <TextInput ref={ref} style={[styles.input, inputStyle]} {...inputProps} />
      {affix.position === 'suffix' ? symbol : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  symbol: {
    fontSize: 15,
    includeFontPadding: false,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
