import { useRouter } from 'expo-router';
import { useCallback, useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import {
  CategoryCard,
  CategoryGridControls,
  CategoryGridSkeleton,
  EmptyState,
  FinanceTimeFilter,
  Icon,
  Overview,
  OverviewSkeleton,
  Surface,
  Text,
} from '@/components/ui';
import { ErrorEmptyState } from '@/components/ui/molecules/error-empty-state';
import { StaleDataBanner } from '@/components/ui/molecules/stale-data-banner';
import { categoryDetailHref, categoryFormHref } from '@/constants/routes';
import { useCategoryGrid } from '@/hooks/use-category-grid';
import { useFinanceDashboard } from '@/hooks/use-finance-dashboard';
import { useFinanceTimeFilter } from '@/hooks/use-finance-time-filter';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useNow } from '@/hooks/use-now';
import { toQueryView } from '@/hooks/use-query-view';
import { useRevenueVisible } from '@/hooks/use-revenue-visible';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';

export default function HomeScreen() {
  const background = useThemeColor({}, 'background');
  const headerHeight = useHeaderHeight();
  const now = useNow();
  const { t } = useTranslation();
  const { currency } = useWallet();

  const router = useRouter();
  const bridgeId = useId();
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

  const listRef = useRef<FlatList<(typeof grid.sorted)[number]>>(null);
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

  const handleCategoryPress = useCallback(
    (id: string) => {
      router.push(categoryDetailHref(id, filterApi.state));
    },
    [router, filterApi.state],
  );

  const handleCategoryLongPress = useCallback(
    (id: string) => {
      router.push(categoryFormHref({ bridgeId, editId: id }));
    },
    [router, bridgeId],
  );

  const handleCreateCategory = useCallback(() => {
    router.push(categoryFormHref({ bridgeId }));
  }, [router, bridgeId]);

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
        onCreateCategory={handleCreateCategory}
        summary={grid.summary}
      />
    </View>
  );

  // Wallet-level empty (fresh wallet, no transactions). The unfiltered
  // category list is shown via `ListEmptyComponent` further down.
  const view = toQueryView(dashboard, {
    isEmpty: (d) => d.transactions.length === 0,
  });

  switch (view.kind) {
    case 'loading':
      return (
        <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
          <ScrollView contentContainerStyle={styles.content} scrollEnabled={false}>
            <View style={styles.skeletonStack}>
              <OverviewSkeleton />
              <CategoryGridSkeleton />
            </View>
          </ScrollView>
        </View>
      );
    case 'error':
      return (
        <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
          <View style={styles.errorWrap}>
            <ErrorEmptyState messageKey={view.errorKey} onRetry={view.retry} />
          </View>
        </View>
      );
    case 'empty':
    case 'stale':
    case 'ready':
      return (
        <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
          {view.kind === 'stale' ? (
            <StaleDataBanner messageKey={view.errorKey} onRetry={view.retry} />
          ) : null}
          <FlatList
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
                <CategoryCard
                  data={item}
                  currency={currency}
                  revenueVisible={revenueVisible}
                  onPress={handleCategoryPress}
                  onLongPress={handleCategoryLongPress}
                />
              </View>
            )}
          />
        </View>
      );
  }
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
    flex: 1,
    padding: 6,
  },
  skeletonStack: {
    gap: 32,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
