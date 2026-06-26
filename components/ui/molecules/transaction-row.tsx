import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/atoms/avatar';
import { PriceText } from '@/components/ui/atoms/price-text';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import type { Transaction } from '@/data/finance-types';
import { useFormatters } from '@/hooks/use-formatters';

export type TransactionRowCreator = {
  displayName: string | null;
  avatarUrl: string | null;
  isMe: boolean;
};

export interface TransactionRowProps {
  transaction: Transaction;
  currency: string;
  creator: TransactionRowCreator | null;
  /**
   * Receives the transaction id so callers can keep a stable, memoized handler.
   * Omit to render the row as non-interactive (e.g. read-only example data).
   */
  onPress?: (transactionId: string) => void;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function resolveCreatorLabel(
  creator: TransactionRowCreator | null,
  youLabel: string,
): string | null {
  if (!creator) return null;
  if (creator.isMe) return youLabel;
  if (creator.displayName) return firstName(creator.displayName);
  return null;
}

function TransactionRowImpl({ transaction, currency, creator, onPress }: TransactionRowProps) {
  const { locale } = useFormatters();
  const { t } = useTranslation();
  const isIncome = transaction.type === 'income';

  const description = transaction.description?.trim() ?? '';
  const hasDescription = description.length > 0;

  const creatorLabel = resolveCreatorLabel(creator, t('transactions.createdByYou'));

  const avatarName = creator?.displayName ?? transaction.categoryName;

  const accessibilityLabel = [transaction.categoryName, description, creatorLabel]
    .filter(Boolean)
    .join(', ');

  const handlePress = useCallback(() => {
    onPress?.(transaction.id);
  }, [onPress, transaction.id]);

  return (
    <SectionListRow
      size="sm"
      density="compact"
      onPress={onPress ? handlePress : undefined}
      accessibilityLabel={accessibilityLabel}
      leading={creator ? <Avatar url={creator.avatarUrl} name={avatarName} size="sm" /> : null}
      title={transaction.categoryName}
      text1={creatorLabel}
      subtitle={hasDescription ? description : null}
      text2={
        <PriceText
          value={transaction.amount}
          currency={currency}
          locale={locale}
          tone={isIncome ? 'positive' : 'neutral'}
          size="md"
        />
      }
    />
  );
}

// Memoized so list re-renders don't reconcile every row when only siblings/
// parent state changed. Relies on callers passing stable `onPress` and
// `creator` references.
export const TransactionRow = memo(TransactionRowImpl);
