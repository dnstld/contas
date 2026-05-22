import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

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
import { categoryDetailHref } from '@/constants/routes';
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

  const router = useRouter();
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

  const handleCategoryPress = useCallback(
    (id: string) => {
      router.push(categoryDetailHref(id, filterApi.state));
    },
    [router, filterApi.state],
  );

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

  if (dashboard.isLoading && !dashboard.data) {
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
  }

  if (dashboard.isError && !dashboard.data) {
    return (
      <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
        <View style={styles.errorWrap}>
          <EmptyState
            tone="error"
            title={t('errorFallback.title')}
            body={t('errorFallback.body')}
            actionLabel={t('errorFallback.retry')}
            onAction={() => {
              void dashboard.refetch();
            }}
          />
        </View>
      </View>
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
            <CategoryCard
              data={item}
              currency={currency}
              revenueVisible={revenueVisible}
              onPress={handleCategoryPress}
            />
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
  skeletonStack: {
    gap: 32,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
