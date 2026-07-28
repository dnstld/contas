# Prompt — Phase A · Step 2b: convert items screen to a modal (fix-ups)

> Paste this to the coding agent. It **revises Step 2**. Still **static UI only** — data comes from `data/__fixtures__/category-items.ts`; no queries/mutations/Supabase for item data. Reuse existing patterns; mirror `app/(modals)/category-select.tsx` for structure.

## Why

Three corrections to Step 2:

1. **Do not override the tab header.** The tab stack header (app logo, etc.) must stay untouched. Remove the `Stack.Screen headerTitle` override that was added on the tab-nested route.
2. **This app uses modals, not root/tab-nested navigation.** The items screen must be a **modal**, opened over the Categories tab — not `app/(tabs)/categories/[id].tsx`. The **modal title** shows the category name.
3. **Replace the "show archived" toggle with segmented tabs** (like the expense/income `SegmentedControl` in the create-transaction / category-form flow): an **Ativos / Arquivados** switch that filters the list.

## 1. Remove the nested route

- Delete `app/(tabs)/categories/[id].tsx`.
- Keep `app/(tabs)/categories/_layout.tsx` (still needed for the tab's `index`) and `app/(tabs)/categories/index.tsx`.

## 2. New modal — `app/(modals)/category-items.tsx`

Mirror `app/(modals)/category-select.tsx` conventions:

- Root: `<View style={[styles.root, { backgroundColor }]}>` using `useThemeColor({}, 'modalBackground')`; pull chrome colors from `useModalChrome()`.
- **Modal title = category name:** `<Stack.Screen options={{ headerTitle: category?.name ?? '' }} />`. The modals `_layout` already supplies the centered title style and the ✕ close button — do not add your own header buttons and do not touch the tab header.
- Read `id` via `useLocalSearchParams<{ id: string }>()`; resolve `category` from `MOCK_CATEGORIES`.
- Derive from `MOCK_CATEGORY_ITEMS` filtered by `categoryId === id`: `activeItems` (not archived) and `archivedItems` (`archivedAt` set).
- **Segmented tabs:** a `SegmentedControl` in the list header with options `t('categoryItems.segments.active')` / `t('categoryItems.segments.archived')`, controlled by `useState<'active' | 'archived'>('active')`. The list renders `activeItems` or `archivedItems` based on the selection. Always show the control (both segments), even if one side is empty.
- **List:** `SectionList` `variant="flat"` (single unlabeled section) + `SectionListRow`, mirroring category-select. Each item row:
  - `title` = item name.
  - `subtitle` = the `recurrenceBadges(item)` node from Step 2 (frequency badge + installment badge). Keep that helper (move it into this modal file).
  - `text1` = `<PriceText value={item.defaultAmount} currency={currency} />` when `defaultAmount != null` (`currency` from `useWallet().currency`, fallback `'BRL'`).
  - `trailing` = `chevron.right` `Icon` (`tone="textMuted"`).
  - `onPress` = no-op placeholder, `// TODO(step 3): open item form`.
- **Add-item affordance:** a top pressable row mirroring category-select's `createRow` (tinted, leading `plus` icon, `t('categoryItems.addItem')`), `onPress` = no-op `// TODO(step 3): open item form`. Shown only on the **Ativos** tab.
- **Empty states:** on Ativos with no active items → `EmptyState` (`categoryItems.empty.title/subtitle`); on Arquivados with none → `EmptyState` (`categoryItems.emptyArchived.title/subtitle`).

## 3. Register the modal

In `app/(modals)/_layout.tsx`, add `<Stack.Screen name="category-items" />` alongside the others.

## 4. Route helper

Update `categoryItemsHref` in `constants/routes.ts` to point at the modal (mirror the existing modal helpers like `walletsHref`/`categoryDetailHref`):

```ts
export function categoryItemsHref(id: string): Href {
  return { pathname: '/category-items', params: { id } };
}
```

`app/(tabs)/categories/index.tsx` keeps calling `router.push(categoryItemsHref(category.id))` — no change there beyond the href now resolving to the modal.

## 5. i18n

In all three `i18n/locales/{pt-BR,en,de}.json`:

- **Add:** `categoryItems.segments.active` (pt-BR "Ativos"), `categoryItems.segments.archived` (pt-BR "Arquivados"), `categoryItems.emptyArchived.title`, `categoryItems.emptyArchived.subtitle`.
- **Remove** the now-unused `categoryItems.showArchived` and `categoryItems.archivedBadge`.
- Keep the existing `categoryItems.addItem`, `recurrence.*`, `dueDay`, `installment`, `empty.*` keys.

## Constraints & acceptance

- No tab header is modified anywhere; the category name appears **only** as the modal title.
- Items screen is a modal (`/category-items`), opened from the Categories tab; no tab-nested `[id]` route remains.
- Ativos/Arquivados `SegmentedControl` filters the list; Subscriptions → Ativos shows Netflix/Apple One/Amazon Prime/iPhone 15 (iPhone with "12x · 3 de 12", Amazon Prime "Anual · 20/11"); Arquivados shows Spotify.
- Item tap and add-item remain inert placeholders. No queries/mutations for item data. Dates via `parseDayStart`.
- Repo typecheck passes; ESLint clean; no console errors.
