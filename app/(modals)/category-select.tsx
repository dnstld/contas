import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { CategoryFields } from '@/components/categories/category-fields';
import { Icon } from '@/components/ui/atoms/icon';
import { ModalActions } from '@/components/ui/molecules/modal-actions';
import { ModalFormScaffold } from '@/components/ui/templates/modal-form-scaffold';
import {
  QuickSelectSheet,
  type QuickSelectAction,
  type QuickSelectGroup,
} from '@/components/ui/organisms/quick-select-sheet';
import { rankCategoriesByUsage } from '@/data/finance-aggregations';
import type { TransactionType } from '@/data/finance-types';
import { useCreateCategory } from '@/hooks/use-finance-mutations';
import { useCategories, useTransactions } from '@/hooks/use-finance-queries';
import { categoryFormBridge } from '@/utils/modal-bridge';
import { toast } from '@/utils/toast';

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
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();

  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [budgetCents, setBudgetCents] = useState(0);

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

  const openCreate = (seedName: string) => {
    setName(seedName);
    setBudgetCents(0);
    setMode('create');
  };

  const handleSelect = (id: string) => {
    categoryFormBridge.emit(bridgeId, 'selected', id);
    router.back();
  };

  const groups = useMemo<QuickSelectGroup[]>(() => {
    const needle = query.trim().toLowerCase();
    const toRow = (c: { id: string; name: string }) => ({
      id: c.id,
      title: c.name,
      selected: c.id === selectedId,
      onPress: () => handleSelect(c.id),
    });

    // Searching collapses to a single, alphabetically-sorted results group —
    // the most-used/all-categories split only applies to the browsing view.
    if (needle.length > 0) {
      const matches = categories
        .filter((c) => c.type === type && !c.archivedAt)
        .filter((c) => c.name.toLowerCase().includes(needle))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (matches.length > 0) {
        return [{ id: 'all', title: t('categorySelect.groups.all'), data: matches.map(toRow) }];
      }
      // No match: the inline "+ Create X" action row covers creation.
      return [];
    }

    // Browsing (no search): split into "Most used" (same top 5 as the
    // transaction form's quick-select chips — shared ranking, so both
    // surfaces always agree) and "All categories" for everything else, in
    // the same usage order.
    const { mostUsed, rest } = rankCategoriesByUsage(categories, transactions, type);
    const out: QuickSelectGroup[] = [];
    if (mostUsed.length > 0) {
      out.push({
        id: 'mostUsed',
        title: t('categorySelect.groups.mostUsed'),
        data: mostUsed.map(toRow),
      });
    }
    if (rest.length > 0) {
      out.push({ id: 'all', title: t('categorySelect.groups.all'), data: rest.map(toRow) });
    }
    if (out.length > 0) return out;

    // No categories of this type yet: offer starter suggestions in their own
    // group. Tapping one opens the in-sheet create view.
    return [
      {
        id: 'suggestions',
        title: t('categorySelect.suggestions.section'),
        data: suggestionNames.map((suggestion) => ({
          id: `sugg:${suggestion}`,
          title: suggestion,
          trailing: <Icon name="plus" size={20} tone="tint" />,
          onPress: () => openCreate(suggestion),
        })),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, transactions, type, query, t, suggestionNames, selectedId]);

  // Offer "Create X" when the typed term doesn't exactly match an existing
  // category of this type (case-insensitive).
  const trimmedQuery = query.trim();
  const hasExactMatch = categories.some(
    (c) => c.type === type && c.name.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  const actions: QuickSelectAction[] =
    trimmedQuery.length > 0 && !hasExactMatch
      ? [
          {
            key: 'create',
            label: t('categorySelect.createNamed', { name: trimmedQuery }),
            icon: 'plus',
            tone: 'tint',
            onPress: () => openCreate(trimmedQuery),
          },
        ]
      : [];

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed || isCreating) return;
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
    const canCreate = name.trim().length > 0 && !isCreating;
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
            <ModalActions
              primary={{
                label: t('categorySelect.createAndSelect'),
                onPress: handleCreate,
                loading: isCreating,
                disabled: !canCreate,
              }}
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
    <QuickSelectSheet
      title={t('categorySelect.title')}
      searchPlaceholder={t('categorySelect.searchPlaceholder')}
      query={query}
      onQueryChange={setQuery}
      groups={groups}
      actions={actions}
    />
  );
}
