import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  CategoryCard,
  CategoryGridControls,
  EmptyState,
  FinanceTimeFilter,
  Icon,
  Overview,
  Surface,
  Text,
} from '@/components/ui';
import { useCategoryGrid } from '@/hooks/use-category-grid';
import { useFinanceDashboard } from '@/hooks/use-finance-dashboard';
import { useFinanceTimeFilter } from '@/hooks/use-finance-time-filter';
import { useRevenueVisible } from '@/hooks/use-revenue-visible';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';

export default function HomeScreen() {
  const background = useThemeColor({}, 'background');
  const headerHeight = useHeaderHeight();
  const now = useMemo(() => new Date(), []);
  const { t } = useTranslation();
  const { currency } = useWallet();

  const filterApi = useFinanceTimeFilter(now);
  const [revenueVisible] = useRevenueVisible();
  const dashboard = useFinanceDashboard(filterApi.state, now);
  const hasTransactions = (dashboard.data?.transactions.length ?? 0) > 0;
  const demoMode = dashboard.isDemo;
  const showEmptyNotice = !demoMode && !dashboard.isLoading && !hasTransactions;

  const grid = useCategoryGrid({
    categories: dashboard.categories,
    currency,
    period: dashboard.mode,
  });

  const listRef = useRef<React.ComponentRef<typeof FlashList<(typeof grid.sorted)[number]>>>(null);
  const skipFirstScrollReset = useRef(true);
  const filterKey = `${filterApi.state.years.join(',')}|${filterApi.state.months.join(',')}|${filterApi.state.all}`;
  const selectedKey = grid.selected.join(',');

  useEffect(() => {
    if (skipFirstScrollReset.current) {
      skipFirstScrollReset.current = false;
      return;
    }
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [filterKey, selectedKey]);

  const header = (
    <View style={styles.headerStack}>
      <FinanceTimeFilter api={filterApi} now={now} availableYears={dashboard.data?.years} />

      {showEmptyNotice ? (
        <Surface variant="muted" padding={12} bordered style={styles.notice}>
          <Icon name="sparkles" size={18} tone="tint" />
          <View style={styles.noticeText}>
            <Text variant="body" weight="semibold">
              {t('balance.empty.title')}
            </Text>
            <Text variant="caption" tone="textMuted">
              {t('balance.empty.body')}
            </Text>
          </View>
        </Surface>
      ) : null}

      <Overview {...dashboard.overview} currency={currency} revenueVisible={revenueVisible} />

      {demoMode ? (
        <Surface variant="muted" padding={12} bordered style={styles.notice}>
          <Icon name="sparkles" size={18} tone="tint" />
          <View style={styles.noticeText}>
            <Text variant="body" weight="semibold">
              {t('balance.demoBadge.title')}
            </Text>
            <Text variant="caption" tone="textMuted">
              {t('balance.demoBadge.body')}
            </Text>
          </View>
        </Surface>
      ) : null}

      <CategoryGridControls
        sortOptions={grid.sortOptions}
        sort={grid.sort}
        onSortChange={grid.setSort}
        filterItems={dashboard.filterItems}
        selectedIds={grid.selected}
        onSelectedChange={grid.setSelected}
        summary={grid.summary}
      />
    </View>
  );

  if (dashboard.isLoading && !hasTransactions) {
    return (
      <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]} />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
      <FlashList
        ref={listRef}
        data={grid.sorted}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListEmptyComponent={
          dashboard.categories.length === 0 ? null : (
            <EmptyState
              icon="line.3.horizontal.decrease.circle"
              title={t('category.empty.title')}
              body={t('category.empty.body')}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <CategoryCard data={item} currency={currency} revenueVisible={revenueVisible} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 64,
  },
  headerStack: {
    gap: 32,
    paddingBottom: 12,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noticeText: {
    flex: 1,
    gap: 2,
  },
  cell: {
    padding: 6,
  },
});
