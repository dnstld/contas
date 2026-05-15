import { useHeaderHeight } from '@react-navigation/elements';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, SectionList, StyleSheet, View } from 'react-native';

import {
  Divider,
  EmptyState,
  FinanceTimeFilter,
  PriceText,
  Surface,
  Text,
  TransactionRow,
} from '@/components/ui';
import { buildTransactionsList } from '@/data/transactions-list';
import { useCurrency } from '@/hooks/use-currency';
import { useFinanceMock } from '@/hooks/use-finance-mock';
import { useFinanceTimeFilter } from '@/hooks/use-finance-time-filter';
import { useFormatters } from '@/hooks/use-formatters';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function TransactionsScreen() {
  const background = useThemeColor({}, 'background');
  const headerHeight = useHeaderHeight();
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const { locale } = useFormatters();

  const now = useMemo(() => new Date(), []);
  const filterApi = useFinanceTimeFilter(now);
  const { mock } = useFinanceMock();

  const { sections, totals } = useMemo(
    () =>
      buildTransactionsList(mock, filterApi.state, now, locale, {
        today: t('transactions.today'),
        yesterday: t('transactions.yesterday'),
      }),
    [mock, filterApi.state, now, locale, t],
  );

  const hasTransactions = sections.length > 0;
  const router = useRouter();

  const handlePressTransaction = useCallback(() => {
    router.push('/create');
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
      <View style={styles.header}>
        <FinanceTimeFilter api={filterApi} now={now} />

        <Surface variant="plain" bordered padding={16} style={styles.totalCard}>
          <Text variant="caption" tone="textMuted" weight="semibold">
            {t('transactions.net').toUpperCase()}
          </Text>
          <PriceText
            value={totals.net}
            currency={currency}
            locale={locale}
            tone="neutral"
            size="xl"
          />
        </Surface>
      </View>

      {hasTransactions ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
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
              onPress={handlePressTransaction}
            />
          )}
          ItemSeparatorComponent={Divider}
        />
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="chart.bar.fill"
            title={t('transactions.empty.title')}
            body={t('transactions.empty.body')}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    gap: 32,
  },
  totalCard: {
    gap: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 32,
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
