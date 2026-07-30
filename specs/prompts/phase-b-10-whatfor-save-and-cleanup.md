# Prompt — Transaction form: clearer "What for" (Save typed name), drop "All categories", new placeholder

> Paste this to the coding agent. Three changes to `components/transactions/transaction-form.tsx` (+ i18n). Reuse existing patterns. No modal interruption for saving items.

## 1. Remove the "All categories" chip from the category quick-pick

The category section already has the tappable `CategorySelect` field above the chips (opens the full picker), so the trailing "All categories" chip is redundant.

- In `categoryQuickPick`, make `trailing` optional and **omit it for the `showQuickPick` branch** (existing categories). Leave the `showSuggestions` branch (no categories yet) and its "+ Add" trailing unchanged.
- `QuickPickChips` already accepts an optional `trailing`, so passing `undefined` renders just the chips.

## 2. "What for" — reframe "＋ New item" as "Save the name you typed"

Replace the confusing "＋ New item" modal opener with an inline, self-explaining flow. Remove `openCreateItem`, the `categoryItemFormBridge` subscription and its `itemBridgeId` from this form (no longer needed).

- Add `useCreateCategoryItem` (`hooks/use-category-item-mutations`).
- Derived values:
  - `const trimmed = description.trim();`
  - `const categoryItemsForCategory = categoryItems.filter((it) => it.categoryId === categoryId && !it.archivedAt);`
  - `const canSaveTyped = !!categoryId && trimmed.length > 0 && !categoryItemsForCategory.some((it) => it.name.toLowerCase() === trimmed.toLowerCase());`
- Inline save (no modal):

```tsx
const { mutate: createItem } = useCreateCategoryItem();
const saveTypedAsItem = () => {
  if (!categoryId || !canSaveTyped) return;
  createItem({ categoryId, name: trimmed }, { onSuccess: (item) => setCategoryItemId(item.id) });
};
```

- Render, in the description field (only when a category is picked):
  - Show the `QuickPickChips` when there are item chips **or** something new to save. Its `trailing` becomes the **Save** chip when `canSaveTyped`:
    ```tsx
    {categoryId && (itemChips.length > 0 || canSaveTyped) ? (
      <QuickPickChips
        items={itemChips}
        trailing={canSaveTyped ? { label: `＋ ${t('create.saveItem', { name: trimmed })}`, onPress: saveTypedAsItem } : undefined}
      />
    ) : null}
    ```
  - When the category has **no items and nothing is typed**, show a muted helper caption instead (teaches the concept):
    ```tsx
    {categoryId && categoryItemsForCategory.length === 0 && trimmed.length === 0 ? (
      <Text variant="caption" tone="textMuted" style={styles.hint}>
        {t('create.itemHint', { category: selectedCategoryName })}
      </Text>
    ) : null}
    ```
  - Add `hint: { paddingTop: 2 }` (or similar) to styles.
- Existing behavior stays: picking an item chip links it + fills description + pre-fills amount; typing an exact existing-item name links it; other free text saves unlinked (`categoryItemId = null`). Saving via the chip creates a **name-only** item (recurrence defaults to none) and links it — richer setup (amount, recurrence) still happens in the Categories tab.

## 3. New placeholder

Change `create.descriptionPlaceholder` to "Give it a name".

## i18n (all three locales)

- `create.descriptionPlaceholder` → en `Give it a name` · pt-BR `Dê um nome` · de `Gib einen Namen`
- `create.saveItem` → en `Save "{{name}}"` · pt-BR `Salvar "{{name}}"` · de `„{{name}}“ speichern`
- `create.itemHint` → en `Type what it was for, then save it to reuse next time in {{category}}.` · pt-BR `Digite para que foi e salve para reutilizar na próxima vez em {{category}}.` · de `Gib ein, wofür es war, und speichere es, um es beim nächsten Mal in {{category}} wiederzuverwenden.`

Remove any now-unused key (e.g. if `categoryItems.addItem` is no longer referenced by this form — grep-verify before removing, it's still used by the items modal footer, so keep it).

## Acceptance

- No "All categories" chip in the category row; the "Where it goes" field still opens the full picker.
- With a category picked and no items: a helper line explains typing + saving (mentions the category). Typing a new name reveals a `＋ Save "…"` chip; tapping it creates the item inline, links it, and it becomes a selectable chip (no modal, no navigation).
- Typing an existing item's name links it; unrelated free text stays unlinked.
- Placeholder reads "Give it a name".
- Repo typecheck passes; ESLint clean; no console errors.
