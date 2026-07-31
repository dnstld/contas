import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { categoryFormHref, categorySelectHref, itemSelectHref } from '@/constants/routes';
import { nextAmountCents } from '@/utils/amount-input';
import { categoryFormBridge, categoryItemSelectBridge, makeBridgeId } from '@/utils/modal-bridge';
import { CurrencyInput } from '@/components/ui/atoms/currency-input';
import { DatePicker } from '@/components/ui/atoms/date-picker';
import { PressableButton } from '@/components/ui/atoms/pressable-button';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/atoms/segmented-control';
import { Text } from '@/components/ui/atoms/text';
import { ModalFormScaffold } from '@/components/ui/templates/modal-form-scaffold';
import { CategorySelect } from '@/components/ui/organisms/category-select';
import { QuickPickChips, type QuickPickItem } from '@/components/ui/molecules/quick-pick-chips';
import { Fonts } from '@/constants/theme';
import {
  MOST_USED_CATEGORIES_LIMIT,
  rankCategoriesByUsage,
  rankItemsForCategory,
} from '@/data/finance-aggregations';
import type { CategoryItem } from '@/data/finance-types';
import { useAuth } from '@/hooks/use-auth';
import { useCategories, useCategoryItems, useTransactions } from '@/hooks/use-finance-queries';
import { useFormatters } from '@/hooks/use-formatters';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useWallet } from '@/hooks/use-wallet';
import { useWalletMembers } from '@/hooks/use-wallet-members';

export type TransactionType = 'expense' | 'income';

/** First name for a member chip, falling back to the email local-part, then a
 *  generic unnamed label. Mirrors the row's `firstName` presentation. */
function memberLabel(
  displayName: string | null,
  email: string | null,
  unnamedLabel: string,
): string {
  const name = displayName?.trim();
  if (name) return name.split(/\s+/)[0] ?? name;
  const local = email?.split('@')[0]?.trim();
  if (local) return local;
  return unnamedLabel;
}

export type TransactionFormValues = {
  type: TransactionType;
  amountCents: number;
  date: Date;
  categoryId: string | null;
  /** Curated item this transaction is linked to. `null` = free text / unlinked. */
  categoryItemId: string | null;
  description: string;
  /** Member the transaction is FOR. `null` = for the creator themselves. */
  onBehalfOfUserId: string | null;
};

export interface TransactionFormProps {
  initialValues?: Partial<TransactionFormValues>;
  onSubmit: (values: TransactionFormValues) => void;
  onDelete?: () => void;
  submitLabel?: string;
  deleteLabel?: string;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  errorMessage?: string | null;
}

