import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ModalActions, Surface } from '@/components/ui';
import { Icon } from '@/components/ui/atoms/icon';
import { PriceText } from '@/components/ui/atoms/price-text';
import { SegmentedControl } from '@/components/ui/atoms/segmented-control';
import { NotificationBanner } from '@/components/ui/molecules/notification-banner';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import { StickyFooter } from '@/components/ui/molecules/sticky-footer';
import { SectionList } from '@/components/ui/organisms/section-list';
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
  const [footerOverlap, setFooterOverlap] = useState(0);
  const [bridgeId] = useState(() => makeBridgeId());

  const { data: categories = [] } = useCategories();
  const { data: allItems = [], isLoading, refetch } = useCategoryItems();

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
  const isCategoryArchived = !!category?.archivedAt;
  const items = useMemo(() => allItems.filter((it) => it.categoryId === id), [allItems, id]);
  const active = items.filter((it) => !it.archivedAt);
  const archived = items.filter((it) => it.archivedAt);

  const visible = segment === 'archived' ? archived : active;
  const isEmpty = visible.length === 0;

  const segmentedOptions = [
    { value: 'active' as const, label: t('categoryItems.segments.active') },
    { value: 'archived' as const, label: t('categoryItems.segments.archived') },
  ];

  const shortDate = (day: string) =>
    formatDate(parseDayStart(day), { day: 'numeric', month: 'short' });

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <Stack.Screen options={{ headerTitle: category?.name ?? '' }} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <View style={styles.body}>
          {isCategoryArchived ? (
            <View style={styles.noticeWrap}>
              <Surface variant="plain" bordered padding={16}>
                <NotificationBanner
                  title={t('categoryItems.archivedNotice.title')}
                  subtitle={t('categoryItems.archivedNotice.body')}
                />
              </Surface>
            </View>
          ) : null}

          <View style={styles.tabs}>
            <SegmentedControl<Segment>
              options={segmentedOptions}
              value={segment}
              onChange={setSegment}
            />
          </View>

          {isEmpty ? (
            <View style={styles.bannerWrap}>
              <Surface variant="plain" bordered padding={16}>
                <NotificationBanner
                  title={t(
                    segment === 'archived'
                      ? 'categoryItems.archivedEmpty.title'
                      : 'categoryItems.welcome.title',
                  )}
                  subtitle={t(
                    segment === 'archived'
                      ? 'categoryItems.archivedEmpty.body'
                      : 'categoryItems.welcome.body',
                  )}
                />
              </Surface>
            </View>
          ) : (
            <SectionList<Row>
              variant="flat"
              sections={[{ id: segment, data: visible }]}
              keyExtractor={(item) => item.id}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={[styles.listContent, { paddingBottom: footerOverlap + 16 }]}
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
          )}
        </View>
      )}

      {isCategoryArchived ? null : (
        <StickyFooter onOverlapChange={setFooterOverlap}>
          <ModalActions
            primary={{
              label: t('categoryItems.addItem'),
              iconName: 'plus',
              onPress: () => {
                setSegment('active');
                router.push(categoryItemFormHref({ categoryId: id, bridgeId }));
              },
            }}
          />
        </StickyFooter>
      )}
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
  body: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  bannerWrap: {
    padding: 16,
  },
  noticeWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
});
