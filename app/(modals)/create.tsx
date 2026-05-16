import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TransactionForm } from '@/components/transactions/transaction-form';
import { useCreateTransaction } from '@/hooks/use-finance-mutations';

export default function CreateScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const createMutation = useCreateTransaction();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <TransactionForm
      isSubmitting={createMutation.isPending}
      errorMessage={errorMessage}
      onSubmit={async (values) => {
        setErrorMessage(null);
        try {
          await createMutation.mutateAsync(values);
          router.back();
        } catch (e) {
          setErrorMessage(e instanceof Error ? e.message : t('create.error'));
        }
      }}
    />
  );
}
