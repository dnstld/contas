import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { PriceText } from '@/components/ui/atoms/price-text';
import { SegmentedControl } from '@/components/ui/atoms/segmented-control';
import { EmptyState } from '@/components/ui/molecules/empty-state';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import { SectionList, type SectionListSection } from '@/components/ui/organisms/section-list';
import { categoryItemFormHref } from '@/constants/routes';
import { type CategoryItem, parseDayStart } from '@/data/finance-types';
import { useCategories, useCategoryItems } from '@/hooks/use-finance-queries';
import { useFormatters } from '@/hooks/use-formatters';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';
import { categoryItemFormBridge, makeBridgeId } from '@/utils/modal-bridge';

type Segment = 'active' | 'archived';
type Row = CategoryItem;

export default function CategoryItemsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { currency = 'BRL' } = useWallet();
  const { formatDate } = useFormatters();
  const { id } = useLocalSearchParams<{ id: string }>();

  const backgroundColor = useThemeColor({}, 'modalBackground');

  const [segment, setSegment] = useState<Segment>('active');
  const [bridgeId] = useState(() => makeBridgeId());

  const { data: categories = [] } = useCategories();
  const { data: allItems = [], refetch } = useCategoryItems();

  // The item form closes then signals through the bridge; refetch so the list
  // reflects create/edit/archive/delete without a manual pull.
  useEffect(() => {
    return categoryItemFormBridge.subscribe(bridgeId, {
      changed: () => {
        refetch();
      },
    });
  }, [bridgeId, refetch]);

  const category = categories.find((c) => c.id === id);
  const items = useMemo(() => allItems.filter((it) => it.categoryId === id), [allItems, id]);
  const activeItems = items.filter((it) => !it.archivedAt);
  const archivedItems = items.filter((it) => it.archivedAt);

  const visibleItems = segment === 'active' ? activeItems : archivedItems;
  const sections: SectionListSection<Row>[] =
    visibleItems.length > 0 ? [{ id: segment, data: visibleItems }] : [];

  const segmentedOptions = [
    { value: 'active' as const, label: t('categoryItems.segments.active') },
    { value: 'archived' as const, label: t('categoryItems.segments.archived') },
  ];

  const shortDate = (day: string) =>
    formatDate(parseDayStart(day), { day: 'numeric', month: 'short' });

  const listHeader = (
    <View style={styles.listHeader}>
      <SegmentedControl<Segment> options={segmentedOptions} value={segment} onChange={setSegment} />

      {segment === 'active' ? (
        <PressableButton
          variant="primary"
          iconName="plus"
          label={t('categoryItems.addItem')}
          onPress={() => router.push(categoryItemFormHref({ categoryId: id, bridgeId }))}
        />
      ) : null}
    </View>
  );

  const emptyState =
    segment === 'active' ? (
      <EmptyState
        icon="tag.fill"
        title={t('categoryItems.empty.title')}
        body={t('categoryItems.empty.subtitle')}
      />
    ) : (
      <EmptyState
        icon="tag.fill"
        title={t('categoryItems.emptyArchived.title')}
        body={t('categoryItems.emptyArchived.subtitle')}
      />
    );

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <Stack.Screen options={{ headerTitle: category?.name ?? '' }} />

      <SectionList<Row>
        variant="flat"
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<View style={styles.emptyWrap}>{emptyState}</View>}
        renderItem={({ item }) => (
          <SectionListRow
            size="sm"
            density="comfortable"
            title={item.name}
            subtitle={recurrenceLine(item, t, shortDate)}
            text1={
              item.defaultAmount != null ? (
                <PriceText value={item.defaultAmount} currency={currency} />
              ) : undefined
            }
            trailing={<Icon name="chevron.right" size={16} tone="textMuted" />}
            onPress={() =>
              router.push(categoryItemFormHref({ categoryId: id, bridgeId, editId: item.id }))
            }
            accessibilityLabel={item.name}
          />
        )}
      />
    </View>
  );
}

/**
 * Presentation-only recurrence line for an item, e.g. "Todo mês, próximo 10
 * ago". Plain text so `ListCardRow` left-aligns it under the title.
 */
function recurrenceLine(
  item: CategoryItem,
  t: (key: string, opts?: Record<string, unknown>) => string,
  shortDate: (day: string) => string,
): string | undefined {
  switch (item.recurrence) {
    case 'monthly':
      return item.nextDueOn
        ? t('categoryItems.recurrence.monthly', { date: shortDate(item.nextDueOn) })
        : t('categoryItems.recurrence.monthlyNoDate');
    case 'weekly':
      return item.nextDueOn
        ? t('categoryItems.recurrence.weekly', { date: shortDate(item.nextDueOn) })
        : t('categoryItems.recurrence.weeklyNoDate');
    case 'yearly':
      return item.nextDueOn
        ? t('categoryItems.recurrence.yearly', { date: shortDate(item.nextDueOn) })
        : t('categoryItems.recurrence.yearlyNoDate');
    case 'daily':
      return t('categoryItems.recurrence.daily');
    case 'none':
      return undefined;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyWrap: {
    paddingTop: 32,
  },
});
