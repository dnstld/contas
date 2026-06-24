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
import { ErrorEmptyState } from '@/components/ui/molecules/error-empty-state';
import { StaleDataBanner } from '@/components/ui/molecules/stale-data-banner';
import type { SectionListSection } from '@/components/ui/organisms/section-list';
import { editTransactionHref } from '@/constants/routes';
import type { Finance, Transaction } from '@/data/finance-types';
import { buildTransactionsList, makeSectionLabeler } from '@/data/transactions-list';
import { useFinance } from '@/hooks/use-finance';
import { useFinanceTimeFilter } from '@/hooks/use-finance-time-filter';
import { useFormatters } from '@/hooks/use-formatters';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useNow } from '@/hooks/use-now';
import { toQueryView } from '@/hooks/use-query-view';
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

  const now = useNow();
  const filterApi = useFinanceTimeFilter(now);
  const financeQuery = useFinance();
  const { data } = financeQuery;
  // Wallet-level empty (no transactions at all). Filter-level emptiness is
  // handled below via `hasTransactions` because it depends on `filterApi.state`.
  const view = toQueryView(financeQuery, {
    isEmpty: (d) => d.transactions.length === 0,
  });

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
      <View style={styles.headerRow}>
        <Text variant="caption" tone="textMuted" weight="semibold" numberOfLines={1}>
          {periodLabel.toUpperCase()}
        </Text>
        <Text variant="caption" tone="textMuted" numberOfLines={1}>
          {t('transactions.countShort', { count })}
        </Text>
      </View>
      <View style={styles.tilesRow}>
        <Surface variant="muted" padding={12} style={styles.tile}>
          <Text variant="caption" tone="textMuted">
            {t(filterApi.state.all ? 'transactions.spentYear' : 'transactions.spentMonth')}
          </Text>
          <PriceText
            value={totals.expenses}
            currency={currency}
            locale={locale}
            tone="neutral"
            size="lg"
          />
        </Surface>
        <Surface variant="muted" padding={12} style={styles.tile}>
          <Text variant="caption" tone="textMuted">
            {t('transactions.incoming')}
          </Text>
          <PriceText
            value={totals.income}
            currency={currency}
            locale={locale}
            tone="positive"
            size="lg"
          />
        </Surface>
      </View>
    </Surface>
  );

  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
      <View style={styles.header}>
        <FinanceTimeFilter api={filterApi} now={now} availableYears={data?.years} />
      </View>

      {(() => {
        switch (view.kind) {
          case 'loading':
            return <TransactionListSkeleton />;
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
                {hasTransactions ? (
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
                        onPress={handlePressTransaction}
                      />
                    )}
                  />
                ) : (
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
                )}
              </>
            );
        }
      })()}
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
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    gap: 4,
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
