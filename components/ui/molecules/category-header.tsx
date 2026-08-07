import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
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
  /** Marks the category as archived with a small archive-box icon by the name.
   * (The card's accessibility label announces the archived state.) */
  archived?: boolean;
}

export function CategoryHeader({
  name,
  total,
  currency = 'USD',
  tone = 'neutral',
  goalText,
  archived = false,
}: CategoryHeaderProps) {
  const goalTone: TextTone = tone === 'neutral' || tone === 'auto' ? 'textMuted' : tone;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text variant="body" weight="semibold" numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        {archived ? <Icon name="archivebox.fill" size={15} tone="textMuted" /> : null}
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
