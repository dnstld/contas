import { useRouter } from 'expo-router';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { DeleteRequestBanner } from '@/components/delete-request-banner';
import { PendingInviteBanner } from '@/components/pending-invite-banner';
import { WalletSelect } from '@/components/settings/wallet-select';
import {
  CategoryCard,
  CategoryGridControls,
  CategoryGridSkeleton,
  EmptyState,
  FinanceTimeFilter,
  Overview,
  OverviewSkeleton,
  Surface,
} from '@/components/ui';
import { ErrorEmptyState } from '@/components/ui/molecules/error-empty-state';
import { NotificationBanner } from '@/components/ui/molecules/notification-banner';
import { StaleDataBanner } from '@/components/ui/molecules/stale-data-banner';
import { UpcomingSummary } from '@/components/upcoming/upcoming-summary';
import { categoryDetailHref, categoryFormHref } from '@/constants/routes';
import { useCategoryGrid } from '@/hooks/use-category-grid';
import { useFinanceDashboard } from '@/hooks/use-finance-dashboard';
import { useFinanceTimeFilter } from '@/hooks/use-finance-time-filter';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useNow } from '@/hooks/use-now';
import { toQueryView } from '@/hooks/use-query-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';
import { categoryFormBridge } from '@/utils/modal-bridge';

export default function HomeScreen() {
  const background = useThemeColor({}, 'background');
  const headerHeight = useHeaderHeight();
  const now = useNow();
  const { t } = useTranslation();
  const { currency, showRevenue } = useWallet();
  const revenueVisible = showRevenue ?? false;

  const router = useRouter();
  const bridgeId = useId();
  const filterApi = useFinanceTimeFilter(now);
  const dashboard = useFinanceDashboard(filterApi.state, now);

  const noTransactions = !dashboard.isLoading && (dashboard.data?.transactions.length ?? 0) === 0;

  const grid = useCategoryGrid({
    categories: dashboard.categories,
    filterItems: dashboard.filterItems,
    currency,
  });

  type DisplayItem = { id: string; data: (typeof grid.sorted)[number] };

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

  // A newly created category has no transactions yet, so if the grid is
  // currently filtered to a specific subset of categories, the new one would
  // silently be excluded from `grid.sorted` (it's not in `selected`) even
  // though it *is* in the underlying data — looking like the screen "didn't
  // refresh". Clearing the filter (back to "All") on create guarantees it's
  // visible immediately. Also drop a deleted category out of the filter so an
  // edit-modal deletion doesn't leave a stale, now-nonexistent id selected.
  const { selected: gridSelected, setSelected: setGridSelected } = grid;
  useEffect(() => {
    return categoryFormBridge.subscribe(bridgeId, {
      created: () => setGridSelected([]),
      deleted: (id) => setGridSelected(gridSelected.filter((s) => s !== id)),
    });
  }, [bridgeId, setGridSelected, gridSelected]);

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
    () => grid.sorted.map((d): DisplayItem => ({ id: d.id, data: d })),
    [grid.sorted],
  );

  const header = (
    <View style={styles.headerStack}>
      <PendingInviteBanner />

      <DeleteRequestBanner />

      <WalletSelect />

      <FinanceTimeFilter api={filterApi} now={now} availableYears={dashboard.data?.years} />

      <Overview
        {...dashboard.overview}
        now={now}
        currency={currency}
        revenueVisible={revenueVisible}
        onSelectMonth={filterApi.toggleMonth}
      />

      <UpcomingSummary />

      <CategoryGridControls
        sortOptions={grid.sortOptions}
        sort={grid.sort}
        onSortChange={grid.setSort}
        filterItems={grid.filterItems}
        selectedIds={grid.selected}
        onSelectedChange={grid.setSelected}
        onCreateCategory={handleCreateCategory}
        createLabel={t('category.create.chipLabelCategory')}
        onEditCategory={handleCategoryLongPress}
        // Keep the sort menu visible whenever any categories exist, so the user
        // can switch back after landing on an empty kind (e.g. no income).
        showSort={dashboard.categories.length > 0}
        title={
          grid.sort === 'income'
            ? t('category.section.income')
            : t(noTransactions ? 'category.section.expensesEmpty' : 'category.section.expenses')
        }
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
            initialNumToRender={10}
            windowSize={10}
            // `removeClippedSubviews` is intentionally omitted: on a multi-column
            // grid with variable-height cards it can clip cells incorrectly, and
            // the category list is bounded, so there's nothing to gain.
            contentContainerStyle={styles.content}
            ListHeaderComponent={header}
            columnWrapperStyle={styles.gridRow}
            ListEmptyComponent={
              dashboard.categories.length === 0 ? (
                <Surface variant="plain" bordered padding={16}>
                  <NotificationBanner
                    title={t('balance.welcome.title')}
                    subtitle={t('balance.welcome.body')}
                  />
                </Surface>
              ) : (
                <EmptyState
                  title={t(
                    grid.sort === 'income'
                      ? 'category.gridEmpty.income.title'
                      : 'category.gridEmpty.expense.title',
                  )}
                  body={t(
                    grid.sort === 'income'
                      ? 'category.gridEmpty.income.body'
                      : 'category.gridEmpty.expense.body',
                  )}
                />
              )
            }
            renderItem={({ item }) => (
              <View style={styles.cell}>
                <CategoryCard
                  data={item.data}
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
    gap: 16,
    paddingBottom: 12,
  },
  cell: {
    flex: 1,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  skeletonStack: {
    gap: 16,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
