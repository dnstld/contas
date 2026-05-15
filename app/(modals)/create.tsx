import { useRouter } from 'expo-router';

import { TransactionForm } from '@/components/transactions/transaction-form';

export default function CreateScreen() {
  const router = useRouter();

  return (
    <TransactionForm
      onSubmit={(values) => {
        console.log('create transaction', values);
        router.back();
      }}
      onClose={() => router.back()}
    />
  );
}
