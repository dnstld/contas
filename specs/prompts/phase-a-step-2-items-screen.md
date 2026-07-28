# Prompt — Phase A · Step 2: Category → items screen (static UI)

> Paste this to the coding agent. Scope is **static UI only — no data fetching, no hooks that read item data, no mutations, no Supabase**. All item data comes from `data/__fixtures__/category-items.ts`. Reuse the existing design system; do not invent new primitives. This builds on Step 1.

---

## Goal

Tapping a category on the Categories tab opens its **items screen**: a list of the category's items showing name, expected amount, and a recurrence badge (e.g. "Mensal · dia 5", "Anual · 20/11", and a "12x · 3 de 12" installment badge). Archived items are hidden behind a **"Mostrar arquivados"** toggle. Production-fidelity, navigable on device. Tapping an item and the "add item" affordance are visual placeholders (Step 3 builds the item form).

## 1. Navigation wiring

- Add a route helper to `constants/routes.ts`, following the existing typed-`Href` pattern (mirror `categoryDetailHref`):

```ts
export function categoryItemsHref(id: string): Href {
  return { pathname: '/categories/[id]', params: { id } };
}
```

Use whatever exact pathname the generated expo-router typed routes expect for `app/(tabs)/categories/[id].tsx`; `tsc` will confirm the literal.

- In `app/(tabs)/categories/index.tsx`, replace the row `onPress` placeholder (the `// TODO(step 2)` no-op) with navigation to `categoryItemsHref(category.id)` via `useRouter().push(...)`.

## 2. Fixtures — add a display-only paid-count map

In `data/__fixtures__/category-items.ts`, add a throwaway map so the installment badge can render "k de N" without any logic (real paid-count is derived from transactions in Phase B):

```ts
/** Display-only: occurrences already "paid" per installment item, so the
 *  mockup can show "3 de 12". Not part of the real model. */
export const MOCK_PAID_COUNT: Record<string, number> = {
  'item-iphone-15': 3,
};
```

Do not add `paidCount` to the `CategoryItem` type.

## 3. Screen — `app/(tabs)/categories/[id].tsx`

Create the screen as a stack route under the categories tab (the tab's `_layout` already re-exports the shared stack layout, so it gets a header).

- Read `id` via `useLocalSearchParams<{ id: string }>()`. Resolve the category from `MOCK_CATEGORIES`; set the header via `<Stack.Screen options={{ headerTitle: category?.name ?? '' }} />`.
- Derive item lists from `MOCK_CATEGORY_ITEMS` filtered by `categoryId === id`:
  - `activeItems` = not archived, `archivedItems` = `archivedAt` set.
- Currency for amounts: use `useWallet().currency` (fallback `'BRL'`), exactly as other screens do, passed to `PriceText`.
- Render with the `SectionList` organism (`variant="card"`) + `ListCardRow`/`SectionListRow` (`size="sm"`, `density="comfortable"`). Each item row:
  - `title` = item name.
  - `subtitle` = a small horizontal row of badge(s) built by a local `recurrenceBadges(item)` helper (see §4). Pass it as a node.
  - `text1` = `<PriceText value={item.defaultAmount} currency={currency} />` when `defaultAmount != null`; otherwise omit.
  - `trailing` = a `chevron.right` `Icon` (`tone="textMuted"`).
  - `onPress` = no-op placeholder with `// TODO(step 3): open item form`.
- **Archived section:** a `Toggle` (label `t('categoryItems.showArchived')`) controlled by local `useState(false)`. When on, render an "Arquivados" section whose rows are visually muted (e.g. wrap in a `View` with `opacity: 0.6`) and carry a soft neutral `Badge label={t('categoryItems.archivedBadge')}`. When off, archived items are not rendered. If there are no archived items, hide the toggle entirely.
- **Add-item affordance:** a bordered `Surface` row (mirror Step 1's add-category row) with a leading `plus` icon and `t('categoryItems.addItem')`, `onPress` = no-op placeholder `// TODO(step 3): open item form`.
- **Empty state:** if the category has no active items, render `EmptyState` with `t('categoryItems.empty.title')` / `...subtitle` (still show the add-item row).

## 4. Recurrence badge helper (presentation only)

Add a local helper in the screen file (Phase B replaces it with a real formatter). It returns 0–2 badges:

- **Frequency badge** (soft, neutral tone) from `item.recurrence`, using `nextDueOn` (parse with `parseDayStart` from `finance-types`, never `new Date('YYYY-MM-DD')`):
  - `monthly` → `t('categoryItems.recurrence.monthly')` + " · " + `t('categoryItems.dueDay', { day })` (day = day-of-month of `nextDueOn`).
  - `yearly` → `t('categoryItems.recurrence.yearly')` + " · " + `DD/MM` of `nextDueOn`.
  - `weekly` → `t('categoryItems.recurrence.weekly')`.
  - `daily` → `t('categoryItems.recurrence.daily')`.
  - `none` → no frequency badge.
- **Installment badge** (soft, `info`/accent tone) when `recurrenceTotalCount != null`: label `t('categoryItems.installment', { paid: MOCK_PAID_COUNT[item.id] ?? 0, total: item.recurrenceTotalCount })` → renders like "3 de 12" (prefix "{{total}}x · " inside the translation, e.g. pt-BR `"{{total}}x · {{paid}} de {{total}}"`).

## 5. i18n

Add keys to all three `i18n/locales/{pt-BR,en,de}.json` (pt-BR primary, real translations):

- `categoryItems.showArchived`, `categoryItems.archivedBadge`, `categoryItems.addItem`
- `categoryItems.recurrence.monthly|weekly|daily|yearly`
- `categoryItems.dueDay` (e.g. pt-BR `"dia {{day}}"`)
- `categoryItems.installment` (e.g. pt-BR `"{{total}}x · {{paid}} de {{total}}"`)
- `categoryItems.empty.title`, `categoryItems.empty.subtitle`

## Constraints & acceptance

- **No** hooks that read item/category data, no react-query, no Supabase, no mutations. Item data only from the fixtures module. (`useWallet` for currency and `useTranslation`/`useRouter`/`useLocalSearchParams` are fine — they're app context/navigation, not item data.)
- Reuse components from `@/components/ui`; match the visual language of the transactions/account screens. No new primitives.
- Dates handled via `parseDayStart` (timezone-safe), never `new Date('YYYY-MM-DD')`.
- Repo typecheck passes; ESLint clean; no console errors.
- Result: tapping a category on the Categories tab pushes a headered items screen; Subscriptions shows Netflix/Apple One/Amazon Prime/iPhone 15 with amounts and correct badges (iPhone shows a "12x · 3 de 12" installment badge; Amazon Prime shows "Anual · 20/11"); toggling "Mostrar arquivados" reveals a muted Spotify row with an "Arquivado" badge. Item taps and add-item are inert placeholders.
