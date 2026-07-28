import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/atoms/avatar';
import { Badge } from '@/components/ui/atoms/badge';
import { Icon } from '@/components/ui/atoms/icon';
import { PriceText } from '@/components/ui/atoms/price-text';
import { EmptyState } from '@/components/ui/molecules/empty-state';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import { SectionList, type SectionListSection } from '@/components/ui/organisms/section-list';
import { UPCOMING_AVATAR_TONES } from '@/components/upcoming/tones';
import { categoryItemFormHref } from '@/constants/routes';
import { upcomingExpenseItems } from '@/data/__fixtures__/category-items';
import { parseDayStart, toDayString, type CategoryItem } from '@/data/finance-types';
import { useFormatters } from '@/hooks/use-formatters';
import { useNow } from '@/hooks/use-now';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';

type Row = CategoryItem;

export default function UpcomingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const now = useNow();
  const { currency = 'BRL' } = useWallet();
  const { formatDate } = useFormatters();

  const backgroundColor = useThemeColor({}, 'modalBackground');

  const items = upcomingExpenseItems();
  const todayStart = parseDayStart(toDayString(now));

  const sections: SectionListSection<Row>[] =
    items.length > 0 ? [{ id: 'upcoming', data: items }] : [];

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <Stack.Screen options={{ headerTitle: t('upcoming.title') }} />

      <SectionList<Row>
        variant="flat"
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="tag.fill"
              title={t('upcoming.empty.title')}
              body={t('upcoming.empty.subtitle')}
            />
          </View>
        }
        renderItem={({ item, index }) => {
          const overdue = !!item.nextDueOn && parseDayStart(item.nextDueOn) < todayStart;
          return (
            <SectionListRow
              size="sm"
              density="comfortable"
              leading={
                <Avatar
                  size="sm"
                  name={item.name}
                  tone={UPCOMING_AVATAR_TONES[index % UPCOMING_AVATAR_TONES.length]}
                />
              }
              title={item.name}
              subtitle={
                item.nextDueOn
                  ? t('upcoming.next', {
                      date: formatDate(parseDayStart(item.nextDueOn), {
                        day: 'numeric',
                        month: 'short',
                      }),
                    })
                  : undefined
              }
              text1={
                <View style={styles.amountCell}>
                  {overdue ? (
                    <Badge label={t('upcoming.overdue')} tone="negative" variant="soft" />
                  ) : null}
                  {item.defaultAmount != null ? (
                    <PriceText value={item.defaultAmount} currency={currency} />
                  ) : null}
                </View>
              }
              trailing={<Icon name="chevron.right" size={16} tone="textMuted" />}
              onPress={() =>
                router.push(categoryItemFormHref({ categoryId: item.categoryId, editId: item.id }))
              }
              accessibilityLabel={item.name}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: {
    paddingBottom: 24,
  },
  amountCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyWrap: {
    paddingTop: 32,
  },
});
