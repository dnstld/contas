import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/atoms/avatar';
import { PriceText } from '@/components/ui/atoms/price-text';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import {
  resolveRowAttribution,
  type TransactionRowCreator,
} from '@/components/ui/molecules/transaction-row-attribution';
import type { Transaction } from '@/data/finance-types';

export type { TransactionRowCreator } from '@/components/ui/molecules/transaction-row-attribution';

export interface TransactionRowProps {
  transaction: Transaction;
  currency: string;
  creator: TransactionRowCreator | null;
  /**
   * The member this transaction is FOR, when it was entered on their behalf.
   * `null` for the common case (the transaction belongs to its creator).
   */
  beneficiary?: TransactionRowCreator | null;
  /**
   * Receives the transaction id so callers can keep a stable, memoized handler.
   * Omit to render the row as non-interactive (e.g. read-only example data).
   */
  onPress?: (transactionId: string) => void;
}

function TransactionRowImpl({
  transaction,
  currency,
  creator,
  beneficiary,
  onPress,
}: TransactionRowProps) {
  const { t } = useTranslation();
  const isIncome = transaction.type === 'income';

  const description = transaction.description?.trim() ?? '';
  const hasDescription = description.length > 0;

  const attribution = resolveRowAttribution(creator, beneficiary, {
    you: t('transactions.createdByYou'),
    unnamed: t('wallet.partner.unnamed'),
  });

  // Attribution line. On-behalf rows read "<beneficiary> · added by <actor>";
  // ordinary rows keep the plain creator label ("You" / first name).
  const creatorLabel = attribution.isOnBehalf
    ? t('transactions.onBehalf', {
        beneficiary: attribution.beneficiaryName,
        actor: attribution.actorName,
      })
    : attribution.plainLabel;

  const avatarSource = attribution.avatarSource;
  const avatarName = avatarSource?.displayName ?? transaction.categoryName;

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
      leading={
        avatarSource ? <Avatar url={avatarSource.avatarUrl} name={avatarName} size="sm" /> : null
      }
      title={transaction.categoryName}
      text1={creatorLabel}
      subtitle={hasDescription ? description : null}
      text2={
        <PriceText
          value={transaction.amount}
          currency={currency}
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
