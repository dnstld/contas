import { Text, type TextProps } from '@/components/ui/atoms/text';
import { formatCurrency } from '@/utils/format';

export type PriceTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'auto';
export type PriceSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_TO_VARIANT: Record<PriceSize, TextProps['variant']> = {
  sm: 'caption',
  md: 'body',
  lg: 'subtitle',
  xl: 'display',
};

export interface PriceTextProps {
  value: number;
  currency?: string;
  /** Active locale for `Intl` formatting. Required — pass `useFormatters().locale`. */
  locale: string;
  tone?: PriceTone;
  size?: PriceSize;
  showSign?: boolean;
  fractionDigits?: number;
}

export function PriceText({
  value,
  currency = 'USD',
  locale,
  tone = 'neutral',
  size = 'md',
  showSign = false,
  fractionDigits = 2,
}: PriceTextProps) {
  const resolvedTone =
    tone === 'auto'
      ? value > 0
        ? 'positive'
        : value < 0
          ? 'negative'
          : 'text'
      : toneToColor(tone);

  const formatted = formatCurrency(value, currency, locale, {
    fractionDigits,
    signDisplay: showSign ? 'always' : 'auto',
  });

  return (
    <Text
      variant={SIZE_TO_VARIANT[size]}
      tone={resolvedTone}
      weight={size === 'xl' || size === 'lg' ? 'semibold' : 'medium'}
    >
      {formatted}
    </Text>
  );
}

function toneToColor(tone: Exclude<PriceTone, 'auto'>) {
  switch (tone) {
    case 'positive':
      return 'positive' as const;
    case 'negative':
      return 'negative' as const;
    case 'warning':
      return 'warning' as const;
    case 'neutral':
      return 'text' as const;
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}