export function TransactionForm({
  initialValues,
  onSubmit,
  onDelete,
  submitLabel,
  deleteLabel,
  isSubmitting = false,
  isDeleting = false,
  errorMessage = null,
}: TransactionFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const { data: categoryItems = [] } = useCategoryItems();
  const { currency } = useWallet();
  const { members } = useWalletMembers();
  const { session } = useAuth();
  const myUserId = session?.user.id ?? null;
  const { formatAmount } = useFormatters();
  // Stable per-mount id. Lazy useState avoids react-hooks/refs (no `.current`
  // access during render) and gives us a one-time value identical to a ref.
  const [bridgeId] = useState(() => makeBridgeId());

  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const dangerColor = useThemeColor({}, 'negative');
  const surfaceMutedColor = useThemeColor({}, 'surfaceMuted');

  const [type, setType] = useState<TransactionType>(initialValues?.type ?? 'expense');
  const [amountCents, setAmountCents] = useState<number>(initialValues?.amountCents ?? 0);
  const [date, setDate] = useState<Date>(initialValues?.date ?? new Date());
  const [categoryId, setCategoryId] = useState<string | null>(initialValues?.categoryId ?? null);
  const [categoryItemId, setCategoryItemId] = useState<string | null>(
    initialValues?.categoryItemId ?? null,
  );
  const [description, setDescription] = useState<string>(initialValues?.description ?? '');
  const [onBehalfOfUserId, setOnBehalfOfUserId] = useState<string | null>(
    initialValues?.onBehalfOfUserId ?? null,
  );

  // Apply a chosen item: link it, fill the description, and pre-fill the amount
  // from its expected amount only when the field is still empty. Uses functional
  // state updates so it's safe to call from the (once-subscribed) item bridge
  // handler without capturing a stale `amountCents`. Shared by the quick-pick
  // chip tap and the full item-select sheet.
  const applyItemSelection = useCallback(
    (payload: { id: string; name: string; defaultAmount: number | null }) => {
      setCategoryItemId(payload.id);
      setDescription(payload.name);
      setAmountCents((prev) =>
        prev === 0 && payload.defaultAmount != null
          ? Math.round(payload.defaultAmount * 100)
          : prev,
      );
    },
    [],
  );

  useEffect(() => {
    // Switching to a different category invalidates the current item link (a
    // different category's items don't apply), so clear it alongside.
    const unsubscribeCategory = categoryFormBridge.subscribe(bridgeId, {
      created: (id) => {
        setCategoryId(id);
        setCategoryItemId(null);
      },
      deleted: (id) =>
        setCategoryId((current) => {
          if (current === id) setCategoryItemId(null);
          return current === id ? null : current;
        }),
      selected: (id) => {
        setCategoryId(id);
        setCategoryItemId(null);
      },
    });
    // "What for" sheet: `selected` links a curated item; `useText` keeps the
    // typed text as a plain description with no link.
    const unsubscribeItem = categoryItemSelectBridge.subscribe(bridgeId, {
      selected: (payload) => applyItemSelection(payload),
      useText: (text) => {
        setDescription(text);
        setCategoryItemId(null);
      },
    });
    return () => {
      unsubscribeCategory();
      unsubscribeItem();
    };
  }, [bridgeId, applyItemSelection]);

  const typeOptions: SegmentedOption<TransactionType>[] = useMemo(
    () => [
      { value: 'expense', label: t('create.types.expense') },
      { value: 'income', label: t('create.types.income') },
    ],
    [t],
  );

  const selectedCategoryName = categoryId
    ? (categories.find((c) => c.id === categoryId)?.name ?? null)
    : null;

  // Top 5 most-used categories of the current type, for quick selection. Shares
  // the ranking with the category picker's "Most used" group so both surfaces
  // always agree. When there's no usage data yet for this type (fresh wallet,
  // or this type just hasn't been used), fall back to the first 5 categories
  // alphabetically (the "rest" list is already alpha-sorted when nothing has
  // usage) rather than hiding the row entirely.
  const topCategories = useMemo(() => {
    const { mostUsed, rest } = rankCategoriesByUsage(categories, transactions, type);
    return mostUsed.length > 0 ? mostUsed : rest.slice(0, MOST_USED_CATEGORIES_LIMIT);
  }, [categories, transactions, type]);

  // Starter suggestions for a fresh wallet: only relevant when there are zero
  // categories of the current type (i.e. the quick-pick row above would be
  // empty). Parsed from the same comma-separated list the category picker uses,
  // so both surfaces suggest the same starter names. Tapping one opens the
  // category create flow pre-filled with that name (rather than creating
  // silently) so the user can also set a monthly goal; the categoryFormBridge
  // auto-selects the new category on success.
  const suggestionNames = useMemo(() => {
    if (topCategories.length > 0) return [];
    return t(`categorySelect.suggestions.${type}`)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [topCategories.length, type, t]);

  const showQuickPick = topCategories.length > 0;
  const showSuggestions = !showQuickPick && suggestionNames.length > 0;

  // Curated items for the selected category, ranked most-used first, offered
  // under the "What for" field. Only relevant once a category is picked.
  const rankedItems = useMemo(
    () => (categoryId ? rankItemsForCategory(categoryItems, transactions, categoryId) : []),
    [categoryItems, transactions, categoryId],
  );

  const formattedAmount = formatAmount(amountCents / 100, currency);

  const handleAmountChange = (text: string) => {
    setAmountCents(nextAmountCents(amountCents, formattedAmount, text));
  };

  const handleTypeChange = (next: TransactionType) => {
    setType(next);
    setCategoryId(null);
    setCategoryItemId(null);
  };

  // Picking a category from the quick-pick row also drops any item link (the
  // link belongs to the previously-selected category).
  const handlePickCategory = (id: string) => {
    setCategoryId(id);
    setCategoryItemId(null);
  };

  // Selecting a curated item from the quick-pick chip row.
  const selectItem = (item: CategoryItem) => {
    applyItemSelection({ id: item.id, name: item.name, defaultAmount: item.defaultAmount ?? null });
  };

  const openCategorySelect = () =>
    router.push(categorySelectHref({ type, bridgeId, selectedId: categoryId ?? undefined }));

  // Full "What for" item picker — the escape hatch past the top-5 chip row.
  // Only meaningful once a category is picked.
  const openItemSelect = () => {
    if (!categoryId) return;
    router.push(itemSelectHref({ categoryId, bridgeId, selectedId: categoryItemId ?? undefined }));
  };

  const openCreateCategory = (prefillName?: string) =>
    router.push(categoryFormHref({ type, bridgeId, ...(prefillName ? { prefillName } : {}) }));

  // The category row swaps between two shapes: quick-pick over existing
  // categories (the tappable field above already opens the full picker, so no
  // trailing chip), or starter suggestions when the wallet has none of this
  // type yet (with a "+ Add" opener). Both render through the same
  // QuickPickChips surface.
  const categoryQuickPick: {
    items: QuickPickItem[];
    trailing?: { label: string; onPress: () => void };
  } | null = showQuickPick
    ? {
        items: topCategories.map((c) => ({
          key: c.id,
          label: c.name,
          selected: categoryId === c.id,
          onPress: () => handlePickCategory(c.id),
        })),
      }
    : showSuggestions
      ? {
          items: suggestionNames.map((name) => ({
            key: name,
            label: name,
            onPress: () => openCreateCategory(name),
          })),
          trailing: { label: t('category.create.chipLabel'), onPress: () => openCreateCategory() },
        }
      : null;

  const itemChips: QuickPickItem[] = rankedItems.map((it) => ({
    key: it.id,
    label: it.name,
    selected: categoryItemId === it.id,
    onPress: () => selectItem(it),
  }));

  // "For whom" picker: only meaningful in a shared wallet. Lists every other
  // member alongside a "Myself" chip (null = the transaction is for the
  // creator). Rendered through the same QuickPickChips surface as categories.
  const otherMembers = useMemo(
    () => members.filter((m) => m.userId !== myUserId),
    [members, myUserId],
  );
  // Hidden until the current user is known, so a solo wallet never flashes the
  // picker while the session/members are still loading.
  const showOnBehalfPicker = !!myUserId && otherMembers.length > 0;
  const onBehalfItems: QuickPickItem[] = showOnBehalfPicker
    ? [
        {
          key: '__self__',
          label: t('create.forWhomMyself'),
          selected: onBehalfOfUserId === null,
          onPress: () => setOnBehalfOfUserId(null),
        },
        ...otherMembers.map((m) => ({
          key: m.userId,
          label: memberLabel(m.displayName, m.email, t('wallet.partner.unnamed')),
          selected: onBehalfOfUserId === m.userId,
          onPress: () => setOnBehalfOfUserId(m.userId),
        })),
      ]
    : [];

  const busy = isSubmitting || isDeleting;
  const canSubmit = amountCents > 0 && categoryId !== null && !busy;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      type,
      amountCents,
      date,
      categoryId,
      categoryItemId,
      description,
      onBehalfOfUserId,
    });
  };

  return (
    <ModalFormScaffold
      footer={
        <>
          {errorMessage ? (
            <View
              style={[
                styles.errorBanner,
                { borderColor: dangerColor, backgroundColor: `${dangerColor}14` },
              ]}
            >
              <Text variant="caption" style={{ color: dangerColor }}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            {onDelete ? (
              <View style={styles.actionItem}>
                <PressableButton
                  label={deleteLabel ?? t('edit.delete')}
                  variant="destructive"
                  size="large"
                  loading={isDeleting}
                  disabled={busy && !isDeleting}
                  onPress={onDelete}
                />
              </View>
            ) : null}
            <View style={styles.actionItem}>
              <PressableButton
                label={submitLabel ?? t('create.save')}
                variant="primary"
                size="large"
                loading={isSubmitting}
                disabled={!canSubmit}
                onPress={handleSubmit}
              />
            </View>
          </View>
        </>
      }
    >
      <View style={styles.typeSelector}>
        <SegmentedControl<TransactionType>
          options={typeOptions}
          value={type}
          onChange={handleTypeChange}
        />
      </View>

      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('create.dateLabel').toUpperCase()}
        </Text>
        <DatePicker value={date} onValueChange={setDate} />
      </View>

      <View style={styles.field}>
        <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
          {t('create.amountPlaceholder').toUpperCase()}
        </Text>
        <CurrencyInput
          currency={currency}
          symbolColor={mutedColor}
          value={formattedAmount}
          onChangeText={handleAmountChange}
          keyboardType="number-pad"
          inputMode="numeric"
          accessibilityLabel={t('create.amountPlaceholder')}
          selectionColor={textColor}
          containerStyle={{ backgroundColor: surfaceMutedColor }}
          inputStyle={{ color: amountCents > 0 ? textColor : mutedColor, fontFamily: Fonts.sans }}
        />
      </View>

      <View style={styles.field}>
        <CategorySelect
          title={type === 'income' ? t('category.section.income') : t('category.section.expenses')}
          selectedLabel={selectedCategoryName}
          placeholder={t('categorySelect.placeholder')}
          onPress={openCategorySelect}
        />
        {categoryQuickPick ? (
          <QuickPickChips items={categoryQuickPick.items} trailing={categoryQuickPick.trailing} />
        ) : null}
      </View>

      {showOnBehalfPicker ? (
        <View style={styles.field}>
          <Text variant="caption" tone="textMuted" weight="medium" style={styles.label}>
            {t('create.forWhomLabel').toUpperCase()}
          </Text>
          <QuickPickChips items={onBehalfItems} />
        </View>
      ) : null}

      {/* "What for" mirrors "Where it goes": a tappable select that opens the
          full item sheet (browse / select / type→Use / type→Save). It's
          disabled until a category is picked, since items belong to a category.
          The top-5 chips below are the same quick-pick shortcut as categories. */}
      <View style={styles.field}>
        <CategorySelect
          title={t('create.descriptionLabel')}
          selectedLabel={description || null}
          placeholder={t('create.descriptionPlaceholder')}
          disabled={!categoryId}
          onPress={openItemSelect}
        />
        {categoryId && itemChips.length > 0 ? <QuickPickChips items={itemChips} /> : null}
      </View>
    </ModalFormScaffold>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionItem: {
    flex: 1,
  },
  typeSelector: {
    alignSelf: 'stretch',
  },
  field: {
    gap: 8,
  },
  label: {
    letterSpacing: 0.8,
  },
  errorBanner: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
