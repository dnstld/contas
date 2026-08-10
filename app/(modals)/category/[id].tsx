import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { CategoryDetailSkeleton, EmptyState, SectionList, TransactionRow } from '@/components/ui';
import { ErrorEmptyState } from '@/components/ui/molecules/error-empty-state';
import { StaleDataBanner } from '@/components/ui/molecules/stale-data-banner';
import type { SectionListSection } from '@/components/ui/organisms/section-list';
import { editTransactionHref } from '@/constants/routes';
import type { Finance, Transaction } from '@/data/finance-types';
import { buildTransactionsList, makeSectionLabeler } from '@/data/transactions-list';
import { useFinance } from '@/hooks/use-finance';
import { useFormatters } from '@/hooks/use-formatters';
import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { useNow } from '@/hooks/use-now';
import { toQueryView } from '@/hooks/use-query-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MONTHS, type Month, type TimeFilterState } from '@/hooks/use-time-filter';
import { useTransactionCreators } from '@/hooks/use-transaction-creators';
import { useWallet } from '@/hooks/use-wallet';

const EMPTY_FINANCE: Finance = {
  years: [],
  currency: 'BRL',
  categories: [],
  transactions: [],
};

function parseFilter(
  params: { years?: string; months?: string; all?: string },
  now: Date,
): TimeFilterState {
  const years = (params.years ?? '')
    .split(',')
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
  const months = (params.months ?? '')
    .split(',')
    .filter((s): s is Month => (MONTHS as readonly string[]).includes(s));
  const all = params.all === '1';
  return {
    years: years.length > 0 ? years : [now.getFullYear()],
    months: all ? [] : months.length > 0 ? months : [MONTHS[now.getMonth()]!],
    all,
  };
}

export default function CategoryDetailModal() {
  const background = useThemeColor({}, 'modalBackground');
  const bottomPadding = useModalBottomPadding();
  const router = useRouter();
  const { t } = useTranslation();
  const { currency } = useWallet();
  const { locale } = useFormatters();

  const params = useLocalSearchParams<{
    id: string;
    years?: string;
    months?: string;
    all?: string;
  }>();

  const now = useNow();
  const filter = useMemo(() => parseFilter(params, now), [params, now]);

  const financeQuery = useFinance();
  // Wallet-level empty. Category-level empty (this category has no
  // transactions in the chosen period) is handled by `hasTransactions` below.
  const view = toQueryView(financeQuery, {
    isEmpty: (d) => d.transactions.length === 0,
  });
  const finance = financeQuery.data ?? EMPTY_FINANCE;

  const filteredFinance = useMemo<Finance>(
    () => ({
      ...finance,
      transactions: finance.transactions.filter((tx) => tx.categoryId === params.id),
    }),
    [finance, params.id],
  );

  const { sections } = useMemo(
    () => buildTransactionsList(filteredFinance, filter, now),
    [filteredFinance, filter, now],
  );

  // Labeler is rebuilt on every render so HOJE/ONTEM stay correct against real
  // current time — `sections` themselves remain cached.
  const labelFor = makeSectionLabeler(new Date(), locale, {
    today: t('transactions.today'),
    yesterday: t('transactions.yesterday'),
  });

  const listSections: SectionListSection<Transaction>[] = sections.map((s) => ({
    id: s.dayKey,
    title: labelFor(s),
    data: s.data,
  }));

  const handlePressTransaction = useCallback(
    (transactionId: string) => {
      router.push(editTransactionHref(transactionId));
    },
    [router],
  );

  const resolveCreator = useTransactionCreators();

  const hasTransactions = sections.length > 0;

  const listOrEmpty = hasTransactions ? (
    <SectionList<Transaction>
      variant="flat"
      sections={listSections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      initialNumToRender={20}
      windowSize={10}
      removeClippedSubviews={Platform.OS === 'android'}
      renderItem={({ item }) => (
        <TransactionRow
          transaction={item}
          currency={currency}
          creator={resolveCreator(item.createdByUserId)}
          beneficiary={resolveCreator(item.onBehalfOfUserId)}
          editor={resolveCreator(item.updatedByUserId)}
          onPress={handlePressTransaction}
        />
      )}
    />
  ) : (
    <View style={styles.emptyWrap}>
      <EmptyState
        icon="chart.bar.fill"
        title={t('category.detail.empty.title')}
        body={t('category.detail.empty.body')}
      />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: background, paddingBottom: bottomPadding }]}>
      {(() => {
        switch (view.kind) {
          case 'loading':
            return <CategoryDetailSkeleton />;
          case 'error':
            return (
              <View style={styles.emptyWrap}>
                <ErrorEmptyState messageKey={view.errorKey} onRetry={view.retry} />
              </View>
            );
          case 'empty':
          case 'stale':
          case 'ready':
            return (
              <>
                {view.kind === 'stale' ? (
                  <StaleDataBanner messageKey={view.errorKey} onRetry={view.retry} />
                ) : null}
                {listOrEmpty}
              </>
            );
        }
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
