import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { CategoryFields } from '@/components/categories/category-fields';
import { Icon } from '@/components/ui/atoms/icon';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { PriceText } from '@/components/ui/atoms/price-text';
import { Text } from '@/components/ui/atoms/text';
import { SectionListRow } from '@/components/ui/molecules/section-list-row';
import {
  SectionList,
  type SectionListSection,
} from '@/components/ui/organisms/section-list';
import { Fonts } from '@/constants/theme';
import type { Category, TransactionType } from '@/data/finance-types';
import { useDemoMode } from '@/hooks/use-demo-mode';
import { useCreateCategory } from '@/hooks/use-finance-mutations';
import { useCategories, useTransactions } from '@/hooks/use-finance-queries';
import { useFormatters } from '@/hooks/use-formatters';
import { useModalBottomPadding } from '@/hooks/use-modal-bottom-padding';
import { useModalChrome } from '@/hooks/use-modal-chrome';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';
import { categoryFormBridge } from '@/utils/modal-bridge';
import { toast } from '@/utils/toast';

const MOST_USED_LIMIT = 5;

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
  const { currency } = useWallet();
  const { locale } = useFormatters();

  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [budgetCents, setBudgetCents] = useState(0);

  const bottomPadding = useModalBottomPadding();
  const backgroundColor = useThemeColor({}, 'modalBackground');
  const tintColor = useThemeColor({}, 'tint');
  const {
    text: textColor,
    textMuted: mutedColor,
    border: borderColor,
    inputBackground,
    onPrimary,
  } = useModalChrome();

  const counts = useMemo(() => {
    const countById = new Map<string, number>();
    for (const tx of transactions) {
      countById.set(tx.categoryId, (countById.get(tx.categoryId) ?? 0) + 1);
    }
    return countById;
  }, [transactions]);

  const sections = useMemo<SectionListSection<Category>[]>(() => {
    const needle = query.trim().toLowerCase();
    const ofType = categories
      .filter((c) => c.type === type)
      .filter((c) => (needle ? c.name.toLowerCase().includes(needle) : true));

    const used = ofType
      .filter((c) => (counts.get(c.id) ?? 0) > 0)
      .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
    const mostUsed = used.slice(0, MOST_USED_LIMIT);
    const mostUsedIds = new Set(mostUsed.map((c) => c.id));

    const rest = ofType
      .filter((c) => !mostUsedIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    // RNSectionList (flat variant) renders a header even for empty sections,
    // so drop any group with no rows.
    return [
      { id: 'most-used', title: t('category.sort.mostUsed'), data: mostUsed },
      { id: 'all', title: t('categorySelect.groups.all'), data: rest },
    ].filter((s) => s.data.length > 0);
  }, [categories, counts, type, query, t]);

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
      <View style={[styles.root, { backgroundColor, paddingBottom: bottomPadding }]}>
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
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.createContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <CategoryFields
              name={name}
              onNameChange={setName}
              budgetCents={budgetCents}
              onBudgetChange={setBudgetCents}
              onSubmitBudget={handleCreate}
            />
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <PressableButton
              label={t('categorySelect.createAndSelect')}
              variant="primary"
              size="large"
              loading={isCreating}
              disabled={!canCreate}
              onPress={handleCreate}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor, paddingBottom: bottomPadding }]}>
      <Stack.Screen options={{ headerTitle: t('categorySelect.title') }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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

        <SectionList<Category>
          variant="flat"
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            showInlineCreate ? null : (
              <Text variant="body" tone="textMuted" style={styles.empty}>
                {t('categorySelect.empty')}
              </Text>
            )
          }
          renderItem={({ item }) => {
            const count = counts.get(item.id) ?? 0;
            const selected = item.id === selectedId;
            const hasGoal = item.monthlyBudget != null;
            return (
              <SectionListRow
                leading={
                  <View
                    style={[
                      styles.selectDot,
                      selected
                        ? { backgroundColor: tintColor }
                        : { borderColor, borderWidth: 1.5 },
                    ]}
                  >
                    {selected ? <Icon name="checkmark" size={18} color={onPrimary} /> : null}
                  </View>
                }
                title={item.name}
                subtitle={count > 0 ? t('category.transactionCount', { count }) : null}
                text1={hasGoal ? t('category.create.budgetLabel') : null}
                text2={
                  hasGoal ? (
                    <PriceText
                      value={item.monthlyBudget as number}
                      currency={currency}
                      locale={locale}
                      tone="neutral"
                      size="md"
                    />
                  ) : null
                }
                onPress={() => handleSelect(item.id)}
                accessibilityLabel={item.name}
              />
            );
          }}
        />

        <View style={[styles.footer, { borderTopColor: borderColor }]}>
          <PressableButton
            label={t('categorySelect.addButton')}
            variant="primary"
            size="large"
            onPress={() => openCreate(trimmedQuery)}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
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
  createContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 20,
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
  selectDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 32,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
