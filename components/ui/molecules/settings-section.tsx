import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Divider } from '@/components/ui/atoms/divider';
import { Surface } from '@/components/ui/atoms/surface';
import { SectionHeader } from '@/components/ui/molecules/section-header';

export interface SettingsSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SettingsSection({
  title,
  subtitle,
  children,
  style,
}: SettingsSectionProps) {
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.container, style]}>
      <SectionHeader title={title} subtitle={subtitle} />
      <Surface padding={0} bordered>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <Divider inset={16} /> : null}
            {row}
          </Fragment>
        ))}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
});
