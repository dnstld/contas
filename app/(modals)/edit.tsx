import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import {
  TransactionForm,
  type TransactionFormValues,
} from '@/components/transactions/transaction-form';
import { Skeleton } from '@/components/ui/atoms/skeleton';
import { EmptyState } from '@/components/ui/molecules/empty-state';
import { transactionDate } from '@/data/finance-types';
import {
  isDemoModeReadOnlyError,
  useDeleteTransaction,
  useUpdateTransaction,
} from '@/hooks/use-finance-mutations';
import { useTransaction } from '@/hooks/use-finance-queries';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getErrorMessage } from '@/utils/error';
import { toast } from '@/utils/toast';

function EditSkeleton() {
  const background = useThemeColor({}, 'modalBackground');
  return (
    <View style={[styles.skeletonRoot, { backgroundColor: background }]}>
      <View style={styles.skeletonContent}>
        <Skeleton width="100%" height={36} borderRadius={999} />
        <View style={styles.skeletonAmount}>
          <Skeleton width={180} height={56} borderRadius={12} />
        </View>
        <Skeleton width="40%" height={12} />
        <Skeleton width="100%" height={44} borderRadius={10} />
        <Skeleton width="40%" height={12} />
        <Skeleton width="100%" height={56} borderRadius={10} />
        <Skeleton width="40%" height={12} />
        <Skeleton width="100%" height={88} borderRadius={10} />
      </View>
    </View>
  );
}

export default function EditScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionQuery = useTransaction(id ?? null);
  const { data: transaction, isLoading, isError } = transactionQuery;
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && transaction === null) {
      router.back();
    }
  }, [isLoading, transaction, router]);

  if (isLoading && !transaction) return <EditSkeleton />;
  if (isError && !transaction) {
    return (
      <View style={styles.errorWrap}>
        <EmptyState
          tone="error"
          title={t('errorFallback.title')}
          body={t('errorFallback.body')}
          actionLabel={t('errorFallback.retry')}
          onAction={() => {
            void transactionQuery.refetch();
          }}
        />
      </View>
    );
  }
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
          toast.success(t('feedback.transactionUpdated'));
          router.back();
        } catch (e) {
          if (isDemoModeReadOnlyError(e)) {
            setErrorMessage(t('edit.demoReadOnly'));
          } else {
            setErrorMessage(getErrorMessage(e, t('edit.updateError')));
          }
        }
      }}
      onDelete={() => {
        Alert.alert(t('edit.deleteConfirmTitle'), t('edit.deleteConfirmMessage'), [
          { text: t('edit.deleteConfirmCancel'), style: 'cancel' },
          {
            text: t('edit.deleteConfirmAction'),
            style: 'destructive',
            onPress: async () => {
              setErrorMessage(null);
              try {
                await deleteMutation.mutateAsync(transaction.id);
                toast.success(t('feedback.transactionDeleted'));
                router.back();
              } catch (e) {
                if (isDemoModeReadOnlyError(e)) {
                  setErrorMessage(t('edit.demoReadOnly'));
                } else {
                  setErrorMessage(getErrorMessage(e, t('edit.deleteError')));
                }
              }
            },
          },
        ]);
      }}
    />
  );
}

const styles = StyleSheet.create({
  skeletonRoot: {
    flex: 1,
  },
  skeletonContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 20,
  },
  skeletonAmount: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
