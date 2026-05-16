import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  CategoryGrid,
  FinanceTimeFilter,
  Icon,
  Overview,
  Surface,
  Text,
} from '@/components/ui';
import { useCurrency } from '@/hooks/use-currency';
import { useFinanceDashboard } from '@/hooks/use-finance-dashboard';
import { useFinanceTimeFilter } from '@/hooks/use-finance-time-filter';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function HomeScreen() {
  const background = useThemeColor({}, 'background');
  const now = useMemo(() => new Date(), []);
  const { t } = useTranslation();
  const { currency } = useCurrency();

  const filterApi = useFinanceTimeFilter(now);
  const [revenueVisible] = usePersistedState(
    'dashboard:revenue-visible',
    false,
  );
  const [demoMode] = usePersistedState('settings:demo-mode', false);

  const dashboard = useFinanceDashboard(filterApi.state, now);
  const hasTransactions = dashboard.mock.transactions.length > 0;
  const showEmptyNotice = !demoMode && !dashboard.loading && !hasTransactions;

  if (dashboard.loading && !hasTransactions) {
    return <View style={{ flex: 1, backgroundColor: background }} />;
  }

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.content}
    >
      <FinanceTimeFilter api={filterApi} now={now} />

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

      <Overview
        {...dashboard.overview}
        currency={currency}
        revenueVisible={revenueVisible}
      />

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

      <CategoryGrid
        categories={dashboard.categories}
        filterItems={dashboard.filterItems}
        currency={currency}
        revenueVisible={revenueVisible}
        period={dashboard.mode}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 64,
    gap: 32,
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
});
