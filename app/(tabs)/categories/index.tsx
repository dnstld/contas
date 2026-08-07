import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, SectionList, Surface, Text } from '@/components/ui';
import { Badge } from '@/components/ui/atoms/badge';
import { SegmentedControl } from '@/components/ui/atoms/segmented-control';
import type { ListCardRowProps } from '@/components/ui/molecules/list-card-row';
import { NotificationBanner } from '@/components/ui/molecules/notification-banner';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import type { SectionListSection } from '@/components/ui/organisms/section-list';
import { categoryFormHref, categoryItemsHref } from '@/constants/routes';
import type { Category } from '@/data/finance-types';
import { useCategories, useCategoryItems } from '@/hooks/use-finance-queries';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useThemeColor } from '@/hooks/use-theme-color';
import { categoryFormBridge, makeBridgeId } from '@/utils/modal-bridge';

type Row = ListCardRowProps & { id: string };
type Segment = 'active' | 'archived';

const ROW_DEFAULTS: Pick<ListCardRowProps, 'size' | 'density'> = {
  size: 'sm',
  density: 'comfortable',
};

const renderRow = ({ item }: { item: Row }) => {
  const { id: _id, ...props } = item;
  return <SectionListRow {...ROW_DEFAULTS} {...props} />;
};

const keyExtractor = (item: Row) => item.id;

function CountTrailing({ label }: { label: string }) {
  return (
    <View style={styles.trailing}>
      <Text variant="caption" tone="textMuted">
        {label}
      </Text>
      <Icon name="chevron.right" size={16} tone="textMuted" />
    </View>
  );
}

export default function CategoriesScreen() {
  const background = useThemeColor({}, 'background');
  const headerHeight = useHeaderHeight();
  const { t } = useTranslation();
  const router = useRouter();

  const [bridgeId] = useState(() => makeBridgeId());
  const [segment, setSegment] = useState<Segment>('active');

  const { data: categories = [], isLoading, refetch } = useCategories();
  const { data: items = [] } = useCategoryItems();

  // A category created/deleted/archived from the `category-form` modal signals
  // here so the list refreshes once the modal closes.
  useEffect(() => {
    return categoryFormBridge.subscribe(bridgeId, {
      created: () => {
        refetch();
      },
      deleted: () => {
        refetch();
      },
      archived: () => {
        refetch();
      },
    });
  }, [bridgeId, refetch]);

  // Non-archived item count per category.
  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const item of items) {
      if (item.archivedAt) continue;
      acc[item.categoryId] = (acc[item.categoryId] ?? 0) + 1;
    }
    return acc;
  }, [items]);

  const toRow = (category: Category): Row => ({
    id: category.id,
    title: category.archivedAt ? (
      <View style={styles.titleRow}>
        <Text variant="body" weight="medium" numberOfLines={1} style={styles.titleName}>
          {category.name}
        </Text>
        <Badge label={t('category.archivedBadge')} tone="neutral" />
      </View>
    ) : (
      category.name
    ),
    trailing: (
      <CountTrailing label={t('categoriesTab.itemCount', { count: counts[category.id] ?? 0 })} />
    ),
    // Archived rows tap straight into the form (where Unarchive lives), matching
    // how tapping an archived item opens the item form. Drilling into an archived
    // category's items is a dead-end, so we don't route there.
    onPress: () =>
      router.push(
        category.archivedAt
          ? categoryFormHref({ editId: category.id, bridgeId })
          : categoryItemsHref(category.id),
      ),
    onLongPress: () => router.push(categoryFormHref({ editId: category.id, bridgeId })),
    accessibilityLabel: category.archivedAt
      ? `${category.name}, ${t('category.archivedBadge')}`
      : category.name,
  });

  const hasArchived = categories.some((c) => c.archivedAt);
  const visibleCategories = categories.filter((c) =>
    segment === 'archived' ? c.archivedAt : !c.archivedAt,
  );

  const expenseRows: Row[] = visibleCategories.filter((c) => c.type === 'expense').map(toRow);
  const incomeRows: Row[] = visibleCategories.filter((c) => c.type === 'income').map(toRow);
  const isSegmentEmpty = expenseRows.length === 0 && incomeRows.length === 0;

  const sections: SectionListSection<Row>[] = [
    {
      id: 'expenses',
      title: t('categoriesTab.sections.expenses'),
      data: expenseRows,
    },
    // Income section is hidden by the SectionList when it has no rows.
    {
      id: 'income',
      title: t('categoriesTab.sections.income'),
      data: incomeRows,
    },
  ];

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: background, paddingTop: headerHeight }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (categories.length === 0) {
    const parseSuggestions = (type: 'expense' | 'income') =>
      t(`categorySelect.suggestions.${type}`)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const suggestionRow =
      (type: 'expense' | 'income') =>
      (name: string): Row => ({
        id: `sugg-${type}-${name}`,
        title: name,
        trailing: <Icon name="plus" size={20} tone="tint" />,
        onPress: () => router.push(categoryFormHref({ type, prefillName: name, bridgeId })),
      });

    const suggestionSections: SectionListSection<Row>[] = [
      {
        id: 'sugg-expense',
        title: t('categoriesTab.sections.expenses'),
        data: parseSuggestions('expense').map(suggestionRow('expense')),
      },
      {
        id: 'sugg-income',
        title: t('categoriesTab.sections.income'),
        data: parseSuggestions('income').map(suggestionRow('income')),
      },
    ];

    return (
      <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Surface variant="plain" bordered padding={16}>
            <NotificationBanner
              title={t('categoriesTab.welcome.title')}
              subtitle={t('categoriesTab.welcome.body')}
            />
          </Surface>
          <SectionList<Row>
            variant="card"
            scrollEnabled={false}
            keyExtractor={keyExtractor}
            renderItem={renderRow}
            sections={suggestionSections}
          />
        </ScrollView>
      </View>
    );
  }

  const segmentedOptions = [
    { value: 'active' as const, label: t('categoriesTab.segments.active') },
    { value: 'archived' as const, label: t('categoriesTab.segments.archived') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {hasArchived ? (
          <SegmentedControl<Segment>
            options={segmentedOptions}
            value={segment}
            onChange={setSegment}
          />
        ) : null}

        {isSegmentEmpty ? (
          <Surface variant="plain" bordered padding={16}>
            <NotificationBanner
              title={t(
                segment === 'archived'
                  ? 'categoriesTab.archivedEmpty.title'
                  : 'categoriesTab.welcome.title',
              )}
              subtitle={t(
                segment === 'archived'
                  ? 'categoriesTab.archivedEmpty.body'
                  : 'categoriesTab.welcome.body',
              )}
            />
          </Surface>
        ) : (
          <SectionList<Row>
            variant="card"
            scrollEnabled={false}
            keyExtractor={keyExtractor}
            renderItem={renderRow}
            sections={sections}
          />
        )}
        <View style={styles.hint}>
          <Icon name="hand.tap" size={14} tone="textMuted" />
          <Text variant="caption" tone="textMuted">
            {t('category.pressAndHoldHint')}
          </Text>
        </View>
      </ScrollView>
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
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  titleName: {
    flexShrink: 1,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
});
