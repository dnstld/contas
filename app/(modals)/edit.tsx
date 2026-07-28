import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import {
  TransactionForm,
  type TransactionFormValues,
} from '@/components/transactions/transaction-form';
import { Skeleton } from '@/components/ui/atoms/skeleton';
import { ErrorEmptyState } from '@/components/ui/molecules/error-empty-state';
import { StaleDataBanner } from '@/components/ui/molecules/stale-data-banner';
import { txDate } from '@/data/finance-types';
import { useDeleteTransaction, useUpdateTransaction } from '@/hooks/use-finance-mutations';
import { useTransaction } from '@/hooks/use-finance-queries';
import { toQueryView } from '@/hooks/use-query-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { mapSupabaseErrorKey } from '@/utils/error';
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
  const view = toQueryView(transactionQuery, { isEmpty: (d) => d === null });
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (view.kind === 'empty') {
      router.back();
    }
  }, [view.kind, router]);

  if (view.kind === 'loading') return <EditSkeleton />;
  if (view.kind === 'error') {
    return (
      <View style={styles.errorWrap}>
        <ErrorEmptyState messageKey={view.errorKey} onRetry={view.retry} />
      </View>
    );
  }
  if (view.kind === 'empty') return null;
  const transaction = view.data;
  if (transaction === null) return null;
  const staleBanner =
    view.kind === 'stale' ? (
      <StaleDataBanner messageKey={view.errorKey} onRetry={view.retry} />
    ) : null;

  const initialValues: Partial<TransactionFormValues> = {
    type: transaction.type,
    amountCents: Math.round(transaction.amount * 100),
    date: txDate(transaction),
    categoryId: transaction.categoryId,
    description: transaction.description,
    onBehalfOfUserId: transaction.onBehalfOfUserId,
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: t('edit.title') }} />
      {staleBanner}
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
            // Use the localized Supabase-error key, not raw error.message —
            // raw messages leak schema details and are always English.
            setErrorMessage(t(mapSupabaseErrorKey(e)));
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
                  setErrorMessage(t(mapSupabaseErrorKey(e)));
                }
              },
            },
          ]);
        }}
      />
    </>
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
