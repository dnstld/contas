import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/atoms/avatar';
import { Icon } from '@/components/ui/atoms/icon';
import { Surface } from '@/components/ui/atoms/surface';
import { ListCardRow } from '@/components/ui/molecules/list-card-row';
import { SectionLabel } from '@/components/ui/molecules/section-label';
import type { Colors } from '@/constants/theme';
import { MOCK_CATEGORIES, MOCK_CATEGORY_ITEMS } from '@/data/__fixtures__/category-items';
import { parseDayStart, type CategoryItem } from '@/data/finance-types';
import { useFormatters } from '@/hooks/use-formatters';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';
import { useTranslation } from 'react-i18next';

const MAX_AVATARS = 3;

// Soft, distinct fallback tones cycled across the avatar stack so the payments
// read as separate chips rather than one blob.
const AVATAR_TONES: (keyof typeof Colors.light)[] = [
  'positiveSurface',
  'secondary',
  'negativeSurface',
];

const expenseCategoryIds = new Set(
  MOCK_CATEGORIES.filter((c) => c.type === 'expense').map((c) => c.id),
);

function upcomingItems(): CategoryItem[] {
  return MOCK_CATEGORY_ITEMS.filter(
    (it) =>
      !it.archivedAt &&
      it.recurrence !== 'none' &&
      it.nextDueOn != null &&
      expenseCategoryIds.has(it.categoryId),
  ).sort((a, b) => (a.nextDueOn! < b.nextDueOn! ? -1 : a.nextDueOn! > b.nextDueOn! ? 1 : 0));
}

export function UpcomingSummary() {
  const { t } = useTranslation();
  const { currency = 'BRL' } = useWallet();
  const { formatCurrency, formatDate } = useFormatters();
  const surfaceColor = useThemeColor({}, 'surface');

  const items = upcomingItems();
  const count = items.length;

  if (count === 0) return null;

  const total = items.reduce((sum, it) => sum + (it.defaultAmount ?? 0), 0);
  const nextDate = items[0]!.nextDueOn!;
  const avatarItems = items.slice(0, MAX_AVATARS);
  const extra = count - avatarItems.length;

  const ringStyle = { borderColor: surfaceColor };

  const avatarStack = (
    <View style={styles.avatarStack}>
      {avatarItems.map((item, index) => (
        <View
          key={item.id}
          style={[styles.avatarRing, ringStyle, index > 0 && styles.avatarOverlap]}
        >
          <Avatar size="sm" name={item.name} tone={AVATAR_TONES[index % AVATAR_TONES.length]} />
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.avatarRing, ringStyle, styles.avatarOverlap]}>
          <Avatar size="sm" initials={`+${extra}`} tone="surfaceMuted" />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <SectionLabel label={t('upcoming.title')} />

      <Surface variant="plain" bordered={false} padding={0}>
        <ListCardRow
          size="sm"
          density="comfortable"
          style={styles.row}
          leading={avatarStack}
          title={t('upcoming.paymentsCount', { count })}
          subtitle={t('upcoming.summary', {
            total: formatCurrency(total, currency),
            date: formatDate(parseDayStart(nextDate), { day: 'numeric', month: 'short' }),
          })}
          trailing={<Icon name="chevron.right" tone="textMuted" />}
          // TODO(step 4b): open Upcoming detail
          onPress={() => {}}
          accessibilityLabel={t('upcoming.paymentsCount', { count })}
        />
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    paddingHorizontal: 16,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    borderRadius: 999,
    borderWidth: 2,
  },
  avatarOverlap: {
    marginLeft: -12,
  },
});
