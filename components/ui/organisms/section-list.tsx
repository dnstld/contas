import { Fragment, type ReactNode, type Ref } from 'react';
import {
  SectionList as RNSectionList,
  StyleSheet,
  View,
  type SectionListProps as RNSectionListProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Divider } from '@/components/ui/atoms/divider';
import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { SectionHeader } from '@/components/ui/molecules/section-header';

export type SectionListVariant = 'card' | 'flat';

export interface SectionListSection<T> {
  id: string;
  title?: string;
  subtitle?: string;
  trailing?: ReactNode;
  data: T[];
}

export interface SectionListRenderItemInfo<T> {
  item: T;
  index: number;
  section: SectionListSection<T>;
}

type RNListProps<T> = RNSectionListProps<T, SectionListSection<T>>;

export interface SectionListProps<T> {
  sections: SectionListSection<T>[];
  renderItem: (info: SectionListRenderItemInfo<T>) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  variant?: SectionListVariant;
  ListHeaderComponent?: RNListProps<T>['ListHeaderComponent'];
  ListEmptyComponent?: RNListProps<T>['ListEmptyComponent'];
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  stickySectionHeadersEnabled?: boolean;
  scrollEnabled?: boolean;
  initialNumToRender?: number;
  windowSize?: number;
  removeClippedSubviews?: boolean;
}

function FlatSectionHeader({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <View style={flatStyles.header}>
      <Text variant="caption" tone="textMuted" weight="semibold">
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

function FlatSectionList<T>({
  ref,
  sections,
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
  style,
  stickySectionHeadersEnabled = false,
  scrollEnabled,
  initialNumToRender,
  windowSize,
  removeClippedSubviews,
}: Omit<SectionListProps<T>, 'variant'> & {
  ref?: Ref<RNSectionList<T, SectionListSection<T>>>;
}) {
  return (
    <RNSectionList<T, SectionListSection<T>>
      ref={ref}
      sections={sections}
      keyExtractor={keyExtractor}
      stickySectionHeadersEnabled={stickySectionHeadersEnabled}
      scrollEnabled={scrollEnabled}
      initialNumToRender={initialNumToRender}
      windowSize={windowSize}
      removeClippedSubviews={removeClippedSubviews}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={contentContainerStyle}
      style={style}
      ItemSeparatorComponent={Divider}
      renderSectionHeader={({ section }) => <FlatSectionHeader title={section.title} />}
      renderItem={(info) => <>{renderItem(info)}</>}
    />
  );
}

function CardSectionList<T>({
  sections,
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
  style,
}: Omit<SectionListProps<T>, 'variant'>) {
  const isEmpty = sections.every((s) => s.data.length === 0);

  const renderHeader = (): ReactNode => {
    if (!ListHeaderComponent) return null;
    if (typeof ListHeaderComponent === 'function') {
      const Comp = ListHeaderComponent;
      return <Comp />;
    }
    return ListHeaderComponent;
  };

  const renderEmpty = (): ReactNode => {
    if (!ListEmptyComponent) return null;
    if (typeof ListEmptyComponent === 'function') {
      const Comp = ListEmptyComponent;
      return <Comp />;
    }
    return ListEmptyComponent;
  };

  return (
    <View style={[cardStyles.container, contentContainerStyle, style]}>
      {renderHeader()}
      {isEmpty
        ? renderEmpty()
        : sections.map((section) =>
            section.data.length === 0 ? null : (
              <View key={section.id} style={cardStyles.section}>
                {section.title ? (
                  <SectionHeader
                    title={section.title}
                    subtitle={section.subtitle}
                    trailing={section.trailing}
                  />
                ) : null}
                <Surface padding={0} bordered>
                  {section.data.map((item, index) => (
                    <Fragment key={keyExtractor(item, index)}>
                      {index > 0 ? <Divider inset={16} /> : null}
                      {renderItem({ item, index, section })}
                    </Fragment>
                  ))}
                </Surface>
              </View>
            ),
          )}
    </View>
  );
}

export function SectionList<T>({
  variant = 'flat',
  ref,
  ...rest
}: SectionListProps<T> & { ref?: Ref<RNSectionList<T, SectionListSection<T>>> }) {
  if (variant === 'card') {
    return <CardSectionList<T> {...rest} />;
  }
  return <FlatSectionList<T> {...rest} ref={ref} />;
}

const flatStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

const cardStyles = StyleSheet.create({
  container: {
    gap: 24,
  },
  section: {
    gap: 8,
  },
});
