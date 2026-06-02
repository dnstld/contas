import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, StyleSheet, View } from 'react-native';

import { CategoryDetailSkeleton, Divider, EmptyState, Text, TransactionRow } from '@/components/ui';
import { editTransactionHref } from '@/constants/routes';
import type { Finance, Transaction } from '@/data/finance-types';
import {
  buildTransactionsList,
  makeSectionLabeler,
  type TransactionsSection,
} from '@/data/transactions-list';
import { useFinance } from '@/hooks/use-finance';
import { useFormatters } from '@/hooks/use-formatters';
import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
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

type Row =
  | { type: 'header'; id: string; section: TransactionsSection }
  | { type: 'item'; id: string; transaction: Transaction; showDivider: boolean };

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

  const now = useMemo(() => new Date(), []);
  const filter = useMemo(() => parseFilter(params, now), [params, now]);

  const { data, isLoading, isError, refetch } = useFinance();
  const finance = data ?? EMPTY_FINANCE;

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

  const rows = useMemo<Row[]>(() => {
    const flat: Row[] = [];
    for (let s = 0; s < sections.length; s++) {
      const section = sections[s]!;
      flat.push({ type: 'header', id: `header-${section.dayKey}`, section });
      for (let i = 0; i < section.data.length; i++) {
        const tx = section.data[i]!;
        flat.push({ type: 'item', id: tx.id, transaction: tx, showDivider: i > 0 });
      }
    }
    return flat;
  }, [sections]);

  const handlePressTransaction = useCallback(
    (transaction: Transaction) => {
      router.push(editTransactionHref(transaction.id));
    },
    [router],
  );

  const resolveCreator = useTransactionCreators();

  const hasTransactions = sections.length > 0;
  const showSkeleton = isLoading && !data;
  const showError = isError && !data;
  const showEmpty = !isLoading && !showError && !hasTransactions;

  const renderItem = useCallback(
    ({ item }: { item: unknown }) => {
      const row = item as Row;
      if (row.type === 'header') {
        return (
          <View style={[styles.sectionHeader, { backgroundColor: background }]}>
            <Text variant="caption" tone="textMuted" weight="semibold">
              {labelFor(row.section).toUpperCase()}
            </Text>
          </View>
        );
      }
      return (
        <>
          {row.showDivider ? <Divider /> : null}
          <TransactionRow
            transaction={row.transaction}
            currency={currency}
            creator={resolveCreator(row.transaction.createdByUserId)}
            onPress={() => handlePressTransaction(row.transaction)}
          />
        </>
      );
    },
    [background, currency, handlePressTransaction, labelFor, resolveCreator],
  );

  return (
    <View style={[styles.root, { backgroundColor: background, paddingBottom: bottomPadding }]}>
      {showSkeleton ? (
        <CategoryDetailSkeleton />
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
        <FlatList
          data={rows}
          keyExtractor={(item: unknown) => (item as Row).id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={renderItem}
        />
      ) : showEmpty ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="chart.bar.fill"
            title={t('category.detail.empty.title')}
            body={t('category.detail.empty.body')}
          />
        </View>
      ) : null}
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
  sectionHeader: {
    paddingVertical: 8,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
