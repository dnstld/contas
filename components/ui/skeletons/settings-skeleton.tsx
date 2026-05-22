import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/atoms/skeleton';
import { Surface } from '@/components/ui/atoms/surface';

function SectionHeader() {
  return (
    <View style={styles.sectionHeader}>
      <Skeleton width={120} height={12} />
    </View>
  );
}

function SettingsRow() {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="80%" height={11} />
      </View>
      <Skeleton width={64} height={20} borderRadius={999} />
    </View>
  );
}

export function SettingsSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.accountSection}>
        <SectionHeader />
        <Surface padding={0} radius={16} bordered>
          <View style={styles.profileRow}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={styles.profileText}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="80%" height={12} />
            </View>
          </View>
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader />
        <Surface padding={0} radius={16} bordered>
          <SettingsRow />
          <SettingsRow />
          <SettingsRow />
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader />
        <Surface padding={0} radius={16} bordered>
          <SettingsRow />
          <SettingsRow />
        </Surface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 24,
  },
  accountSection: {
    gap: 8,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  profileText: {
    flex: 1,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    gap: 6,
  },
});
