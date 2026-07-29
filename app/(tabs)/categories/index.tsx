import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState, Icon, PressableButton, SectionList, Text } from '@/components/ui';
import type { ListCardRowProps } from '@/components/ui/molecules/list-card-row';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import type { SectionListSection } from '@/components/ui/organisms/section-list';
import { categoryFormHref, categoryItemsHref } from '@/constants/routes';
import type { Category } from '@/data/finance-types';
import { useCategories, useCategoryItems } from '@/hooks/use-finance-queries';
import { useThemeColor } from '@/hooks/use-theme-color';
import { categoryFormBridge, makeBridgeId } from '@/utils/modal-bridge';

type Row = ListCardRowProps & { id: string };

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
  const { t } = useTranslation();
  const router = useRouter();

  const [bridgeId] = useState(() => makeBridgeId());

  const { data: categories = [], isLoading, refetch } = useCategories();
  const { data: items = [] } = useCategoryItems();

  // A category created/deleted from the `category-form` modal signals here so
  // the list refreshes once the modal closes.
  useEffect(() => {
    return categoryFormBridge.subscribe(bridgeId, {
      created: () => {
        refetch();
      },
      deleted: () => {
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
    title: category.name,
    trailing: (
      <CountTrailing label={t('categoriesTab.itemCount', { count: counts[category.id] ?? 0 })} />
    ),
    onPress: () => router.push(categoryItemsHref(category.id)),
  });

  const expenseRows: Row[] = categories.filter((c) => c.type === 'expense').map(toRow);
  const incomeRows: Row[] = categories.filter((c) => c.type === 'income').map(toRow);

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

  const openCategoryForm = () => router.push(categoryFormHref({ bridgeId }));

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: background }]}>
        <EmptyState
          icon="tag.fill"
          title={t('categoriesTab.empty.title')}
          body={t('categoriesTab.empty.subtitle')}
        />
        <PressableButton
          variant="primary"
          iconName="plus"
          label={t('categoriesTab.addCategory')}
          onPress={openCategoryForm}
        />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.content}>
      <SectionList<Row>
        variant="card"
        scrollEnabled={false}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        sections={sections}
      />

      <PressableButton
        variant="primary"
        iconName="plus"
        label={t('categoriesTab.addCategory')}
        onPress={openCategoryForm}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 64,
    gap: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 20,
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
});
