import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  QuickSelectSheet,
  type QuickSelectAction,
  type QuickSelectGroup,
} from '@/components/ui/organisms/quick-select-sheet';
import {
  MOST_USED_DESCRIPTIONS_LIMIT,
  rankItemsForCategory,
} from '@/data/finance-aggregations';
import { TRANSACTION_DESCRIPTION_MAX_LENGTH } from '@/constants/limits';
import type { CategoryItem } from '@/data/finance-types';
import { useCreateCategoryItem } from '@/hooks/use-category-item-mutations';
import { useCategories, useCategoryItems, useTransactions } from '@/hooks/use-finance-queries';
import { categoryItemSelectBridge } from '@/utils/modal-bridge';

export default function ItemSelectScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    categoryId: string;
    bridgeId: string;
    selectedId?: string;
  }>();

  const categoryId = params.categoryId;
  const bridgeId = params.bridgeId;
  const selectedId = params.selectedId ?? null;

  const { data: categories = [] } = useCategories();
  const { data: categoryItems = [] } = useCategoryItems();
  const { data: transactions = [] } = useTransactions();
  const { mutate: createItem } = useCreateCategoryItem();

  const [query, setQuery] = useState('');

  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? '';

  // Selecting an existing/just-created item: carry name + defaultAmount so the
  // form applies it immediately without waiting for the query to refetch.
  const selectItem = (item: CategoryItem) => {
    categoryItemSelectBridge.emit(bridgeId, 'selected', {
      id: item.id,
      name: item.name,
      defaultAmount: item.defaultAmount ?? null,
    });
    router.back();
  };

  const groups = useMemo<QuickSelectGroup[]>(() => {
    // Full ranked list (usage desc, name tiebreak), no cap — the sheet is the
    // escape hatch for everything the form's top-5 chip row can't show.
    const ranked = rankItemsForCategory(categoryItems, transactions, categoryId, Infinity);
    const toRow = (item: CategoryItem) => ({
      id: item.id,
      title: item.name,
      selected: item.id === selectedId,
      onPress: () => selectItem(item),
    });

    const needle = query.trim().toLowerCase();
    if (needle.length > 0) {
      const matches = ranked
        .filter((it) => it.name.toLowerCase().includes(needle))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (matches.length > 0) {
        return [{ id: 'all', title: t('itemSelect.groups.all'), data: matches.map(toRow) }];
      }
      // No match: the inline Use / Save action rows cover it.
      return [];
    }

    const out: QuickSelectGroup[] = [];
    const mostUsed = ranked.slice(0, MOST_USED_DESCRIPTIONS_LIMIT);
    const rest = ranked.slice(MOST_USED_DESCRIPTIONS_LIMIT);
    if (mostUsed.length > 0) {
      out.push({
        id: 'mostUsed',
        title: t('itemSelect.groups.mostUsed'),
        data: mostUsed.map(toRow),
      });
    }
    if (rest.length > 0) {
      out.push({ id: 'all', title: t('itemSelect.groups.all'), data: rest.map(toRow) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryItems, transactions, categoryId, query, t, selectedId]);

  const trimmedQuery = query.trim();

  // Two query-driven actions — the item-only difference from category select:
  // "Use" keeps the typed text as a plain description; "Save" turns it into a
  // reusable item and links it.
  const useText = () => {
    categoryItemSelectBridge.emit(bridgeId, 'useText', trimmedQuery);
    router.back();
  };

  const saveAsItem = () => {
    createItem(
      { categoryId, name: trimmedQuery, recurrence: 'none' },
      { onSuccess: (item) => selectItem(item) },
    );
  };

  const hasExactMatch = categoryItems.some(
    (it) =>
      it.categoryId === categoryId &&
      !it.archivedAt &&
      it.name.toLowerCase() === trimmedQuery.toLowerCase(),
  );

  const actions: QuickSelectAction[] = [];
  if (trimmedQuery.length > 0) {
    actions.push({
      key: 'use',
      label: t('itemSelect.useNamed', { name: trimmedQuery }),
      subtitle: t('itemSelect.useSubtitle'),
      icon: 'plus',
      tone: 'plain',
      onPress: useText,
    });
    if (!hasExactMatch) {
      actions.push({
        key: 'save',
        label: t('itemSelect.saveLabel'),
        subtitle: t('itemSelect.saveSubtitle'),
        icon: 'square.and.arrow.down',
        tone: 'tint',
        onPress: saveAsItem,
      });
    }
  }

  return (
    <QuickSelectSheet
      title={t('itemSelect.title')}
      searchPlaceholder={t('itemSelect.searchPlaceholder')}
      query={query}
      onQueryChange={setQuery}
      searchMaxLength={TRANSACTION_DESCRIPTION_MAX_LENGTH}
      groups={groups}
      actions={actions}
      emptyHint={
        categoryName ? t('create.itemHint', { category: categoryName }) : t('itemSelect.emptyHint')
      }
    />
  );
}
