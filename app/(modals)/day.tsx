import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { EmptyState, PriceText, SectionList, Surface, Text, TransactionRow } from '@/components/ui';
import { ErrorEmptyState } from '@/components/ui/molecules/error-empty-state';
import { StaleDataBanner } from '@/components/ui/molecules/stale-data-banner';
import type { SectionListSection } from '@/components/ui/organisms/section-list';
import { editTransactionHref } from '@/constants/routes';
import { parseDayStart, transactionDate, type Transaction } from '@/data/finance-types';
import { useFinance } from '@/hooks/use-finance';
import { useFormatters } from '@/hooks/use-formatters';
import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { useNow } from '@/hooks/use-now';
import { toQueryView } from '@/hooks/use-query-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTransactionCreators } from '@/hooks/use-transaction-creators';
import { useWallet } from '@/hooks/use-wallet';
import { formatRelativeDate } from '@/utils/format';

/**
 * Everything recorded on one calendar day, opened from a card in the overview's
 * per-day strip. The strip could show the amount but never what it was, so the
 * cards were dead ends; this is where "what did I spend on Tuesday" lands.
 */
export default function DayDetailModal() {
  const background = useThemeColor({}, 'modalBackground');
  const bottomPadding = useModalBottomPadding();
  const router = useRouter();
  const { t } = useTranslation();
  const { currency } = useWallet();
  const { locale } = useFormatters();
  const now = useNow();

  const { date } = useLocalSearchParams<{ date: string }>();

  const financeQuery = useFinance();
  const view = toQueryView(financeQuery, { isEmpty: (d) => d.transactions.length === 0 });

  const { rows, expenses, income } = useMemo(() => {
    const all = financeQuery.data?.transactions ?? [];
    // The strip counts completed expenses; the day view shows everything
    // recorded that day, because "what happened on Tuesday" includes income.
    const forDay = all.filter((tx) => transactionDate(tx) === date);
    let e = 0;
    let i = 0;
    for (const tx of forDay) {
      if (tx.status !== 'completed') continue;
      if (tx.type === 'expense') e += tx.amount;
      else i += tx.amount;
    }
    // Largest first — on a day with a dozen rows the big one is the answer.
    const sorted = forDay.slice().sort((a, b) => b.amount - a.amount);
    return { rows: sorted, expenses: e, income: i };
  }, [financeQuery.data, date]);

  const resolveCreator = useTransactionCreators();

  const handlePressTransaction = useCallback(
    (transactionId: string) => {
      router.push(editTransactionHref(transactionId));
    },
    [router],
  );

  const title = date
    ? formatRelativeDate(parseDayStart(date), now, locale, {
        today: t('transactions.today'),
        yesterday: t('transactions.yesterday'),
      })
    : '';

  const sections: SectionListSection<Transaction>[] =
    rows.length > 0 ? [{ id: 'day', data: rows }] : [];

  const summary = (
    <Surface variant="plain" bordered padding={16} style={styles.summary}>
      <Text variant="caption" tone="textMuted" weight="semibold">
        {t('overview.expenses').toUpperCase()}
      </Text>
      <PriceText value={expenses} currency={currency} size="xl" />
      {income > 0 ? (
        <Text variant="caption" tone="textMuted">
          {t('overview.revenue')}
        </Text>
      ) : null}
      {income > 0 ? (
        <PriceText value={income} currency={currency} tone="positive" size="md" />
      ) : null}
    </Surface>
  );

  return (
    <View style={[styles.root, { backgroundColor: background, paddingBottom: bottomPadding }]}>
      <Stack.Screen options={{ headerTitle: title }} />

      {(() => {
        switch (view.kind) {
          case 'loading':
            return null;
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
                {rows.length > 0 ? (
                  <SectionList<Transaction>
                    variant="flat"
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    stickySectionHeadersEnabled={false}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={summary}
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
                      title={t('day.empty.title')}
                      body={t('day.empty.body')}
                    />
                  </View>
                )}
              </>
            );
        }
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { padding: 16, gap: 8 },
  summary: { gap: 2, marginBottom: 8 },
  emptyWrap: { flex: 1, justifyContent: 'center', padding: 24 },
});
