import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/atoms/avatar';
import { Icon } from '@/components/ui/atoms/icon';
import { Surface } from '@/components/ui/atoms/surface';
import { ListCardRow } from '@/components/ui/molecules/list-card-row';
import { SectionLabel } from '@/components/ui/molecules/section-label';
import { upcomingHref } from '@/constants/routes';
import { UPCOMING_AVATAR_TONES } from '@/components/upcoming/tones';
import { upcomingExpenseItems } from '@/data/__fixtures__/category-items';
import { parseDayStart } from '@/data/finance-types';
import { useFormatters } from '@/hooks/use-formatters';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';

const MAX_AVATARS = 3;

export function UpcomingSummary() {
  const { t } = useTranslation();
  const router = useRouter();
  const { currency = 'BRL' } = useWallet();
  const { formatCurrency, formatDate } = useFormatters();
  const surfaceColor = useThemeColor({}, 'surface');

  const items = upcomingExpenseItems();
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
          <Avatar
            size="sm"
            name={item.name}
            tone={UPCOMING_AVATAR_TONES[index % UPCOMING_AVATAR_TONES.length]}
          />
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
          onPress={() => router.push(upcomingHref())}
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
