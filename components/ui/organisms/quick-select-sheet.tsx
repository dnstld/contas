import { Stack } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import { SectionList, type SectionListSection } from '@/components/ui/organisms/section-list';
import { Fonts } from '@/constants/theme';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useThemeColor } from '@/hooks/use-theme-color';

/** A selectable row in a group. Each row owns its own `onPress` so callers keep
 *  their value semantics (select an entity, open a create flow, …). */
export interface QuickSelectRow {
  id: string;
  title: string;
  subtitle?: string;
  /** Draws a trailing checkmark and marks it as the active choice. */
  selected?: boolean;
  /** Custom trailing node (e.g. a "+" for a create-suggestion row). Takes
   *  precedence over the selected checkmark. */
  trailing?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}

export type QuickSelectGroup = SectionListSection<QuickSelectRow>;

/** Tone for an inline action row under the search box. `tint` reads as the
 *  primary/affirmative action (create, save); `plain` is the low-commitment one. */
export type QuickSelectActionTone = 'tint' | 'plain';

export interface QuickSelectAction {
  key: string;
  label: string;
  icon?: IconName;
  tone?: QuickSelectActionTone;
  /** Muted helper line under the label (e.g. "Reuse in Groceries"). */
  subtitle?: string;
  onPress: () => void;
}

export interface QuickSelectSheetProps {
  /** Header title for the modal screen. */
  title: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  /** Caps the search text — used where the query can become a value (an item's
   *  "Use as description" must fit the transaction description limit). */
  searchMaxLength?: number;
  /** Browse/search sections the screen computes (Most used / All, results, …). */
  groups: QuickSelectGroup[];
  /**
   * Query-driven action rows rendered directly under the search box. The screen
   * decides which to include for the current query; this component just renders
   * them (e.g. "Create X" for categories; "Use X" / "Save X" for items).
   */
  actions?: QuickSelectAction[];
  /** Shown when there are no groups and no actions (e.g. an empty category). */
  emptyHint?: string;
}

/**
 * Shared searchable single-select sheet behind the transaction form's
 * "Where it goes" (categories) and "What for" (items) fields. Search-first,
 * grouped browse, single-tap select-and-close, with a checkmark on the current
 * selection. Value-agnostic: callers map their data to {@link QuickSelectRow}s
 * and supply the query-driven {@link QuickSelectAction}s under the search box.
 */
export function QuickSelectSheet({
  title,
  searchPlaceholder,
  query,
  onQueryChange,
  searchMaxLength,
  groups,
  actions = [],
  emptyHint,
}: QuickSelectSheetProps) {
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const tintColor = useThemeColor({}, 'tint');
  const { text: textColor, textMuted: mutedColor, inputBackground } = useModalChrome();

  const showEmptyHint = !!emptyHint && groups.length === 0 && actions.length === 0;

  return (
    <View style={[styles.root, { backgroundColor }]}>
      {/* `minimal` shows only the back chevron — no "New transaction" parent
          label — matching the rest of the modal flow. */}
      <Stack.Screen options={{ headerTitle: title, headerBackButtonDisplayMode: 'minimal' }} />
      <View style={styles.listHeader}>
        <View style={[styles.search, { backgroundColor: inputBackground }]}>
          <Icon name="magnifyingglass" size={16} tone="textMuted" />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={mutedColor}
            autoCorrect={false}
            returnKeyType="search"
            maxLength={searchMaxLength}
            style={[styles.searchInput, { color: textColor, fontFamily: Fonts.sans }]}
          />
        </View>

        {actions.map((action) => {
          const tinted = action.tone === 'tint';
          const contentColor = tinted ? tintColor : textColor;
          return (
            <Pressable
              key={action.key}
              onPress={action.onPress}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={({ pressed }) => [
                styles.actionRow,
                { backgroundColor: tinted ? `${tintColor}1A` : inputBackground },
                pressed && styles.pressed,
              ]}
            >
              {action.icon ? (
                <Icon name={action.icon} size={18} tone={tinted ? 'tint' : 'textMuted'} />
              ) : null}
              <View style={styles.actionText}>
                <Text variant="body" weight="medium" numberOfLines={1} style={{ color: contentColor }}>
                  {action.label}
                </Text>
                {action.subtitle ? (
                  <Text variant="caption" tone="textMuted" numberOfLines={2}>
                    {action.subtitle}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {showEmptyHint ? (
        <View style={styles.emptyHint}>
          <Text variant="body" tone="textMuted">
            {emptyHint}
          </Text>
        </View>
      ) : (
        <SectionList<QuickSelectRow>
          variant="flat"
          sections={groups}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SectionListRow
              title={item.title}
              subtitle={item.subtitle}
              trailing={
                item.trailing ??
                (item.selected ? <Icon name="checkmark" size={20} tone="tint" /> : null)
              }
              onPress={item.onPress}
              accessibilityLabel={item.accessibilityLabel ?? item.title}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pressed: { opacity: 0.6 },
  listContent: {
    paddingBottom: 24,
  },
  emptyHint: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
