import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TransactionForm } from '@/components/transactions/transaction-form';
import { isDemoModeReadOnlyError, useCreateTransaction } from '@/hooks/use-finance-mutations';
import { getErrorMessage } from '@/utils/error';

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
          if (isDemoModeReadOnlyError(e)) {
            setErrorMessage(t('edit.demoReadOnly'));
          } else {
            setErrorMessage(getErrorMessage(e, t('create.error')));
          }
        }
      }}
    />
  );
}
