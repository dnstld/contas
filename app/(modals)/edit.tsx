import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  TransactionForm,
  type TransactionFormValues,
} from '@/components/transactions/transaction-form';
import { useFinance } from '@/hooks/use-finance';
import { useDeleteTransaction, useUpdateTransaction } from '@/hooks/use-finance-mutations';

export default function EditScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useFinance();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const transaction = useMemo(
    () => data?.transactions.find((entry) => entry.id === id),
    [data, id],
  );

  useEffect(() => {
    if (data && !transaction) {
      router.back();
    }
  }, [data, transaction, router]);

  if (!transaction) return null;

  const initialValues: Partial<TransactionFormValues> = {
    type: transaction.type,
    amountCents: Math.round(transaction.amount * 100),
    date: new Date(
      transaction.date ?? transaction.startDate ?? transaction.nextOccurrence ?? Date.now(),
    ),
    categoryId: transaction.categoryId,
    description: transaction.description,
  };

  return (
    <TransactionForm
      submitLabel={t('edit.save')}
      initialValues={initialValues}
      isSubmitting={updateMutation.isPending}
      isDeleting={deleteMutation.isPending}
      errorMessage={errorMessage}
      onSubmit={async (values) => {
        setErrorMessage(null);
        try {
          await updateMutation.mutateAsync({ id: transaction.id, values });
          router.back();
        } catch (e) {
          setErrorMessage(e instanceof Error ? e.message : t('edit.updateError'));
        }
      }}
      onDelete={async () => {
        setErrorMessage(null);
        try {
          await deleteMutation.mutateAsync(transaction.id);
          router.back();
        } catch (e) {
          setErrorMessage(e instanceof Error ? e.message : t('edit.deleteError'));
        }
      }}
    />
  );
}
