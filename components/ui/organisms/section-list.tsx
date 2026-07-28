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
import { SectionLabel } from '@/components/ui/molecules/section-label';

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

function FlatSectionHeader({ title, spaced }: { title?: string; spaced?: boolean }) {
  if (!title) return null;
  return (
    <View style={[flatStyles.header, spaced ? flatStyles.headerSpaced : null]}>
      <SectionLabel label={title} />
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
      // Close each section with a divider so the last row always has a bottom
      // border. Without this, `ItemSeparatorComponent` (which only draws
      // between items) leaves single-transaction days with no divider before
      // the next section.
      renderSectionFooter={() => <Divider />}
      // First section keeps the default (small) top padding — it sits right
      // below the list header/filter, which already provides spacing. Every
      // section after that gets an extra 16pt gap so day-groups read as
      // visually separate blocks.
      renderSectionHeader={({ section }) => (
        <FlatSectionHeader title={section.title} spaced={section !== sections[0]} />
      )}
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
                {section.title || section.subtitle || section.trailing ? (
                  <View style={cardStyles.header}>
                    <View style={cardStyles.headerText}>
                      {section.title ? <SectionLabel label={section.title} /> : null}
                      {section.subtitle ? (
                        <Text variant="caption" tone="textMuted">
                          {section.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {section.trailing ? <View>{section.trailing}</View> : null}
                  </View>
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
  headerSpaced: {
    marginTop: 16,
  },
});

const cardStyles = StyleSheet.create({
  container: {
    gap: 24,
  },
  section: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
});
