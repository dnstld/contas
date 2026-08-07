import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/atoms/badge';
import { PriceText, type PriceTone } from '@/components/ui/atoms/price-text';
import { Text, type TextTone } from '@/components/ui/atoms/text';

export interface CategoryHeaderProps {
  name: string;
  total: number;
  currency?: string;
  tone?: PriceTone;
  /** Shown next to the amount, e.g. "of 500,00", when the category has a goal.
   * Colored to match `tone` (green under goal, amber at goal, red over goal). */
  goalText?: string;
  /** Optional pill next to the name, e.g. "Archived". */
  badge?: string;
}

export function CategoryHeader({
  name,
  total,
  currency = 'USD',
  tone = 'neutral',
  goalText,
  badge,
}: CategoryHeaderProps) {
  const goalTone: TextTone = tone === 'neutral' || tone === 'auto' ? 'textMuted' : tone;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text variant="body" weight="semibold" numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        {badge ? <Badge label={badge} tone="inverse" variant="solid" /> : null}
      </View>
      <View style={styles.amountRow}>
        <PriceText value={total} currency={currency} tone={tone} size="lg" />
        {goalText ? (
          <Text variant="caption" tone={goalTone} weight="medium">
            {goalText}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    flex: 1,
  },
});
