import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  CategoryGrid,
  Overview,
  Text,
  TimeFilterBar,
  Toggle,
} from '@/components/ui';
import { useFinanceDashboard } from '@/hooks/use-finance-dashboard';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTimeFilter } from '@/hooks/use-time-filter';

export default function HomeScreen() {
  const background = useThemeColor({}, 'background');
  const now = useMemo(() => new Date(), []);

  const filterApi = useTimeFilter({ storageKey: 'dashboard:time-filter:v2', now });
  const [revenueVisible, setRevenueVisible] = usePersistedState(
    'dashboard:revenue-visible',
    false,
  );

  const dashboard = useFinanceDashboard(filterApi.state, now);

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.content}
    >
      <TimeFilterBar api={filterApi} now={now} yearsRange={2} />

      <View style={styles.toggleRow}>
        <Text variant="body" tone="textMuted">
          Mostrar receitas
        </Text>
        <Toggle value={revenueVisible} onValueChange={setRevenueVisible} />
      </View>

      <Overview
        {...dashboard.overview}
        currency={dashboard.currency}
        revenueVisible={revenueVisible}
      />

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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
});
