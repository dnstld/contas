import { useRouter } from 'expo-router';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
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
import { NotificationBanner } from '@/components/ui/molecules/notification-banner';
import { StaleDataBanner } from '@/components/ui/molecules/stale-data-banner';
import { categoryDetailHref, categoryFormHref } from '@/constants/routes';
import { buildDashboard } from '@/data/finance-aggregations';
import { generateExampleFinance, type ExampleNames } from '@/data/finance-example';
import { useCategoryGrid } from '@/hooks/use-category-grid';
import { useFinanceDashboard } from '@/hooks/use-finance-dashboard';
import { useFinanceTimeFilter } from '@/hooks/use-finance-time-filter';
import { useFormatters } from '@/hooks/use-formatters';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useNow } from '@/hooks/use-now';
import { toQueryView } from '@/hooks/use-query-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';

export default function HomeScreen() {
  const background = useThemeColor({}, 'background');
  const headerHeight = useHeaderHeight();
  const now = useNow();
  const { t } = useTranslation();
  const { locale } = useFormatters();
  const { currency, showRevenue } = useWallet();
  const revenueVisible = showRevenue ?? false;

  const router = useRouter();
  const bridgeId = useId();
  const filterApi = useFinanceTimeFilter(now);
  const dashboard = useFinanceDashboard(filterApi.state, now);
  const demoMode = dashboard.isDemo;

  const fresh = !dashboard.isLoading && dashboard.categories.length === 0;
  const noTransactions =
    !demoMode && !dashboard.isLoading && (dashboard.data?.transactions.length ?? 0) === 0;

  const exampleNames = useMemo<ExampleNames>(
    () => ({
      groceries: t('category.create.suggestions.expense.groceries'),
      pharmacy: t('category.create.suggestions.expense.pharmacy'),
      transport: t('category.create.suggestions.expense.transport'),
    }),
    [t],
  );

  // On a fresh wallet, build a believable sample from the demo generator and
  // feed it through the same grid pipeline so the cards sort/filter like real
  // ones. Each is badged "Example" and opens a read-only detail.
  const exampleDashboard = useMemo(
    () =>
      fresh
        ? buildDashboard(
            generateExampleFinance(currency, now, exampleNames),
            filterApi.state,
            now,
            locale,
          )
        : null,
    [fresh, currency, now, exampleNames, filterApi.state, locale],
  );

  const grid = useCategoryGrid({
    categories: exampleDashboard ? exampleDashboard.categories : dashboard.categories,
    currency,
    period: dashboard.mode,
  });

  // Both variants render a real `CategoryCard`. Real cards open detail + allow
  // edit; example cards open a read-only detail and carry an "Example" badge.
  type DisplayItem =
    | { kind: 'real'; id: string; data: (typeof grid.sorted)[number] }
    | { kind: 'example'; id: string; data: (typeof grid.sorted)[number] };

  const listRef = useRef<FlatList<DisplayItem>>(null);
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

  const displayItems = useMemo<DisplayItem[]>(
    () =>
      grid.sorted.map((d): DisplayItem =>
        fresh ? { kind: 'example', id: d.id, data: d } : { kind: 'real', id: d.id, data: d },
      ),
    [grid.sorted, fresh],
  );

  const header = (
    <View style={styles.headerStack}>
      <FinanceTimeFilter api={filterApi} now={now} availableYears={dashboard.data?.years} />

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
      ) : noTransactions ? (
        <NotificationBanner title={t('balance.tip.title')} subtitle={t('balance.tip.body')} />
      ) : null}

      <CategoryGridControls
        sortOptions={grid.sortOptions}
        sort={grid.sort}
        onSortChange={grid.setSort}
        filterItems={fresh ? [] : dashboard.filterItems}
        selectedIds={grid.selected}
        onSelectedChange={grid.setSelected}
        onCreateCategory={handleCreateCategory}
        createLabel={t('category.create.chipLabelCategory')}
        onEditCategory={fresh ? undefined : handleCategoryLongPress}
        title={t(noTransactions ? 'category.section.expensesEmpty' : 'category.section.expenses')}
        showSort={fresh || undefined}
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
          <FlatList<DisplayItem>
            ref={listRef}
            data={displayItems}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.content}
            ListHeaderComponent={header}
            columnWrapperStyle={styles.gridRow}
            ListEmptyComponent={
              <EmptyState
                icon="line.3.horizontal.decrease.circle"
                title={t('category.empty.title')}
                body={t('category.empty.body')}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.cell}>
                {item.kind === 'real' ? (
                  <CategoryCard
                    data={item.data}
                    currency={currency}
                    revenueVisible={revenueVisible}
                    onPress={handleCategoryPress}
                    onLongPress={handleCategoryLongPress}
                  />
                ) : (
                  <CategoryCard
                    data={item.data}
                    currency={currency}
                    revenueVisible={revenueVisible}
                    badgeLabel={t('category.exampleBadge')}
                    onPress={handleCategoryPress}
                  />
                )}
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
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  skeletonStack: {
    gap: 32,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
