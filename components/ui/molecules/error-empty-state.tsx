import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/molecules/empty-state';

export interface ErrorEmptyStateProps {
  messageKey: string;
  onRetry: () => void;
}

export function ErrorEmptyState({ messageKey, onRetry }: ErrorEmptyStateProps) {
  const { t } = useTranslation();
  return (
    <EmptyState
      tone="error"
      title={t('errorFallback.title')}
      body={t(messageKey)}
      actionLabel={t('errorFallback.retry')}
      onAction={onRetry}
    />
  );
}
