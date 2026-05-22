import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/atoms/skeleton';

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

export function CategoryDetailSkeleton() {
  return (
    <View style={styles.container}>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 4,
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
