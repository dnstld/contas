import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DuplicateWarningModal } from '@/components/transactions/duplicate-warning-modal';
import { findDuplicateTransactions } from '@/components/transactions/find-duplicate-transactions';
import {
  TransactionForm,
  type TransactionFormValues,
} from '@/components/transactions/transaction-form';
import type { Transaction } from '@/data/finance-types';
import { useCreateTransaction } from '@/hooks/use-finance-mutations';
import { useTransactions } from '@/hooks/use-finance-queries';
import { useWalletMembers } from '@/hooks/use-wallet-members';
import { mapSupabaseErrorKey } from '@/utils/error';
import { toast } from '@/utils/toast';

export default function CreateScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const createMutation = useCreateTransaction();
  const { data: transactions = [] } = useTransactions();
  const { members } = useWalletMembers();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingValues, setPendingValues] = useState<TransactionFormValues | null>(null);
  const [duplicates, setDuplicates] = useState<Transaction[]>([]);

  const persist = async (values: TransactionFormValues) => {
    setErrorMessage(null);
    try {
      await createMutation.mutateAsync(values);
      toast.success(t('feedback.transactionCreated'));
      router.back();
    } catch (e) {
      // Use the localized Supabase-error key; raw error.message leaks
      // schema details and is always English.
      setErrorMessage(t(mapSupabaseErrorKey(e)));
    }
  };

  const handleSubmit = async (values: TransactionFormValues) => {
    const matches = findDuplicateTransactions(
      { date: values.date, amountCents: values.amountCents, categoryId: values.categoryId },
      transactions,
    );
    if (matches.length > 0) {
      setPendingValues(values);
      setDuplicates(matches);
      return;
    }
    await persist(values);
  };

  const handleConfirmDuplicate = async () => {
    if (!pendingValues) return;
    const values = pendingValues;
    await persist(values);
    setPendingValues(null);
    setDuplicates([]);
  };

  const handleCancelDuplicate = () => {
    setPendingValues(null);
    setDuplicates([]);
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: t('create.title') }} />
      <TransactionForm
        isSubmitting={createMutation.isPending}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
      />
      <DuplicateWarningModal
        visible={pendingValues !== null}
        transactions={duplicates}
        members={members}
        onConfirm={handleConfirmDuplicate}
        onCancel={handleCancelDuplicate}
        isSaving={createMutation.isPending}
      />
    </>
  );
}
