import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { currencyAffix, formatDecimal } from '@/utils/format';

export interface CurrencyInputProps
  extends Omit<TextInputProps, 'style' | 'value' | 'defaultValue' | 'onChangeText' | 'onChange'> {
  /**
   * Wallet currency code. Drives the symbol, its position (prefix/suffix), the
   * spacing, and the formatting locale — all derived from the currency via
   * `currencyLocale` + `currencyAffix`, so the field matches the read-only
   * `formatCurrency` output (e.g. `$` for USD, `R$ 12` for BRL, `12 €` for EUR).
   */
  currency: string;
  /** Current amount as integer cents. */
  valueCents: number;
  /** Called with the next integer-cents amount on every edit. */
  onChangeCents: (cents: number) => void;
  /** Color of the currency symbol affix. */
  symbolColor?: string;
  /** Style for the row container (e.g. `backgroundColor`, padding overrides). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Style for the amount text (e.g. text color, font). */
  inputStyle?: StyleProp<TextStyle>;
}

/** Integer cents from a raw digit string (leading zeros collapse in the value
 *  but are kept in the raw text — see the component doc for why). */
function digitsToCents(raw: string): number {
  const n = Number.parseInt(raw.replace(/\D/g, '') || '0', 10);
  return Number.isFinite(n) ? n : 0;
}

/** Raw digit string seed for a cents value (empty for zero, so the field can be
 *  cleared back to an empty state). */
function centsToDigits(cents: number): string {
  return cents > 0 ? String(cents) : '';
}

/**
 * Calculator-style amount input: digits fill in from the right (`5` → `0,05` →
 * `0,55`), with the currency symbol beside the number in its native position.
 *
 * Why the split display: a naive controlled field would set `value` to the
 * *formatted* mask (`0,05`) while the user actually typed `5`, forcing the
 * native text to be rewritten on every keystroke. On a real device that rewrite
 * briefly disrupts the field and swallows the *next* keypress (every other digit
 * appears to need two taps). So instead the hidden `TextInput` holds only the
 * raw digits the user types — append/backspace, never rewritten — so its `value`
 * always matches the native text and no disruptive rewrite ever happens. The
 * formatted amount is rendered as a separate label on top, with a blinking caret.
 *
 * Atomic-layering: like `PriceText`, this leaf atom takes `currency` as a prop
 * and derives its formatting via `currencyLocale`/`@/utils/format` directly.
 */
export const CurrencyInput = forwardRef<TextInput, CurrencyInputProps>(function CurrencyInput(
  {
    currency,
    valueCents,
    onChangeCents,
    symbolColor,
    containerStyle,
    inputStyle,
    onFocus,
    onBlur,
    ...inputProps
  },
  ref,
) {
  const locale = currencyLocale(currency);
  const affix = currencyAffix(currency, locale);

  const [raw, setRaw] = useState(() => centsToDigits(valueCents));
  const [focused, setFocused] = useState(false);

  // Sync when the amount changes from outside typing (item prefill, reset). The
  // functional update reads the *current* raw, so a keystroke's own round-trip
  // (which lands on `digitsToCents(raw) === valueCents`) never reverts what was
  // just typed — and leading-zero raw like "005" (cents 5) is left untouched.
  useEffect(() => {
    setRaw((cur) => (digitsToCents(cur) === valueCents ? cur : centsToDigits(valueCents)));
  }, [valueCents]);

  const cents = digitsToCents(raw);
  const formatted = formatDecimal(cents / 100, locale);
  const caretColor = StyleSheet.flatten(inputStyle)?.color ?? symbolColor;

  // Blinking caret (native caret is hidden since it would sit over the invisible
  // raw digits, not the formatted label).
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!focused) return;
    blink.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 500, delay: 500, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 500, delay: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [focused, blink]);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setRaw(digits);
    onChangeCents(digitsToCents(digits));
  };

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  const symbol = (
    <RNText style={[styles.symbol, { color: symbolColor, fontFamily: Fonts.sans }]}>
      {affix.symbol}
    </RNText>
  );

  return (
    <View style={[styles.row, { gap: affix.spaced ? 4 : 0 }, containerStyle]}>
      {affix.position === 'prefix' ? symbol : null}
      <View style={styles.field}>
        <View style={styles.display} pointerEvents="none">
          <RNText style={[styles.input, inputStyle]} numberOfLines={1}>
            {formatted}
          </RNText>
          {focused ? (
            <Animated.View style={[styles.caret, { backgroundColor: caretColor, opacity: blink }]} />
          ) : null}
        </View>
        <TextInput
          {...inputProps}
          ref={ref}
          value={raw}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          caretHidden
          style={styles.hiddenInput}
        />
      </View>
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
  field: {
    flex: 1,
    justifyContent: 'center',
  },
  display: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    fontSize: 15,
    padding: 0,
    includeFontPadding: false,
  },
  caret: {
    width: 2,
    height: 18,
    marginLeft: 1,
    borderRadius: 1,
  },
  // Transparent, on top of the formatted label: captures taps/keystrokes and
  // owns focus, but its (raw-digit) text and native caret are never seen.
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    color: 'transparent',
    fontSize: 15,
    padding: 0,
  },
});
