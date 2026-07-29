import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/atoms/avatar';
import { Icon } from '@/components/ui/atoms/icon';
import { PriceText } from '@/components/ui/atoms/price-text';
import { EmptyState } from '@/components/ui/molecules/empty-state';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import { SectionList, type SectionListSection } from '@/components/ui/organisms/section-list';
import { UPCOMING_AVATAR_TONES } from '@/components/upcoming/tones';
import { categoryItemFormHref } from '@/constants/routes';
import { buildUpcoming, type UpcomingOccurrence } from '@/data/finance-aggregations';
import { parseDayStart } from '@/data/finance-types';
import { useCategories, useCategoryItems } from '@/hooks/use-finance-queries';
import { useFormatters } from '@/hooks/use-formatters';
import { useNow } from '@/hooks/use-now';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';
import { categoryItemFormBridge, makeBridgeId } from '@/utils/modal-bridge';

type Row = UpcomingOccurrence;

export default function UpcomingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const now = useNow();
  const { currency = 'BRL' } = useWallet();
  const { formatDate } = useFormatters();

  const backgroundColor = useThemeColor({}, 'modalBackground');

  const [bridgeId] = useState(() => makeBridgeId());

  const { data: items = [], refetch } = useCategoryItems();
  const { data: categories = [] } = useCategories();

  // Editing an item from a row (e.g. archiving it) closes the form and signals
  // here; refetch so the forecast drops it, mirroring the items modal.
  useEffect(() => {
    return categoryItemFormBridge.subscribe(bridgeId, {
      changed: () => {
        refetch();
      },
    });
  }, [bridgeId, refetch]);

  const occurrences = buildUpcoming(items, categories, now);

  const sections: SectionListSection<Row>[] =
    occurrences.length > 0 ? [{ id: 'upcoming', data: occurrences }] : [];

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <Stack.Screen options={{ headerTitle: t('upcoming.title') }} />

      <SectionList<Row>
        variant="flat"
        sections={sections}
        keyExtractor={(occ) => occ.item.id}
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
        renderItem={({ item: occ, index }) => (
          <SectionListRow
            size="sm"
            density="comfortable"
            leading={
              <Avatar
                size="sm"
                name={occ.item.name}
                tone={UPCOMING_AVATAR_TONES[index % UPCOMING_AVATAR_TONES.length]}
              />
            }
            title={occ.item.name}
            subtitle={t('upcoming.next', {
              date: formatDate(parseDayStart(occ.dueOn), { day: 'numeric', month: 'short' }),
            })}
            text1={
              occ.item.defaultAmount != null ? (
                <PriceText value={occ.item.defaultAmount} currency={currency} />
              ) : undefined
            }
            trailing={<Icon name="chevron.right" size={16} tone="textMuted" />}
            onPress={() =>
              router.push(
                categoryItemFormHref({
                  categoryId: occ.item.categoryId,
                  bridgeId,
                  editId: occ.item.id,
                }),
              )
            }
            accessibilityLabel={occ.item.name}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: {
    paddingBottom: 24,
  },
  emptyWrap: {
    paddingTop: 32,
  },
});
