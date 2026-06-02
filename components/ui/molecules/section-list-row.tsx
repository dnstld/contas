import { StyleSheet } from 'react-native';

import { ListCardRow, type ListCardRowProps } from '@/components/ui/molecules/list-card-row';

export type SectionListRowProps = ListCardRowProps;

export function SectionListRow({ style, ...rest }: SectionListRowProps) {
  return <ListCardRow {...rest} style={[styles.row, style]} />;
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
  },
});
