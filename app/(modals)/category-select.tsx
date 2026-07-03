import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CategoryFields } from '@/components/categories/category-fields';
import { Icon } from '@/components/ui/atoms/icon';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { Text } from '@/components/ui/atoms/text';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import { SectionList, type SectionListSection } from '@/components/ui/organisms/section-list';
import { ModalFormScaffold } from '@/components/ui/templates/modal-form-scaffold';
import { Fonts } from '@/constants/theme';
import { rankCategoriesByUsage } from '@/data/finance-aggregations';
import type { Category, TransactionType } from '@/data/finance-types';
import { useDemoMode } from '@/hooks/use-demo-mode';
import { useCreateCategory } from '@/hooks/use-finance-mutations';
import { useCategories, useTransactions } from '@/hooks/use-finance-queries';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useThemeColor } from '@/hooks/use-theme-color';
import { categoryFormBridge } from '@/utils/modal-bridge';
import { toast } from '@/utils/toast';

/** A starter suggestion shown when the picker has no categories of this type yet. */
type SuggestionRow = { suggestion: string };
type Row = Category | SuggestionRow;
const isSuggestion = (r: Row): r is SuggestionRow => 'suggestion' in r;

export default function CategorySelectScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    type: TransactionType;
    bridgeId: string;
    selectedId?: string;
  }>();

  const type: TransactionType = params.type === 'income' ? 'income' : 'expense';
  const bridgeId = params.bridgeId;
  const selectedId = params.selectedId ?? null;

  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const { enabled: demoMode } = useDemoMode();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();

  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [budgetCents, setBudgetCents] = useState(0);

  const backgroundColor = useThemeColor({}, 'modalBackground');
  const tintColor = useThemeColor({}, 'tint');
  const { text: textColor, textMuted: mutedColor, inputBackground } = useModalChrome();

  // Starter category names for this type, minus any the wallet already has.
  const suggestionNames = useMemo(() => {
    const existing = new Set(
      categories.filter((c) => c.type === type).map((c) => c.name.toLowerCase()),
    );
    return t(`categorySelect.suggestions.${type}`)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((name) => !existing.has(name.toLowerCase()));
  }, [categories, type, t]);

  const sections = useMemo<SectionListSection<Row>[]>(() => {
    const needle = query.trim().toLowerCase();

    // Searching collapses to a single, alphabetically-sorted results group —
    // the most-used/all-categories split only applies to the browsing view.
    if (needle.length > 0) {
      const matches = categories
        .filter((c) => c.type === type)
        .filter((c) => c.name.toLowerCase().includes(needle))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (matches.length > 0) {
        return [{ id: 'all', title: t('categorySelect.groups.all'), data: matches }];
      }
      // No match: the inline "+ Criar X" header row covers creation.
      return [];
    }

    // Browsing (no search): split into "Most used" (same top 5 as the
    // transaction form's quick-select chips — shared ranking, so both
    // surfaces always agree) and "All categories" for everything else, in
    // the same usage order.
    const { mostUsed, rest } = rankCategoriesByUsage(categories, transactions, type);
    const groups: SectionListSection<Row>[] = [];
    if (mostUsed.length > 0) {
      groups.push({ id: 'mostUsed', title: t('categorySelect.groups.mostUsed'), data: mostUsed });
    }
    if (rest.length > 0) {
      groups.push({ id: 'all', title: t('categorySelect.groups.all'), data: rest });
    }
    if (groups.length > 0) return groups;

    // No categories of this type yet: offer starter suggestions in their own
    // group. Tapping one opens the in-sheet create view.
    const suggestionRows: Row[] = suggestionNames.map((suggestion) => ({ suggestion }));
    return [
      { id: 'suggestions', title: t('categorySelect.suggestions.section'), data: suggestionRows },
    ];
  }, [categories, transactions, type, query, t, suggestionNames]);

  // Offer "Create X" when the typed term doesn't exactly match an existing
  // category of this type (case-insensitive).
  const trimmedQuery = query.trim();
  const hasExactMatch = categories.some(
    (c) => c.type === type && c.name.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  const showInlineCreate = trimmedQuery.length > 0 && !hasExactMatch;

  const openCreate = (seedName: string) => {
    setName(seedName);
    setBudgetCents(0);
    setMode('create');
  };

  const handleSelect = (id: string) => {
    categoryFormBridge.emit(bridgeId, 'selected', id);
    router.back();
  };

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed || isCreating || demoMode) return;
    createCategory(
      {
        name: trimmed,
        type,
        ...(budgetCents > 0 && { monthlyBudgetCents: budgetCents }),
      },
      {
        onSuccess: (data) => {
          toast.success(t('feedback.categoryCreated'));
          categoryFormBridge.emit(bridgeId, 'created', data.id);
          router.back();
        },
      },
    );
  };

  if (mode === 'create') {
    const canCreate = name.trim().length > 0 && !isCreating && !demoMode;
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: t('category.create.title'),
            headerLeft: () => (
              <Pressable
                onPress={() => setMode('list')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                {({ pressed }) => (
                  <Icon name="chevron.left" size={20} style={{ opacity: pressed ? 0.6 : 1 }} />
                )}
              </Pressable>
            ),
          }}
        />
        <ModalFormScaffold
          footer={
            <PressableButton
              label={t('categorySelect.createAndSelect')}
              variant="primary"
              size="large"
              loading={isCreating}
              disabled={!canCreate}
              onPress={handleCreate}
            />
          }
        >
          <CategoryFields
            name={name}
            onNameChange={setName}
            budgetCents={budgetCents}
            onBudgetChange={setBudgetCents}
            onSubmitBudget={handleCreate}
          />
        </ModalFormScaffold>
      </>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <Stack.Screen options={{ headerTitle: t('categorySelect.title') }} />
      <View style={styles.listHeader}>
        <View style={[styles.search, { backgroundColor: inputBackground }]}>
          <Icon name="magnifyingglass" size={16} tone="textMuted" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('categorySelect.searchPlaceholder')}
            placeholderTextColor={mutedColor}
            autoCorrect={false}
            returnKeyType="search"
            style={[styles.searchInput, { color: textColor, fontFamily: Fonts.sans }]}
          />
        </View>

        {showInlineCreate ? (
          <Pressable
            onPress={() => openCreate(trimmedQuery)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.createRow,
              { backgroundColor: `${tintColor}1A` },
              pressed && styles.pressed,
            ]}
          >
            <Icon name="plus" size={18} tone="tint" />
            <Text variant="body" weight="medium" numberOfLines={1} style={{ color: tintColor }}>
              {t('categorySelect.createNamed', { name: trimmedQuery })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <SectionList<Row>
        variant="flat"
        sections={sections}
        keyExtractor={(item) => (isSuggestion(item) ? `sugg:${item.suggestion}` : item.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          if (isSuggestion(item)) {
            return (
              <SectionListRow
                title={item.suggestion}
                trailing={<Icon name="plus" size={20} tone="tint" />}
                onPress={() => openCreate(item.suggestion)}
                accessibilityLabel={item.suggestion}
              />
            );
          }
          const selected = item.id === selectedId;
          return (
            <SectionListRow
              title={item.name}
              trailing={selected ? <Icon name="checkmark" size={20} tone="tint" /> : null}
              onPress={() => handleSelect(item.id)}
              accessibilityLabel={item.name}
            />
          );
        }}
      />
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
  listContent: {
    paddingBottom: 24,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  pressed: { opacity: 0.6 },
});
