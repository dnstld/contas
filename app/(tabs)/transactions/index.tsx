import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, SectionList as RNSectionList, StyleSheet, View } from 'react-native';

import {
  EmptyState,
  FinanceTimeFilter,
  PriceText,
  SectionList,
  Surface,
  Text,
  TransactionListSkeleton,
  TransactionRow,
} from '@/components/ui';
import type { SectionListSection } from '@/components/ui/organisms/section-list';
import { editTransactionHref } from '@/constants/routes';
import type { Finance, Transaction } from '@/data/finance-types';
import { buildTransactionsList, makeSectionLabeler } from '@/data/transactions-list';
import { useFinance } from '@/hooks/use-finance';
import { useFinanceTimeFilter } from '@/hooks/use-finance-time-filter';
import { useFormatters } from '@/hooks/use-formatters';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MONTHS } from '@/hooks/use-time-filter';
import { useTransactionCreators } from '@/hooks/use-transaction-creators';
import { useWallet } from '@/hooks/use-wallet';

const EMPTY_FINANCE: Finance = {
  years: [],
  currency: 'BRL',
  categories: [],
  transactions: [],
};

export default function TransactionsScreen() {
  const background = useThemeColor({}, 'background');
  const headerHeight = useHeaderHeight();
  const { t } = useTranslation();
  const { currency } = useWallet();
  const { locale, monthName } = useFormatters();

  const now = useMemo(() => new Date(), []);
  const filterApi = useFinanceTimeFilter(now);
  const { data, isLoading, isError, refetch } = useFinance();

  const { sections, totals, count } = useMemo(
    () => buildTransactionsList(data ?? EMPTY_FINANCE, filterApi.state, now),
    [data, filterApi.state, now],
  );

  const resolveCreator = useTransactionCreators();

  // Labeler is rebuilt on every render so HOJE/ONTEM stay correct as time
  // passes (e.g. when the user creates a transaction after midnight without
  // restarting the app). The grouped `sections` above are still cached.
  const labelFor = makeSectionLabeler(new Date(), locale, {
    today: t('transactions.today'),
    yesterday: t('transactions.yesterday'),
  });

  const listSections: SectionListSection<Transaction>[] = sections.map((s) => ({
    id: s.dayKey,
    title: labelFor(s),
    data: s.data,
  }));

  const hasTransactions = sections.length > 0;
  const showSkeleton = isLoading && !data;
  const showError = isError && !data;
  const showEmpty = !isLoading && !showError && !hasTransactions;
  const router = useRouter();

  const handlePressTransaction = useCallback(
    (transactionId: string) => {
      router.push(editTransactionHref(transactionId));
    },
    [router],
  );

  const listRef = useRef<RNSectionList<Transaction, SectionListSection<Transaction>>>(null);
  const skipFirstScrollReset = useRef(true);
  const filterKey = `${filterApi.state.years.join(',')}|${filterApi.state.months.join(',')}|${filterApi.state.all}`;

  useEffect(() => {
    if (skipFirstScrollReset.current) {
      skipFirstScrollReset.current = false;
      return;
    }
    listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: true });
  }, [filterKey]);

  const periodLabel = useMemo(() => {
    const year = filterApi.state.years[0] ?? now.getFullYear();
    if (filterApi.state.all) return String(year);
    const monthKey = filterApi.state.months[0] ?? MONTHS[now.getMonth()]!;
    return monthName(MONTHS.indexOf(monthKey), 'long');
  }, [filterApi.state, now, monthName]);

  const totalCard = (
    <Surface variant="plain" bordered padding={16} style={styles.totalCard}>
      <Text variant="caption" tone="textMuted" weight="semibold">
        {t('transactions.net').toUpperCase()}
      </Text>
      <PriceText value={totals.net} currency={currency} locale={locale} tone="neutral" size="xl" />
      <Text variant="caption" tone="textMuted">
        {t('transactions.countInPeriod', { count, period: periodLabel })}
      </Text>
    </Surface>
  );

  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
      <View style={styles.header}>
        <FinanceTimeFilter api={filterApi} now={now} availableYears={data?.years} />
      </View>

      {showSkeleton ? (
        <TransactionListSkeleton />
      ) : showError ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            tone="error"
            title={t('errorFallback.title')}
            body={t('errorFallback.body')}
            actionLabel={t('errorFallback.retry')}
            onAction={() => {
              void refetch();
            }}
          />
        </View>
      ) : hasTransactions ? (
        <SectionList<Transaction>
          ref={listRef}
          variant="flat"
          sections={listSections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<View style={styles.listHeader}>{totalCard}</View>}
          initialNumToRender={20}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ item }) => (
            <TransactionRow
              transaction={item}
              currency={currency}
              creator={resolveCreator(item.createdByUserId)}
              onPress={() => handlePressTransaction(item.id)}
            />
          )}
        />
      ) : showEmpty ? (
        <>
          <View style={styles.emptyHeader}>{totalCard}</View>
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="chart.bar.fill"
              title={t('transactions.empty.title')}
              body={t('transactions.empty.body')}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  totalCard: {
    gap: 8,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  emptyHeader: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  listContent: {
    paddingBottom: 64,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
