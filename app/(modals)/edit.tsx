import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  TransactionForm,
  type TransactionFormValues,
} from '@/components/transactions/transaction-form';
import { useFinanceMock } from '@/hooks/use-finance-mock';

export default function EditScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mock } = useFinanceMock();

  const transaction = useMemo(
    () => mock.transactions.find((entry) => entry.id === id),
    [mock.transactions, id],
  );

  useEffect(() => {
    if (!transaction) {
      router.back();
    }
  }, [transaction, router]);

  if (!transaction) return null;

  const initialValues: Partial<TransactionFormValues> = {
    type: transaction.type,
    amountCents: Math.round(transaction.amount * 100),
    date: new Date(
      transaction.date ??
        transaction.startDate ??
        transaction.nextOccurrence ??
        Date.now(),
    ),
    categoryId: transaction.categoryId,
    description: transaction.description,
  };

  return (
    <TransactionForm
      title={t('edit.title')}
      submitLabel={t('edit.save')}
      autoFocusAmount={false}
      initialValues={initialValues}
      onSubmit={(values) => {
        console.log('update transaction', transaction.id, values);
        router.back();
      }}
      onDelete={() => {
        console.log('delete transaction', transaction.id);
        router.back();
      }}
      onClose={() => router.back()}
    />
  );
}
