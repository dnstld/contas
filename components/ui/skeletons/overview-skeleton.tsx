import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/atoms/skeleton';
import { Surface } from '@/components/ui/atoms/surface';

export function OverviewSkeleton() {
  return (
    <Surface variant="plain" bordered padding={16} style={styles.card}>
      <View style={styles.headerRow}>
        <Skeleton width={120} height={11} />
        <Skeleton width={48} height={11} />
      </View>
      <Skeleton width={180} height={36} borderRadius={10} />
      <View style={styles.compRow}>
        <Skeleton width={60} height={12} />
        <Skeleton width={120} height={12} />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
});
