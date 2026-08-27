import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { PriceText, type PriceTone } from '@/components/ui/atoms/price-text';
import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { TrendIndicator } from '@/components/ui/atoms/trend-indicator';
import { useFormatters } from '@/hooks/use-formatters';

export interface TimelineItemProps {
  label: string;
  value: number;
  delta?: number;
  /** Signed fraction shown next to the trend arrow, e.g. 0.12 for "+12%". */
  percentage?: number;
  currency?: string;
  current?: boolean;
  tone?: PriceTone;
  /** When true, a positive delta is treated as unfavorable (red) — e.g. spending. */
  lowerIsBetter?: boolean;
  onPress?: () => void;
  /** Replaces the bottom trend row (e.g. a transaction count). Takes precedence over `delta`. */
  footer?: ReactNode;
  /**
   * Text form of whatever `footer` renders, appended to the card's grouped
   * accessibility label. `footer` is arbitrary JSX, so its content can't be
   * derived here.
   */
  footerLabel?: string;
  /** Announced as the card's action, when it has one. */
  accessibilityHint?: string;
  /**
   * Floor for the card's width. A floor rather than a fixed size: cards must be
   * free to grow for an unusually large amount, because clipping the number is
   * never acceptable.
   */
  minWidth?: number;
}

export function TimelineItem({
  label,
  value,
  delta,
  percentage,
  currency = 'USD',
  current = false,
  tone = 'neutral',
  lowerIsBetter = false,
  onPress,
  footer,
  footerLabel,
  accessibilityHint,
  minWidth,
}: TimelineItemProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatters();
  const card = (
    <Surface
      variant={current ? 'elevated' : 'muted'}
      padding={12}
      bordered={!current}
      style={[styles.card, minWidth != null ? { minWidth } : null]}
    >
      <Text variant="caption" tone={current ? 'tint' : 'textMuted'} weight="semibold">
        {label.toUpperCase()}
      </Text>
      <PriceText value={value} currency={currency} tone={tone} size="md" />
      {footer !== undefined ? (
        footer
      ) : delta !== undefined ? (
        <TrendIndicator
          delta={delta}
          percentage={percentage}
          hideValue
          currency={currency}
          lowerIsBetter={lowerIsBetter}
        />
      ) : (
        <View style={styles.trendPlaceholder} />
      )}
    </Surface>
  );

  // Built for every card, not just the pressable ones. Without this a
  // display-only card announces as three separate fragments — its label, its
  // amount, then its footer — so a month of days costs ~90 VoiceOver swipes
  // instead of 31.
  const accessibilityLabel = [label, formatCurrency(value, currency), footerLabel]
    .filter(Boolean)
    .join(', ');

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel}>
        {card}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: current }}
      accessibilityHint={accessibilityHint ?? t('accessibility.hints.filterByMonth')}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 96,
    gap: 4,
    // Lets a strip of cards self-level to its tallest member rather than every
    // card reserving space for text it may not have.
    //
    // This only belongs on the card, never on the wrapper around it. The
    // wrapper is an item of the horizontal row, where the main axis is
    // horizontal — `flexGrow` there would stretch the card's WIDTH. The wrapper
    // already fills the row's height via the row's default `align-items:
    // stretch`; inside it the axis is vertical, so this is what passes that
    // height down to the card.
    //
    // `flexGrow` rather than `flex`: `flex: 1` also sets `flexBasis: 0`, which
    // would stop the card contributing its natural height and could collapse it.
    flexGrow: 1,
  },
  trendPlaceholder: {
    height: 14,
  },
  pressed: {
    opacity: 0.6,
  },
});
