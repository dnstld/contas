import { Text, type TextProps } from '@/components/ui/atoms/text';

export type PriceTone = 'neutral' | 'positive' | 'negative' | 'auto';
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
  locale?: string;
  tone?: PriceTone;
  size?: PriceSize;
  showSign?: boolean;
  fractionDigits?: number;
}

export function PriceText({
  value,
  currency = 'USD',
  locale = 'pt-BR',
  tone = 'neutral',
  size = 'md',
  showSign = false,
  fractionDigits = 2,
}: PriceTextProps) {
  const resolvedTone =
    tone === 'auto' ? (value > 0 ? 'positive' : value < 0 ? 'negative' : 'text') : toneToColor(tone);

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay: showSign ? 'always' : 'auto',
  });

  return (
    <Text
      variant={SIZE_TO_VARIANT[size]}
      tone={resolvedTone}
      weight={size === 'xl' || size === 'lg' ? 'semibold' : 'medium'}
    >
      {formatter.format(value)}
    </Text>
  );
}

function toneToColor(tone: Exclude<PriceTone, 'auto'>) {
  switch (tone) {
    case 'positive':
      return 'positive' as const;
    case 'negative':
      return 'negative' as const;
    default:
      return 'text' as const;
  }
}
