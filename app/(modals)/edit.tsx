import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  TransactionForm,
  type TransactionFormValues,
} from '@/components/transactions/transaction-form';
import { transactionDate } from '@/data/finance-types';
import { useDeleteTransaction, useUpdateTransaction } from '@/hooks/use-finance-mutations';
import { useTransaction } from '@/hooks/use-finance-queries';
import { getErrorMessage } from '@/utils/error';

export default function EditScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transaction, isLoading } = useTransaction(id ?? null);
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && transaction === null) {
      router.back();
    }
  }, [isLoading, transaction, router]);

  if (!transaction) return null;

  const initialValues: Partial<TransactionFormValues> = {
    type: transaction.type,
    amountCents: Math.round(transaction.amount * 100),
    date: new Date(transactionDate(transaction)),
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
          setErrorMessage(getErrorMessage(e, t('edit.updateError')));
        }
      }}
      onDelete={async () => {
        setErrorMessage(null);
        try {
          await deleteMutation.mutateAsync(transaction.id);
          router.back();
        } catch (e) {
          setErrorMessage(getErrorMessage(e, t('edit.deleteError')));
        }
      }}
    />
  );
}
