import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, SectionList, StyleSheet, View } from 'react-native';

import {
  Divider,
  EmptyState,
  FinanceTimeFilter,
  PriceText,
  Surface,
  Text,
  TransactionListSkeleton,
  TransactionRow,
} from '@/components/ui';
import { editTransactionHref } from '@/constants/routes';
import type { Finance } from '@/data/finance-types';
import { buildTransactionsList } from '@/data/transactions-list';
import { useFinance } from '@/hooks/use-finance';
import { useFinanceTimeFilter } from '@/hooks/use-finance-time-filter';
import { useFormatters } from '@/hooks/use-formatters';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MONTHS } from '@/hooks/use-time-filter';
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
    () =>
      buildTransactionsList(data ?? EMPTY_FINANCE, filterApi.state, now, locale, {
        today: t('transactions.today'),
        yesterday: t('transactions.yesterday'),
      }),
    [data, filterApi.state, now, locale, t],
  );

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

  const listRef = useRef<SectionList>(null);
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
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<View style={styles.listHeader}>{totalCard}</View>}
          initialNumToRender={20}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: background }]}>
              <Text variant="caption" tone="textMuted" weight="semibold">
                {section.title.toUpperCase()}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TransactionRow
              transaction={item}
              currency={currency}
              onPress={() => handlePressTransaction(item.id)}
            />
          )}
          ItemSeparatorComponent={Divider}
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
    paddingTop: 32,
    paddingBottom: 32,
  },
  emptyHeader: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 64,
  },
  sectionHeader: {
    paddingVertical: 8,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
