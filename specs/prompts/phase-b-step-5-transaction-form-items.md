# Prompt — Phase B · Step 5: transaction form uses curated items (+ carries the link)

> Paste this to the coding agent. This delivers the **original feature**: the "What for" field suggests only **curated category items** (not history-derived text), and a picked item links the transaction to it (`category_item_id`). Free text still saves but is never auto-added as a suggestion. Mirror the form's existing `QuickPickChips` + `categoryFormBridge` patterns.

## 1. Ranking helper — `data/finance-aggregations.ts`

- Add `rankItemsForCategory(items: CategoryItem[], transactions: Transaction[], categoryId: string, limit = MOST_USED_DESCRIPTIONS_LIMIT): CategoryItem[]`:
  - Non-archived items whose `categoryId` matches, ordered by **linked-transaction usage** (count of transactions with `categoryItemId === item.id`) descending, then name alphabetical; capped at `limit`.
- **Remove** the now-unused `rankDescriptionsByUsage` and its tests (the transaction form was its only caller; backfill is a SQL migration, not this function). Keep `MOST_USED_DESCRIPTIONS_LIMIT`.

## 2. Form state + values — `components/transactions/transaction-form.tsx`

- Add `categoryItemId: string | null` to `TransactionFormValues`, to `initialValues` handling, and to local state (`const [categoryItemId, setCategoryItemId] = useState(initialValues?.categoryItemId ?? null)`), included in `handleSubmit`.
- **Item suggestions:** replace `descriptionSuggestions`/`descriptionItems` (from `rankDescriptionsByUsage`) with items from `useCategoryItems()` via `rankItemsForCategory(items, transactions, categoryId)`. Each chip:
  - `label` = item name, `selected` = `categoryItemId === item.id`,
  - `onPress`: `setCategoryItemId(item.id)`, `setDescription(item.name)`, and if the amount is still empty (`amountCents === 0`) and `item.defaultAmount != null`, pre-fill it (`setAmountCents(Math.round(item.defaultAmount * 100))`).
- **Free-text handling:** on the description `TextInput`'s `onChangeText`, after `setDescription(text)`, re-derive the link: find a non-archived item in the selected category whose name equals `text.trim()` case-insensitively → `setCategoryItemId(match?.id ?? null)`. (So typing an exact item name links it; anything else clears the link. Typed text is never added as an item.)
- **Reset on category change:** in `handleTypeChange` and wherever `setCategoryId` runs from the picker, also `setCategoryItemId(null)` (a different category's items don't apply).
- **Add-item affordance:** give the items `QuickPickChips` a `trailing` "＋ {t('categoryItems.addItem')}" that opens `categoryItemFormHref({ categoryId, bridgeId: itemBridgeId })`. Subscribe to `categoryItemFormBridge` (a dedicated `itemBridgeId = makeBridgeId()`): on `changed`/created id, refetch items, then select the new item (`setCategoryItemId(id)`, set description to its name, pre-fill amount if empty). Only show this trailing when a category is selected.
- Show the items row only when a category is selected; hide it when that category has no items (no add-item-less empty row — but keep the ＋ affordance available).

## 3. Persist the link — `hooks/use-finance-mutations.ts`

- In `useCreateTransaction` insert and `useUpdateTransaction` update, add `category_item_id: values.categoryItemId ?? null`.
- Ensure the optimistic `adaptTransaction` patch still works (it already reads `category_item_id`).

## 4. Edit hydration

- Where the edit screen builds `initialValues` from a transaction, pass `categoryItemId: transaction.categoryItemId` so editing an existing linked transaction shows the item as selected.

## Constraints & acceptance

- Selecting a category then the "What for" field shows that category's **curated items** as chips (most-used first); tapping one fills the description, links `category_item_id`, and pre-fills the amount when empty.
- Typing free text saves normally with `category_item_id = null`, and is **not** added as a suggestion; typing an exact existing item name links it.
- The ＋ affordance creates an item inline (via the item form) and auto-selects it on return.
- Created/edited transactions persist `category_item_id`; editing a linked transaction re-selects the item.
- `rankDescriptionsByUsage` and its tests are removed; `rankItemsForCategory` added. Repo typecheck passes; ESLint clean; existing + any new tests green; no console errors.
