import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/atoms/skeleton';
import { useThemeColor } from '@/hooks/use-theme-color';

function Item() {
  const borderColor = useThemeColor({}, 'border');
  return (
    <View style={[styles.item, { borderColor }]}>
      <View style={styles.info}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={11} />
      </View>
      <Skeleton width={56} height={20} borderRadius={999} />
    </View>
  );
}

export function WalletsSkeleton() {
  return (
    <View style={styles.container}>
      <Item />
      <Item />
      <Item />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  item: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  info: {
    flex: 1,
    gap: 6,
  },
});
