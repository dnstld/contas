import { Pressable, StyleSheet, View } from 'react-native';

import { PriceText } from '@/components/ui/atoms/price-text';
import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import type { Transaction } from '@/data/finance-types';
import { useFormatters } from '@/hooks/use-formatters';

export interface TransactionRowProps {
  transaction: Transaction;
  currency: string;
  onPress: (transaction: Transaction) => void;
}

function initials(name: string): string {
  return name
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 2)
    .toUpperCase();
}

export function TransactionRow({ transaction, currency, onPress }: TransactionRowProps) {
  const { locale } = useFormatters();
  const isIncome = transaction.type === 'income';
  const signedAmount = isIncome ? transaction.amount : -transaction.amount;

  return (
    <Pressable
      onPress={() => onPress(transaction)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Surface variant="muted" padding={0} radius={20} style={styles.avatar}>
        <Text variant="caption" weight="semibold">
          {initials(transaction.categoryName)}
        </Text>
      </Surface>
      <View style={styles.middle}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {transaction.categoryName}
        </Text>
        <Text variant="caption" tone="textMuted" numberOfLines={1}>
          {transaction.description}
        </Text>
      </View>
      <PriceText
        value={signedAmount}
        currency={currency}
        locale={locale}
        tone="neutral"
        size="md"
        showSign
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    gap: 2,
  },
});
