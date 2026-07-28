import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState, Icon, SectionList, Surface, Text } from '@/components/ui';
import type { ListCardRowProps } from '@/components/ui/molecules/list-card-row';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import type { SectionListSection } from '@/components/ui/organisms/section-list';
import { MOCK_CATEGORIES, itemCountByCategory } from '@/data/__fixtures__/category-items';
import type { Category } from '@/data/finance-types';
import { useThemeColor } from '@/hooks/use-theme-color';

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

  const counts = itemCountByCategory();

  const toRow = (category: Category): Row => ({
    id: category.id,
    title: category.name,
    trailing: (
      <CountTrailing label={t('categoriesTab.itemCount', { count: counts[category.id] ?? 0 })} />
    ),
    // TODO(step 2): navigate to items screen
    onPress: () => {},
  });

  const expenseRows: Row[] = MOCK_CATEGORIES.filter((c) => c.type === 'expense').map(toRow);
  const incomeRows: Row[] = MOCK_CATEGORIES.filter((c) => c.type === 'income').map(toRow);

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

  if (MOCK_CATEGORIES.length === 0) {
    return (
      <ScrollView
        style={{ backgroundColor: background }}
        contentContainerStyle={styles.emptyContent}
      >
        <EmptyState
          icon="tag.fill"
          title={t('categoriesTab.empty.title')}
          body={t('categoriesTab.empty.subtitle')}
        />
      </ScrollView>
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

      <Surface padding={0} bordered>
        <SectionListRow
          {...ROW_DEFAULTS}
          leading={<Icon name="plus" size={18} tone="tint" />}
          title={t('categoriesTab.addCategory')}
          // TODO(step 5): open category form
          onPress={() => {}}
        />
      </Surface>
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
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
