import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/atoms/skeleton';
import { Surface } from '@/components/ui/atoms/surface';

const TILES = 6;

function Tile() {
  return (
    <Surface variant="plain" bordered padding={14} style={styles.tile}>
      <View style={styles.headerRow}>
        <Skeleton width={28} height={28} borderRadius={8} />
        <View style={styles.headerText}>
          <Skeleton width="70%" height={13} />
          <Skeleton width="50%" height={18} />
        </View>
      </View>
      <Skeleton width="40%" height={11} />
    </Surface>
  );
}

export function CategoryGridSkeleton() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: TILES }).map((_, i) => (
        <View key={i} style={styles.cell}>
          <Tile />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    padding: 6,
  },
  tile: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
});
