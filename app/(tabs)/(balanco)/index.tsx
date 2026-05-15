import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  CategoryGrid,
  Icon,
  Overview,
  Surface,
  Text,
  TimeFilterBar,
} from '@/components/ui';
import { useFinanceDashboard } from '@/hooks/use-finance-dashboard';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTimeFilter } from '@/hooks/use-time-filter';

export default function HomeScreen() {
  const background = useThemeColor({}, 'background');
  const now = useMemo(() => new Date(), []);

  const filterApi = useTimeFilter({ storageKey: 'dashboard:time-filter:v2', now });
  const [revenueVisible] = usePersistedState(
    'dashboard:revenue-visible',
    false,
  );
  const [demoMode] = usePersistedState('settings:demo-mode', false);

  const dashboard = useFinanceDashboard(filterApi.state, now);
  const hasTransactions = dashboard.mock.transactions.length > 0;
  const showEmptyNotice = !demoMode && !hasTransactions;

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.content}
    >
      <TimeFilterBar api={filterApi} now={now} yearsRange={2} />

      {showEmptyNotice ? (
        <Surface variant="muted" padding={12} bordered style={styles.notice}>
          <Icon name="sparkles" size={18} tone="tint" />
          <View style={styles.noticeText}>
            <Text variant="body" weight="semibold">
              Sem dados para exibir
            </Text>
            <Text variant="caption" tone="textMuted">
              Ative o Modo demo em Ajustes para ver dados de exemplo.
            </Text>
          </View>
        </Surface>
      ) : null}

      <Overview
        {...dashboard.overview}
        currency={dashboard.currency}
        revenueVisible={revenueVisible}
      />

      {demoMode ? (
        <Surface variant="muted" padding={12} bordered style={styles.notice}>
          <Icon name="sparkles" size={18} tone="tint" />
          <View style={styles.noticeText}>
            <Text variant="body" weight="semibold">
              Modo demo ativado
            </Text>
            <Text variant="caption" tone="textMuted">
              Os valores exibidos são dados de exemplo. Desative em Ajustes.
            </Text>
          </View>
        </Surface>
      ) : null}

      <CategoryGrid
        categories={dashboard.categories}
        filterItems={dashboard.filterItems}
        currency={dashboard.currency}
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
