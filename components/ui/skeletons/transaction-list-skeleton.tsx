import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/atoms/skeleton';
import { Surface } from '@/components/ui/atoms/surface';

const ROW_GROUPS = [
  { header: 90, rows: 4 },
  { header: 70, rows: 3 },
];

function Row() {
  return (
    <View style={styles.row}>
      <Skeleton width={36} height={36} borderRadius={20} />
      <View style={styles.middle}>
        <Skeleton width="55%" height={13} />
        <Skeleton width="80%" height={11} />
      </View>
      <Skeleton width={70} height={14} />
    </View>
  );
}

export function TransactionListSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.totalCardWrap}>
        <Surface variant="plain" bordered padding={16} style={styles.totalCard}>
          <Skeleton width={60} height={11} />
          <Skeleton width={160} height={32} borderRadius={10} />
        </Surface>
      </View>

      {ROW_GROUPS.map((group, idx) => (
        <View key={idx} style={styles.group}>
          <View style={styles.sectionHeader}>
            <Skeleton width={group.header} height={11} />
          </View>
          {Array.from({ length: group.rows }).map((_, i) => (
            <Row key={i} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  totalCardWrap: {
    paddingTop: 32,
    paddingBottom: 32,
  },
  totalCard: {
    gap: 8,
  },
  group: {
    gap: 4,
  },
  sectionHeader: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  middle: {
    flex: 1,
    gap: 6,
  },
});
